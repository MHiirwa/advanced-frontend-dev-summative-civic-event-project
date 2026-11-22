/**
 * app.js — shared glue for every signed-in page (pages/ and admin/).
 * ---------------------------------------------------------------
 *  - App.boot(): renders <main> + the shared header/footer via Layout.init and runs
 *    the page access guard (see ROLE GUARD below).
 *  - App.put()/App.fail(): write page content / show the generic error state.
 *  - App.showList()/queryBar()/filterCards(): simple published-only card lists.
 *  - App.mediaDetail(): shared loader for the announcement and promo detail pages.
 *  - Router: each js/features/*.js file calls App.register({ 'data-page': handler }).
 *    On DOM ready, the handler matching <body data-page="…"> runs.
 */
(function (window, $) {
  'use strict';
  var C = window.Components, page = $('body').data('page'), admin = $('body').data('access') === 'admin', state = {};
  var routes = {};
  /**
   * Renders the shared layout (js/shared/layout.js) around the page content.
   * ROLE GUARD: pages whose <body> has data-access="admin" (everything in admin/) call
   * Layout.init with access 'admin', which runs GUARD 1 (must be logged in) and GUARD 2
   * (must be an admin; normal users get the "no access" screen). All other app pages only
   * require a signed-in user. These checks are UX only; the API enforces roles itself.
   */
  function boot(title, intro, active) {
    // Already rendered: the page function is being re-run (Retry, or a refresh after an action).
    // Only update the heading; re-running Layout.init would duplicate <main> and header handlers.
    if ($('#page-content').length) { $('#main h1').first().text(title); $('#main .lede').first().text(intro || '').toggle(!!intro); return true; }
    // Compact page header: title, an optional one-line description, and #page-actions for the
    // page's main action (filled by App.actions). No uppercase labels or slogans.
    $('body').prepend('<main id="main" class="mx-auto w-full max-w-7xl px-4 page-content" tabindex="-1"><header class="page-heading"><div><h1>' + Ui.escape(title) + '</h1><p class="lede"' + (intro ? '' : ' hidden') + '>' + Ui.escape(intro || '') + '</p></div><div id="page-actions" class="page-actions"></div></header><div id="page-alert"></div><div id="page-content"></div></main>');
    return Layout.init({ access: admin ? 'admin' : 'user', active: active || page });
  }
  function put(html) { $('#page-content').html(html); }
  /** Puts the page's primary action(s) on the right of the page header. */
  function actions(html) { $('#page-actions').html(html || ''); }
  /** Generic error state. Retry re-runs the current page's function (boot() is safe to call again). */
  function fail(err) { put(C.error(err.message)); $('.retry-btn').one('click', run); }
  function showList(kind, endpoint, render, title, intro, active) {
    if (!boot(title, intro, active)) return;
    put(C.loading());
    // ROLE GUARD (UX only): normal users only see published items. The API returns drafts too,
    // so they are filtered here; admin/ pages (admin === true) keep drafts so admins can manage them.
    function load() { put(C.loading()); Api.get(endpoint, null, { cache: true }).done(function (r) { state.items = (r.data || []).filter(function (x) { return admin || x.published !== false; }); render(state.items, r); }).fail(fail); }
    load();
  }
  function queryBar() { return '<div class="toolbar"><label class="sr-only" for="filter">Search</label><input id="filter" class="input" type="search" placeholder="Search this collection…"><select id="sort" class="input"><option value="new">Newest first</option><option value="date">Date</option></select></div>'; }
  function filterCards(items, render, field) { $('#filter, #sort').on('input change', function () { var q = ($('#filter').val() || '').toLowerCase(), arr = items.filter(function (x) { return JSON.stringify(x).toLowerCase().indexOf(q) !== -1; }); if ($('#sort').val() === 'date') arr.sort(function (a, b) { return new Date(a.starts_at || a.created_at) - new Date(b.starts_at || b.created_at); }); render(arr); }); }
  /**
   * Shared loader for the announcement/promo detail pages: skeleton, fetch, error state with a
   * working Retry, and the published check. render(item, H2class) builds the page body.
   */
  function mediaDetail(kind, label, render) {
    var id = new URLSearchParams(location.search).get('id');
    if (!boot(label + ' details', '', kind)) return;
    // ROLE GUARD (UX only): decided by the signed-in user's role, not the folder, because admins
    // also open these public detail pages from their manage lists and need to see drafts.
    var isAdmin = Auth.isAdmin();
    var back = '<a class="back-link inline-flex items-center gap-1" href="' + kind + '.html">' + Ui.icon('back', 'w-4 h-4') + ' Back to ' + kind + '</a>';
    function showError(err, canRetry) {
      $('#page-content').html(back).append(Ui.errorState({ title: 'Couldn\'t load this ' + label.toLowerCase(), message: err.message, onRetry: canRetry ? load : null }));
    }
    function load() {
      put('<div class="sr-only" role="status">Loading…</div><div class="card mx-auto max-w-4xl overflow-hidden" aria-hidden="true"><div class="skeleton ' + (kind === 'promos' ? 'aspect-video' : 'h-24') + ' w-full rounded-none"></div><div class="space-y-3 p-6"><div class="skeleton h-6 w-1/3"></div><div class="skeleton h-4 w-full"></div><div class="skeleton h-4 w-2/3"></div></div></div>');
      if (!id) { showError({ message: 'No ' + label.toLowerCase() + ' was specified in the link.' }, false); return; }
      Api.get('/' + kind + '/' + encodeURIComponent(id)).done(function (r) {
        var x = r.data;
        // ROLE GUARD (UX only): normal users may only open published items; admins can preview drafts.
        if (!x || (!isAdmin && x.published === false)) { showError({ message: 'This ' + label.toLowerCase() + ' does not exist or is not published.' }, false); return; }
        $('main h1').first().text(x.title);
        document.title = x.title + ' · CivicEvents';
        put(back + '<div class="mx-auto mt-4 max-w-4xl">' + render(x, isAdmin, 'font-display text-xl font-semibold text-brand-900') + '</div>');
      }).fail(function (err) { showError(err, true); });
    }
    load();
  }

  /**
   * The signed-in user's registrations as { event_id: status } for "Registered" chips.
   * Normal users only (admins have no registrations UI). Never fails the page: on error
   * it resolves to {} and cards simply show no registration chip.
   */
  function myRegistrations() {
    var d = $.Deferred();
    if (Auth.isAdmin()) return d.resolve({}).promise();
    Api.get('/event-registrations/my-registrations', null, { silent: true }).done(function (r) {
      var map = {};
      (r.data || []).forEach(function (x) { map[String(x.event_id)] = x.status; });
      d.resolve(map);
    }).fail(function () { d.resolve({}); });
    return d.promise();
  }

  /** Runs the handler for this page. Also used by fail() as the generic Retry. */
  function run() {
    var handler = routes[page];
    if (handler) return handler();
  }

  window.App = {
    C: C,
    page: page,
    // true on admin/ pages (<body data-access="admin">). Feature code uses it to show
    // admin-only controls and unpublished items; boot() uses it to pick the access guard.
    adminArea: admin,
    boot: boot, put: put, fail: fail, run: run, actions: actions,
    myRegistrations: myRegistrations,
    showList: showList, queryBar: queryBar, filterCards: filterCards, mediaDetail: mediaDetail,
    register: function (map) { $.extend(routes, map); }
  };
  $(run);
})(window, jQuery);
