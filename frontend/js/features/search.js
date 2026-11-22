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
    // The page has its own search box (the header one is only shown on very wide screens).
    put('<form role="search" action="search.html" method="get" class="mb-6 flex max-w-xl gap-2"><label for="search-q" class="sr-only">Search events, announcements and promos</label>' +
      '<input id="search-q" name="q" type="search" class="input" placeholder="Search events, announcements and promos…" value="' + Ui.escape(q) + '" autocomplete="off">' +
      '<button class="btn btn-primary" type="submit">' + Ui.icon('search', 'w-4 h-4') + '<span>Search</span></button></form><div id="search-results"></div>');
    $('#global-search, #global-search-m').val(q);
    var $results = $('#search-results');
    if (!q) { $results.html(C.empty('Type something to search', 'Search covers event titles, descriptions and locations, plus announcements and promos.', 'search')); $('#search-q').trigger('focus'); return; }
    $results.html(C.loading());
    var needle = q.toLowerCase();
    // ROLE GUARD (UX only): drafts are excluded from search results for normal users.
    function match(x) { return (admin || x.published !== false) && [x.title, x.description, x.location, x.caption_text].join(' ').toLowerCase().indexOf(needle) !== -1; }
    $.when(Api.get('/events', null, { cache: true }), Api.get('/announcements', null, { cache: true }), Api.get('/promos', null, { cache: true }))
      .done(function (ev, an, pr) {
        var groups = [['Events', (ev.data || []).filter(match), C.eventCard], ['Announcements', (an.data || []).filter(match), C.announcementCard], ['Promos', (pr.data || []).filter(match), C.promoCard]];
        var total = groups.reduce(function (n, g) { return n + g[1].length; }, 0);
        $results.html(total ? groups.filter(function (g) { return g[1].length; }).map(function (g) {
          return '<section class="mt-6" aria-label="' + g[0] + ' results"><h2 class="font-display text-2xl font-semibold">' + g[0] + ' <span class="muted">(' + g[1].length + ')</span></h2><div class="card-grid mt-4">' + g[1].map(function (x) { return g[2](x, false); }).join('') + '</div></section>';
        }).join('') : C.empty('No results', 'Nothing matched “' + q + '”. Try another word.'));
      }).fail(fail);
  }

  App.register({
    'search': search
  });
})(window, jQuery);
