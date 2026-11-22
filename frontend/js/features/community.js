/**
 * features/community.js — the two community landing pages:
 *   pages/rwanda-civic-life.html  (<body data-page="community" data-community="civic">)
 *   pages/alu-campus.html         (<body data-page="community" data-community="campus">)
 * One module, one layout; the destination's settings come from Civic.COMMUNITIES.
 *
 * Sections (in order): short introduction · latest announcements + promos · upcoming events
 * with search and a time filter.
 *
 * Honesty rules:
 *  - Announcements and promos are NOT tagged by community in the provided API, so these
 *    sections show the latest published items from across CivicEvents+ and say so.
 *  - Events are matched to the community by visible keywords (Civic.matchedKeywords);
 *    the page explains the rule. Nothing is relabelled or invented.
 *  - The Umuganda note is the general calendar rule, clearly marked as not an event.
 *
 * ROLE GUARD: pages/ require a signed-in user (Layout GUARD 1); any role may view them.
 * Only published content is shown here, also to admins (they manage drafts in admin/).
 */
(function (window, $) {
  'use strict';
  var App = window.App, C = App.C, boot = App.boot, put = App.put;
  var PAGE_SIZE = 9;

  function skeletonRows(n) {
    var h = '';
    for (var i = 0; i < n; i++) h += '<li class="flex items-center gap-3 py-2.5" aria-hidden="true"><span class="skeleton h-9 w-9"></span><span class="flex-1 space-y-2"><span class="skeleton block h-3.5 w-3/4"></span><span class="skeleton block h-3 w-1/3"></span></span></li>';
    return h;
  }
  function skeletonCards(n) {
    var h = '';
    for (var i = 0; i < n; i++) h += '<div class="card flex gap-3 p-4" aria-hidden="true"><span class="skeleton h-14 w-14"></span><span class="flex-1 space-y-2"><span class="skeleton block h-4 w-4/5"></span><span class="skeleton block h-3 w-1/2"></span><span class="skeleton block h-3 w-2/3"></span></span></div>';
    return h;
  }
  /** Inline error with a working Retry for one section. */
  function sectionError($el, title, err, retry) {
    var $box = Ui.errorState({ title: title, message: err.message, onRetry: retry });
    $el.empty().append($el.is('ul') ? $('<li>').append($box) : $box); // keep lists valid HTML
  }

  function community() {
    var key = String($('body').data('community') || ''), cfg = Civic.COMMUNITIES[key];
    if (!cfg) return; // misconfigured shell: nothing sensible to render
    if (!boot(cfg.title, '', 'community')) return;
    document.title = cfg.title + ' · CivicEvents';
    // Organisation logo on the right of the page header (coat of arms / ALU logo).
    App.actions('<img class="page-logo" src="' + Layout.root + cfg.logo + '" alt="' + Ui.escape(cfg.logoAlt) + '">');
    var root = Layout.root, pages = C.pagesPath();

    var umuganda = '';
    if (key === 'civic') {
      var next = Civic.nextUmuganda();
      umuganda = '<p class="info-strip" role="note">' + Ui.icon('calendar', 'w-4 h-4') +
        '<span>By the national rule (last Saturday of the month), the next <strong>Umuganda</strong> falls on <strong>' +
        Ui.escape(next.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) +
        '</strong>. This is the general monthly observance, not a specific event; dates can change, so confirm with your local sector.</span></p>';
    }

    put(
      '<div class="community-intro"><div><p>' + Ui.escape(cfg.intro) + '</p>' + umuganda + '</div>' +
        '<img src="' + root + cfg.image + '" alt="' + Ui.escape(cfg.alt) + '" width="416" height="312" loading="eager"></div>' +

      '<div class="updates-grid">' +
        '<section class="card" aria-labelledby="cm-ann">' +
          C.sectionHeader('cm-ann', 'Latest announcements', pages + 'announcements.html', 'All announcements', C.chip('Across CivicEvents', 'muted')) +
          '<ul id="cm-ann-list" class="media-list" aria-live="polite">' + skeletonRows(3) + '</ul></section>' +
        '<section class="card" aria-labelledby="cm-pro">' +
          C.sectionHeader('cm-pro', 'Latest promos', pages + 'promos.html', 'All promos', C.chip('Across CivicEvents', 'muted')) +
          '<ul id="cm-pro-list" class="media-list" aria-live="polite">' + skeletonRows(2) + '</ul></section>' +
      '</div>' +

      '<section aria-labelledby="cm-events">' +
        C.sectionHeader('cm-events', 'Upcoming events', pages + 'events.html?community=' + key, 'All matching events') +
        '<details class="match-note"><summary class="cursor-pointer">How events are chosen</summary>' +
          '<p class="mt-1">Events appear here when their title, description or location mentions: ' + Ui.escape(cfg.keywords.join(', ')) +
          '. An event can match both communities; every event is also listed under <a class="text-link" href="' + pages + 'events.html">All events</a>.</p></details>' +
        '<form class="filter-bar" role="search" aria-label="Filter ' + Ui.escape(cfg.title) + ' events" onsubmit="return false">' +
          '<div class="flex-1"><label class="label" for="cm-q">Search</label><input id="cm-q" class="input" type="search" placeholder="Title, description or location…"></div>' +
          '<div><label class="label" for="cm-when">When</label><select id="cm-when" class="input"><option value="all">All upcoming</option><option value="week">Next 7 days</option><option value="month">Next 30 days</option></select></div>' +
        '</form>' +
        '<p id="cm-count" class="mb-3 text-sm text-muted" role="status"></p>' +
        '<div id="cm-events-grid" class="card-grid">' + skeletonCards(3) + '</div>' +
        '<div id="cm-more" class="mt-4 text-center"></div>' +
      '</section>'
    );

    /* ---------- Announcements (latest published, shared feed) ---------- */
    function loadAnnouncements() {
      var $list = $('#cm-ann-list').html(skeletonRows(3));
      Api.get('/announcements', null, { cache: true }).done(function (r) {
        var items = (r.data || []).filter(function (a) { return a.published !== false; })
          .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); }).slice(0, 3);
        $list.html(items.length ? items.map(C.announcementRow).join('') : '<li class="py-4 text-sm text-muted">No announcements have been published yet.</li>');
      }).fail(function (err) { sectionError($list, 'Couldn\'t load announcements', err, loadAnnouncements); });
    }

    /* ---------- Promos (latest published, shared feed) ---------- */
    function loadPromos() {
      var $list = $('#cm-pro-list').html(skeletonRows(2));
      Api.get('/promos', null, { cache: true }).done(function (r) {
        var items = (r.data || []).filter(function (p) { return p.published !== false; })
          .sort(function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); }).slice(0, 2);
        $list.html(items.length ? items.map(C.promoRow).join('') : '<li class="py-4 text-sm text-muted">No promos have been published yet.</li>');
      }).fail(function (err) { sectionError($list, 'Couldn\'t load promos', err, loadPromos); });
    }

    /* ---------- Upcoming events matched to this community ---------- */
    var allEvents = [], regs = {}, shown = PAGE_SIZE;
    function range() {
      var v = $('#cm-when').val(), today = new Date();
      if (v === 'all') return {};
      var end = new Date(today); end.setDate(end.getDate() + (v === 'week' ? 6 : 29));
      return { from: Civic.isoDay(today), to: Civic.isoDay(end) };
    }
    function renderEvents() {
      var r = range();
      var list = Civic.filterEvents(allEvents, { community: key, upcomingOnly: true, q: $('#cm-q').val(), from: r.from, to: r.to });
      var filtered = $('#cm-q').val().trim() || $('#cm-when').val() !== 'all';
      $('#cm-count').text(list.length ? 'Showing ' + Math.min(shown, list.length) + ' of ' + list.length + ' upcoming event' + (list.length === 1 ? '' : 's') : '');
      $('#cm-events-grid').html(list.length
        ? list.slice(0, shown).map(function (e) { return C.eventCard(e, false, { registration: regs[String(e.id)] }); }).join('')
        : filtered
          ? C.empty('No matching upcoming events', 'Try another search or a wider time range.', 'search')
          : C.empty('No upcoming ' + cfg.title + ' events yet', 'When an administrator publishes a matching event, it will appear here.', cfg.icon));
      $('#cm-more').html(list.length > shown ? '<button type="button" id="cm-more-btn" class="btn btn-secondary">Show more events</button>' : '');
    }
    function loadEvents() {
      $('#cm-events-grid').html(skeletonCards(3)); $('#cm-count').text(''); $('#cm-more').empty();
      $.when(Api.get('/events', null, { cache: true }), App.myRegistrations()).done(function (r, map) {
        // ROLE GUARD (UX only): drafts are never shown on community pages.
        allEvents = (r.data || []).filter(function (e) { return e.published !== false; });
        regs = map || {};
        renderEvents();
      }).fail(function (err) { sectionError($('#cm-events-grid'), 'Couldn\'t load events', err, loadEvents); });
    }
    $('#cm-q').on('input', Ui.debounce(function () { shown = PAGE_SIZE; renderEvents(); }, 200));
    $('#cm-when').on('change', function () { shown = PAGE_SIZE; renderEvents(); });
    $('#cm-more').on('click', '#cm-more-btn', function () {
      var focusIndex = shown; shown += PAGE_SIZE; renderEvents();
      $('#cm-events-grid .stretched-link').eq(focusIndex).trigger('focus'); // keep keyboard users in place
    });

    loadAnnouncements(); loadPromos(); loadEvents();
  }

  App.register({ community: community });
})(window, jQuery);
