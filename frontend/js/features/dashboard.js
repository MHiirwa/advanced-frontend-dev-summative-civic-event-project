/**
 * features/dashboard.js — dashboards. One data-page ("dashboard") serves both:
 *  - admin/dashboard.html (admin === true): GET /dashboard/admin stats + Chart.js charts.
 *  - pages/dashboard.html (normal users): GET /dashboard/me, registrations, notifications.
 * ROLE GUARD: which dashboard runs is decided by the page folder (admin/ is guarded by
 * Layout GUARD 2), and /dashboard/admin is admin-only in the API.
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  /* =================================================================
   * Admin dashboard (admin/dashboard.html). ROLE GUARD: data-access="admin" on the page,
   * so boot() -> Layout.init blocks normal users; GET /dashboard/admin is admin-only too.
   * Stat tiles + three Chart.js charts. The API returns counts as strings (Postgres COUNT),
   * so every number goes through num(). Each chart has a text summary and a data table
   * so nothing depends on seeing the canvas.
   * ================================================================= */
  // Chart colours checked with a palette validator (contrast, colour-blind separation).
  var CHART = { teal: '#1a8a70', amber: '#b8620a', grid: '#e3ebe8', ink: '#5b6b67', surface: '#ffffff' };
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
  function dashboard() {
    if (!boot('Admin dashboard', 'A clear view of community activity.', 'dashboard')) return;
    var charts = {}, hasChart = typeof window.Chart === 'function';

    put('<div class="mb-6 flex flex-wrap items-center justify-between gap-3">' +
        '<p id="dash-updated" class="text-sm text-muted" role="status" aria-live="polite"></p>' +
        '<button type="button" id="dash-refresh" class="btn btn-secondary btn-small inline-flex items-center gap-2">' + Ui.icon('refresh', 'w-4 h-4') + ' Refresh</button></div>' +
      '<div id="dash-stats" class="stat-grid">' + Ui.skeletonCards(0) + [1, 2, 3, 4, 5, 6].map(function () { return '<div class="stat-card card" aria-hidden="true"><div class="skeleton h-4 w-2/3"></div><div class="skeleton mt-3 h-8 w-1/2"></div></div>'; }).join('') + '</div>' +
      (hasChart ? '' : '<p class="mt-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="note">Charts could not be loaded (Chart.js is unavailable). The figures are still listed below each heading.</p>') +
      '<div class="mt-8 grid gap-6 lg:grid-cols-3">' +
        chartCard('growth', 'New users per month', 'Sign-ups over the last 6 months') +
        chartCard('users', 'Active vs inactive users', 'All registered accounts') +
        chartCard('events', 'Upcoming vs past events', 'Based on start and end times') +
      '</div>' +
      '<div class="admin-links"><a class="card quick-link" href="events.html">Manage events <span aria-hidden="true">→</span></a><a class="card quick-link" href="announcements.html">Manage announcements <span aria-hidden="true">→</span></a><a class="card quick-link" href="promos.html">Manage promos <span aria-hidden="true">→</span></a><a class="card quick-link" href="users.html">Manage users <span aria-hidden="true">→</span></a><a class="card quick-link" href="registrations.html">View registrations <span aria-hidden="true">→</span></a><a class="card quick-link" href="notifications.html">Manage notifications <span aria-hidden="true">→</span></a></div>');

    function chartCard(key, title, sub) {
      return '<section class="card flex min-w-0 flex-col p-5" aria-labelledby="ch-' + key + '-title">' +
        '<h2 id="ch-' + key + '-title" class="font-display text-lg font-semibold text-brand-900">' + title + '</h2><p class="text-sm text-muted">' + sub + '</p>' +
        (hasChart ? '<div class="relative mt-4 h-56"><canvas id="ch-' + key + '" role="img" aria-describedby="ch-' + key + '-summary"></canvas></div>' : '') +
        '<p id="ch-' + key + '-summary" class="mt-4 text-sm">Loading…</p>' +
        '<details class="mt-3 text-sm"><summary class="cursor-pointer font-semibold text-brand-700">Show data table</summary><div id="ch-' + key + '-table" class="mt-2"></div></details>' +
      '</section>';
    }
    function miniTable(head, rows) {
      return '<table class="!min-w-0 w-full text-sm"><thead><tr><th scope="col">' + head[0] + '</th><th scope="col" class="text-right">' + head[1] + '</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><th scope="row" class="font-normal">' + Ui.escape(r[0]) + '</th><td class="text-right tabular-nums">' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>';
    }
    function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

    /* The API only returns months that had sign-ups; fill the last 6 months so empty months show as 0. */
    function growthSeries(rows) {
      var byMonth = {}; (rows || []).forEach(function (r) { byMonth[String(r.month).slice(0, 7)] = num(r.new_users); });
      var out = [], d = new Date(); d.setDate(1);
      for (var i = 5; i >= 0; i--) {
        var m = new Date(d.getFullYear(), d.getMonth() - i, 1);
        var key = m.getFullYear() + '-' + ('0' + (m.getMonth() + 1)).slice(-2);
        out.push({ label: m.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }), value: byMonth[key] || 0 });
      }
      return out;
    }

    /* ---------- Chart.js setup (thin marks, recessive grid, rounded bar ends, hover tooltips) ---------- */
    function baseOptions(extra) {
      return $.extend(true, {
        responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#12423a', padding: 10, cornerRadius: 8, displayColors: false } },
        scales: {
          x: { grid: { display: false }, border: { color: CHART.grid }, ticks: { color: CHART.ink } },
          y: { beginAtZero: true, grid: { color: CHART.grid }, border: { display: false }, ticks: { color: CHART.ink, precision: 0 } }
        }
      }, extra || {});
    }
    function upsert(key, config) {
      if (!hasChart) return;
      if (charts[key]) { charts[key].data = config.data; charts[key].update(); return; }
      charts[key] = new Chart(document.getElementById('ch-' + key), config);
    }
    if (hasChart) { Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.color = CHART.ink; }

    function render(d) {
      var u = d.users || {}, ev = d.events || {};
      var stats = [['Total users', num(u.total_users)], ['Active users', num(u.active_users)], ['Events', num(ev.total_events)],
        ['Registrations', num(d.registrations && d.registrations.total_registrations)], ['Feedback', num(d.feedbacks && d.feedbacks.total_feedback)],
        ['Promos', num(d.promos && d.promos.total_promos)], ['Announcements', num(d.announcements && d.announcements.total_announcements)],
        ['Notifications', num(d.notifications && d.notifications.total_notifications)]];
      $('#dash-stats').html(stats.map(function (x) { return '<div class="stat-card card"><p class="muted">' + x[0] + '</p><strong class="tabular-nums">' + x[1] + '</strong></div>'; }).join(''));

      // 1) User growth: bars per month (single series, so no legend; the heading names it).
      var g = growthSeries(d.user_growth), gTotal = g.reduce(function (s, x) { return s + x.value; }, 0);
      var peak = g.reduce(function (a, b) { return b.value > a.value ? b : a; }, g[0]);
      upsert('growth', { type: 'bar', data: { labels: g.map(function (x) { return x.label; }),
        datasets: [{ label: 'New users', data: g.map(function (x) { return x.value; }), backgroundColor: CHART.teal, hoverBackgroundColor: '#12423a', borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 36 }] },
        options: baseOptions({ plugins: { tooltip: { callbacks: { label: function (c) { return plural(c.parsed.y, 'new user'); } } } } }) });
      var gSummary = gTotal ? plural(gTotal, 'new user') + ' joined in the last 6 months. The busiest month was ' + peak.label + ' with ' + peak.value + '.' : 'No new users joined in the last 6 months.';
      $('#ch-growth-summary').text(gSummary); $('#ch-growth').attr('aria-label', 'Bar chart: ' + gSummary);
      $('#ch-growth-table').html(miniTable(['Month', 'New users'], g.map(function (x) { return [x.label, x.value]; })));

      // 2) Active vs inactive: doughnut, 2px surface gap between segments, legend with counts.
      var act = num(u.active_users), inact = num(u.inactive_users), tot = act + inact;
      // Round the active share and give inactive the remainder, so the two always add up to 100%.
      var actPct = tot ? Math.round(act / tot * 100) : 0;
      var pct = function (n) { return !tot ? 0 : n === act ? actPct : 100 - actPct; };
      upsert('users', { type: 'doughnut', data: { labels: ['Active (' + act + ')', 'Inactive (' + inact + ')'],
        datasets: [{ data: [act, inact], backgroundColor: [CHART.teal, CHART.amber], borderColor: CHART.surface, borderWidth: 2, hoverOffset: 4 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '62%',
          plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'rectRounded', color: '#1c2b28', padding: 16 } },
            tooltip: { backgroundColor: '#12423a', padding: 10, cornerRadius: 8, callbacks: { label: function (c) { return ' ' + plural(c.parsed, 'user') + ' (' + pct(c.parsed) + '%)'; } } } } } });
      var uSummary = tot ? act + ' of ' + plural(tot, 'user') + (act === 1 ? ' is' : ' are') + ' active (' + pct(act) + '%) and ' + inact + (inact === 1 ? ' is' : ' are') + ' disabled (' + pct(inact) + '%).' : 'There are no users yet.';
      $('#ch-users-summary').text(uSummary); $('#ch-users').attr('aria-label', 'Doughnut chart: ' + uSummary);
      $('#ch-users-table').html(miniTable(['Status', 'Users'], [['Active', act], ['Inactive', inact], ['Total', tot]]));

      // 3) Upcoming vs past events: one measure, so one colour; the axis labels name each bar.
      var up = num(ev.upcoming_events), past = num(ev.past_events), evTot = num(ev.total_events), ongoing = Math.max(0, evTot - up - past);
      upsert('events', { type: 'bar', data: { labels: ['Upcoming', 'Past'],
        datasets: [{ label: 'Events', data: [up, past], backgroundColor: CHART.teal, hoverBackgroundColor: '#12423a', borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 56 }] },
        options: baseOptions({ plugins: { tooltip: { callbacks: { label: function (c) { return plural(c.parsed.y, 'event'); } } } } }) });
      var eSummary = up + ' upcoming and ' + past + ' past ' + (past === 1 ? 'event' : 'events') + ' out of ' + plural(evTot, 'event') + ' in total' + (ongoing ? ' (' + ongoing + ' happening right now).' : '.');
      $('#ch-events-summary').text(eSummary); $('#ch-events').attr('aria-label', 'Bar chart: ' + eSummary);
      $('#ch-events-table').html(miniTable(['Events', 'Count'], [['Upcoming', up], ['Past', past]].concat(ongoing ? [['In progress', ongoing]] : []).concat([['Total', evTot]])));

      $('#dash-updated').text('Last updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }

    function load(isRefresh) {
      var $btn = $('#dash-refresh');
      if (isRefresh) Ui.setLoading($btn, true, 'Refreshing…');
      return Api.get('/dashboard/admin').done(function (r) {
        render(r.data || {});
        if (isRefresh) Ui.toast('Dashboard updated.', 'success');
      }).fail(function (err) {
        // Keep the last good numbers on screen if a refresh fails; a first-load failure shows the error state.
        if (isRefresh) Api.toastError(err); else fail(err);
      }).always(function () { if (isRefresh) Ui.setLoading($btn, false); });
    }
    $('#dash-refresh').on('click', function () { load(true); });
    load(false);
  }
  function userDashboard() {
    if (!boot('Welcome to your community', 'Your participation, registrations and updates in one place.', 'dashboard')) return;
    put(C.loading());
    $.when(Api.get('/dashboard/me'), Api.get('/event-registrations/my-registrations'), Api.get('/notifications'), Api.get('/events'))
      .done(function (dashRes, registrationRes, notificationRes, eventRes) {
        var d = dashRes.data || {}, registrations = registrationRes.data || [], notifications = notificationRes.data || [], events = (eventRes.data || []).filter(function (e) { return e.published !== false && e.status !== 'cancelled'; }).slice(0, 3);
        put('<div class="stat-grid">' +
          [['Registered events', d.registrations && d.registrations.total_registered_events], ['Feedback shared', d.feedbacks && d.feedbacks.total_feedbacks], ['Unread notifications', d.notifications && d.notifications.unread_notifications], ['Published announcements', d.announcements && d.announcements.total_announcements]].map(function (x) { return '<article class="stat-card card"><p class="muted">' + x[0] + '</p><strong>' + (x[1] == null ? '—' : x[1]) + '</strong></article>'; }).join('') +
          '</div><div class="dashboard-columns"><section><div class="section-heading compact"><h2>Upcoming registration</h2><a class="text-link" href="my-registrations.html">View all →</a></div><div class="stack-list">' + (registrations.length ? registrations.filter(function (r) { return r.status !== 'cancelled'; }).slice(0, 3).map(function (r) { return '<article class="card list-row"><div><p class="card-kicker">REGISTRATION</p><h3>' + Ui.escape(r.title) + '</h3><p class="muted">' + Ui.escape(Ui.formatDateTime(r.starts_at)) + ' · ' + Ui.escape(r.location) + '</p></div></article>'; }).join('') : C.empty('No active registrations', 'Explore events and join a community activity.')) + '</div></section><section><div class="section-heading compact"><h2>Recent notifications</h2><a class="text-link" href="notifications.html">View all →</a></div><div class="stack-list">' + (notifications.length ? notifications.slice(0, 4).map(function (n) { return '<article class="card list-row"><div><p class="card-kicker">' + Ui.escape(n.type || 'NOTIFICATION') + '</p><h3>' + Ui.escape(n.title) + '</h3><p>' + Ui.escape(n.message) + '</p></div></article>'; }).join('') : C.empty('No notifications yet', 'Updates will appear here.')) + '</div></section></div><section class="dashboard-events"><div class="section-heading compact"><h2>Discover what is happening</h2><a class="text-link" href="events.html">Explore events →</a></div><div class="card-grid">' + (events.length ? events.map(function (e) { return C.eventCard(e, false); }).join('') : C.empty('No published events', 'Check back for new community activities.')) + '</div></section>');
      }).fail(fail);
  }

  App.register({
    // ROLE GUARD: admin/dashboard.html (admins only, Layout GUARD 2) gets the admin dashboard;
    // pages/dashboard.html (any signed-in user) gets the personal dashboard.
    'dashboard': function () { return admin ? dashboard() : userDashboard(); }
  });
})(window, jQuery);
