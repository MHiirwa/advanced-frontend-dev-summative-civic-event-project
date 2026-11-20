/**
 * features/search.js — global search page (pages/search.html), fed by the header search box.
 * ROLE GUARD (UX only): normal users only get published items in the results.
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  /** Global search: the API has no search endpoint, so fetch the three published collections and filter client-side. */
  function search() {
    var q = (new URLSearchParams(location.search).get('q') || '').trim();
    if (!boot('Search', q ? 'Results for “' + q + '”' : 'Search events, announcements and promos.', 'search')) return;
    $('#global-search, #global-search-m').val(q);
    if (!q) { put(C.empty('Type something to search', 'Use the search box in the header.')); return; }
    put(C.loading());
    var needle = q.toLowerCase();
    // ROLE GUARD (UX only): drafts are excluded from search results for normal users.
    function match(x) { return (admin || x.published !== false) && [x.title, x.description, x.location, x.caption_text].join(' ').toLowerCase().indexOf(needle) !== -1; }
    $.when(Api.get('/events', null, { cache: true }), Api.get('/announcements', null, { cache: true }), Api.get('/promos', null, { cache: true }))
      .done(function (ev, an, pr) {
        var groups = [['Events', (ev.data || []).filter(match), C.eventCard], ['Announcements', (an.data || []).filter(match), C.announcementCard], ['Promos', (pr.data || []).filter(match), C.promoCard]];
        var total = groups.reduce(function (n, g) { return n + g[1].length; }, 0);
        put(total ? groups.filter(function (g) { return g[1].length; }).map(function (g) {
          return '<section class="mt-6" aria-label="' + g[0] + ' results"><h2 class="font-display text-2xl font-semibold">' + g[0] + ' <span class="muted">(' + g[1].length + ')</span></h2><div class="card-grid mt-4">' + g[1].map(function (x) { return g[2](x, false); }).join('') + '</div></section>';
        }).join('') : C.empty('No results', 'Nothing matched “' + q + '”. Try another word.'));
      }).fail(fail);
  }

  App.register({
    'search': search
  });
})(window, jQuery);
