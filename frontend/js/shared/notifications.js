/**
 * notifications.js
 * ---------------------------------------------------------------
 * In-app notifications: bell badge, slide-over drawer, detail view.
 *
 * Backend facts (see README "Backend limitations"):
 *   - GET /api/notifications returns broadcast items (recipient_id = null)
 *     plus items addressed to the logged-in user.
 *   - The backend has NO "mark as read" endpoint, so read state is kept
 *     client-side in localStorage, per user. That is what drives the
 *     unread count on the bell.
 *   - Only admins can delete (DELETE /api/notifications/:id) - done from the
 *     admin notifications page, not here.
 */
(function (window, $) {
  'use strict';

  var Notifications = {};
  var items = [];
  var view = { mode: 'list', id: null };
  var lastFocus = null;
  var pollTimer = null;
  var loaded = false;

  /* ---------- Client-side read state ---------- */
  function readKey() {
    var u = Auth.getUser();
    return 'ce_read_' + (u ? u.id : 'anon');
  }
  function readSet() {
    try { return JSON.parse(localStorage.getItem(readKey()) || '[]'); } catch (e) { return []; }
  }
  function saveReadSet(arr) {
    try { localStorage.setItem(readKey(), JSON.stringify(arr)); } catch (e) { /* storage blocked */ }
  }
  Notifications.isRead = function (id) { return readSet().indexOf(String(id)) !== -1; };
  Notifications.markRead = function (ids) {
    var set = readSet();
    [].concat(ids).forEach(function (id) { id = String(id); if (set.indexOf(id) === -1) set.push(id); });
    saveReadSet(set);
    updateBadge();
  };
  Notifications.unreadCount = function () {
    var set = readSet();
    return items.filter(function (n) { return set.indexOf(String(n.id)) === -1; }).length;
  };
  Notifications.list = function () { return items.slice(); };

  /** Build a link to the related resource from the notification metadata. */
  Notifications.resourceLink = function (n) {
    var m = n.metadata;
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { m = null; } }
    m = m || {};
    var root = (window.Layout && Layout.root) || '';
    if (m.event_id) return { href: root + 'pages/event-details.html?id=' + encodeURIComponent(m.event_id), label: 'View event' };
    if (m.announcement_id) return { href: root + 'pages/announcement-details.html?id=' + encodeURIComponent(m.announcement_id), label: 'Listen to announcement' };
    if (m.promo_id) return { href: root + 'pages/promo-details.html?id=' + encodeURIComponent(m.promo_id), label: 'Watch promo' };
    return null;
  };

  Notifications.badgeClass = function (type) {
    return ({ event: 'badge-event', announcement: 'badge-announcement', promo: 'badge-promo' })[type] || 'badge-system';
  };

  /* ---------- Fetching ---------- */
  Notifications.fetch = function () {
    return Api.get('/notifications').done(function (res) {
      items = (res.data || []).slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      loaded = true;
      updateBadge();
      if (isOpen()) render();
    });
  };

  function updateBadge() {
    var n = Notifications.unreadCount();
    var $badge = $('#notif-badge');
    $badge.text(n > 9 ? '9+' : n).toggleClass('hidden', n === 0);
    $('#notif-bell').attr('aria-label', 'Notifications' + (n ? ', ' + n + ' unread' : ''));
    $('[data-unread-count]').text(n > 99 ? '99+' : n).prop('hidden', n === 0).attr('aria-label', n + ' unread');
  }

  /* ---------- Drawer ---------- */
  function isOpen() { return $('#notif-drawer').hasClass('open'); }

  function buildDrawer() {
    if ($('#notif-drawer').length) return;
    $('body').append(
      '<div id="notif-overlay" class="drawer-overlay" aria-hidden="true"></div>' +
      '<aside id="notif-drawer" class="drawer" role="dialog" aria-modal="true" aria-labelledby="notif-title" aria-hidden="true">' +
        '<div class="flex items-center justify-between gap-3 border-b border-line px-6 py-4">' +
          '<h2 id="notif-title" class="t-card-title">Notifications</h2>' +
          '<button type="button" id="notif-close" class="btn btn-ghost btn-sm" aria-label="Close notifications">' + Ui.icon('x', 'w-5 h-5') + '</button>' +
        '</div>' +
        '<div id="notif-toolbar" class="flex items-center justify-between bg-subtle px-6 py-2 text-sm">' +
          '<button type="button" id="notif-mark-all" class="btn btn-ghost btn-sm">Mark all as read</button>' +
          '<a href="' + ((window.Layout && Layout.root) || '') + 'pages/notifications.html" class="btn btn-ghost btn-sm">View all</a>' +
        '</div>' +
        '<div id="notif-body" class="flex-1 overflow-y-auto"></div>' +
      '</aside>'
    );

    $('#notif-overlay, #notif-close').on('click', Notifications.close);
    $('#notif-mark-all').on('click', function () {
      Notifications.markRead(items.map(function (n) { return n.id; }));
      render();
    });

    // Delegated: open a notification / go back
    $('#notif-body').on('click', '.notif-item', function () {
      view = { mode: 'detail', id: String($(this).attr('data-id')) };
      Notifications.markRead(view.id); // optimistic: purely client-side, nothing to revert
      render(true);
    });
    $('#notif-body').on('click', '[data-back]', function () {
      view = { mode: 'list', id: null };
      render(true);
    });

    // Esc closes; Tab stays inside the drawer
    $(document).on('keydown.notif', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); Notifications.close(); return; }
      if (e.key === 'Tab') {
        var $f = $('#notif-drawer').find('a[href], button:not(:disabled)').filter(':visible');
        if (!$f.length) return;
        var first = $f[0], last = $f[$f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  Notifications.open = function () {
    lastFocus = document.activeElement;
    view = { mode: 'list', id: null };
    $('#notif-overlay, #notif-drawer').addClass('open');
    $('#notif-drawer').attr('aria-hidden', 'false');
    $('#notif-overlay').attr('aria-hidden', 'false');
    $('#notif-bell').attr('aria-expanded', 'true');
    $('body').addClass('overflow-hidden');

    if (!loaded) $('#notif-body').html(Ui.skeletonRows(5));
    else render();

    Notifications.fetch().fail(function (err) {
      $('#notif-body').empty().append(Ui.errorState({
        title: 'Couldn\'t load notifications',
        message: err.message,
        onRetry: function () { $('#notif-body').html(Ui.skeletonRows(5)); Notifications.fetch().fail(function (e) { Api.toastError(e); }); }
      }));
    });
    setTimeout(function () { $('#notif-close').trigger('focus'); }, 50);
  };

  Notifications.close = function () {
    $('#notif-overlay, #notif-drawer').removeClass('open');
    $('#notif-drawer, #notif-overlay').attr('aria-hidden', 'true');
    $('#notif-bell').attr('aria-expanded', 'false');
    $('body').removeClass('overflow-hidden');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  /* ---------- Rendering ---------- */
  function render(moveFocus) {
    var $body = $('#notif-body');
    var $toolbar = $('#notif-toolbar');

    if (view.mode === 'detail') {
      var n = items.filter(function (x) { return String(x.id) === view.id; })[0];
      if (!n) { view = { mode: 'list', id: null }; return render(moveFocus); }
      $toolbar.addClass('hidden');
      var link = Notifications.resourceLink(n);
      $body.html(
        '<div class="p-5">' +
          '<button type="button" class="btn btn-ghost btn-sm -ml-2 mb-4" data-back>' + Ui.icon('back', 'w-4 h-4') + ' Back to list</button>' +
          '<span class="badge ' + Notifications.badgeClass(n.type) + '">' + Ui.escape(n.type) + '</span>' +
          '<h3 id="notif-detail-title" tabindex="-1" class="mt-3 t-card-title">' + Ui.escape(n.title) + '</h3>' +
          '<p class="mt-1 text-sm text-muted"><time datetime="' + Ui.escape(n.created_at) + '">' + Ui.escape(Ui.formatDateTime(n.created_at)) + '</time></p>' +
          '<p class="mt-5 whitespace-pre-line leading-relaxed">' + Ui.escape(n.message) + '</p>' +
          (link ? '<a class="btn btn-primary mt-6" href="' + link.href + '">' + Ui.escape(link.label) + Ui.icon('arrowRight', 'w-4 h-4') + '</a>' : '') +
        '</div>'
      );
      if (moveFocus) $('#notif-detail-title').trigger('focus');
      return;
    }

    $toolbar.removeClass('hidden');
    if (!items.length) {
      $body.html(Ui.emptyState({ icon: 'bell', title: 'You\'re all caught up', message: 'New events, announcements and promos will show up here.' }));
      return;
    }

    var set = readSet();
    var html = '<ul class="divide-y divide-line">';
    items.forEach(function (n) {
      var unread = set.indexOf(String(n.id)) === -1;
      html +=
        '<li><button type="button" class="notif-item flex gap-3 px-5 py-4" data-id="' + Ui.escape(n.id) + '">' +
          '<span class="mt-2 h-2.5 w-2.5 shrink-0 rounded-full ' + (unread ? 'bg-accent' : 'bg-transparent') + '" aria-hidden="true"></span>' +
          '<span class="min-w-0 flex-1">' +
            '<span class="flex items-center justify-between gap-2">' +
              '<span class="badge ' + Notifications.badgeClass(n.type) + '">' + Ui.escape(n.type) + '</span>' +
              '<span class="text-xs text-muted">' + Ui.escape(Ui.timeAgo(n.created_at)) + '</span>' +
            '</span>' +
            '<span class="mt-1 block truncate ' + (unread ? 'font-bold' : 'font-medium') + '">' + Ui.escape(n.title) + (unread ? '<span class="sr-only"> (unread)</span>' : '') + '</span>' +
            '<span class="block truncate text-sm text-muted">' + Ui.escape(n.message) + '</span>' +
          '</span>' +
        '</button></li>';
    });
    html += '</ul>';
    $body.html(html);
    if (moveFocus) $body.find('.notif-item').first().trigger('focus');
  }

  /* ---------- Init (called by Layout once the header exists) ---------- */
  Notifications.init = function () {
    buildDrawer();
    $('#notif-bell').on('click', function () { isOpen() ? Notifications.close() : Notifications.open(); });

    // Prime the badge, then poll while the tab is visible. Failures are silent: the
    // bell is a convenience and shouldn't spam errors.
    Notifications.fetch().fail(function () { /* silent */ });
    clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (document.visibilityState === 'visible') Notifications.fetch().fail(function () { /* silent */ });
    }, CONFIG.NOTIFICATION_POLL_MS);
  };

  window.Notifications = Notifications;
})(window, jQuery);
