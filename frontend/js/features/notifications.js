/**
 * features/notifications.js — full notifications page (pages/ and admin/).
 * The bell + drawer live in js/shared/notifications.js.
 * ROLE GUARD: the Delete button is only rendered when `admin` is true (admin/notifications.html),
 * because DELETE /notifications/:id is admin-only. Users can only read.
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  function notifications() {
    if (!boot('Notifications', '', 'notifications')) return;
    function load() {
      put('<div class="card">' + Ui.skeletonRows(4) + '</div>');
      Api.get('/notifications').done(function (r) {
        var rows = (r.data || []).slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        // ROLE GUARD (UX only): the Delete button is rendered only when `admin` is true (admin/notifications.html,
        // admins only) because DELETE /notifications/:id is admin-only. Users can only read.
        put(rows.length ? '<ul class="card divide-y divide-line">' + rows.map(function (n) {
          var link = Notifications.resourceLink(n);
          return '<li class="flex flex-wrap items-start gap-3 p-4">' +
            '<span class="media-row-icon" aria-hidden="true">' + Ui.icon(n.type === 'promo' ? 'video' : n.type === 'announcement' ? 'audio' : n.type === 'event' ? 'calendar' : 'bell', 'w-4 h-4') + '</span>' +
            '<div class="min-w-0 flex-1"><p class="font-semibold">' + Ui.escape(n.title) + '</p><p class="mt-0.5 text-sm">' + Ui.escape(n.message) + '</p>' +
              '<p class="mt-1 text-xs text-muted"><time datetime="' + Ui.escape(n.created_at) + '">' + Ui.escape(Ui.formatDateTime(n.created_at)) + '</time> · ' + Ui.escape(n.type || 'notification') + '</p></div>' +
            '<div class="row-actions">' + (link ? '<a class="btn btn-secondary btn-sm" href="' + link.href + '">Open</a>' : '') +
              (admin ? '<button type="button" class="btn btn-ghost btn-sm text-red-700 delete-notification" data-id="' + Ui.escape(n.id) + '" aria-label="Delete notification: ' + Ui.escape(n.title) + '">Delete</button>' : '') + '</div></li>';
        }).join('') + '</ul>' : C.empty('You are all caught up', 'New event, promo and announcement updates will appear here.', 'bell'));
      }).fail(fail);
    }
    $('#page-content').on('click', '.delete-notification', function () {
      var id = $(this).attr('data-id'), $b = $(this);
      Ui.confirm({ title: 'Delete this notification?', message: 'It will be removed for every user who can see it.', confirmText: 'Delete', danger: true }).then(function (ok) {
        if (!ok) return;
        Ui.setLoading($b, true, 'Deleting…');
        Api.del('/notifications/' + encodeURIComponent(id)).done(function () { Ui.toast('Notification deleted.', 'success'); load(); })
          .fail(function (err) { Ui.setLoading($b, false); Api.toastError(err); });
      });
    });
    load();
  }

  App.register({
    'notifications': notifications,
    'admin-notifications': notifications
  });
})(window, jQuery);
