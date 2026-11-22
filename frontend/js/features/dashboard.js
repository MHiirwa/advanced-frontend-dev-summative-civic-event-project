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
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  /**
   * Admin overview (admin/dashboard.html). Every figure is computed from real API data:
   *  - GET /dashboard/admin            totals (counts arrive as strings -> num())
   *  - GET /events                      upcoming table, "added in the last 7 days"
   *  - GET /event-registrations/event/:id/attendees and GET /event-feedback/event/:id for each event
   *                                     registrations per week, new registrations/feedback, average rating
   *  - GET /announcements, GET /promos  unpublished drafts
   *  - notifications (shared store)     unread count (read state is per user in the browser)
   * The per-event calls are fine at this project's scale; a production API would expose aggregates.
   * ROLE GUARD: admin/ page (Layout GUARD 2) and admin-only endpoints.
   */
  function dashboard() {
    var user = Auth.getUser() || {}, first = String(user.full_name || '').split(' ')[0];
    var h = new Date().getHours(), greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    if (!boot('Overview', greeting + (first ? ', ' + first : '') + ' · figures update when you refresh', 'dashboard')) return;
    var chart = null, hasChart = typeof window.Chart === 'function', WEEK = 7 * 864e5, now = Date.now();
    App.actions('<button type="button" id="dash-refresh" class="btn btn-secondary btn-sm">Refresh</button>' +
      '<a class="btn btn-primary btn-sm" href="create-event.html">' + Ui.icon('plus', 'w-4 h-4') + 'Create event</a>');

    function kpiSkel() { return '<div class="card kpi-card" aria-hidden="true"><span class="skeleton block h-3 w-24"></span><span class="skeleton mt-3 block h-7 w-14"></span><span class="skeleton mt-3 block h-3 w-28"></span></div>'; }
    put('<div id="kpis" class="kpi-grid">' + [1, 2, 3, 4].map(kpiSkel).join('') + '</div>' +
      '<div class="mt-6 grid gap-6 lg:grid-cols-3">' +
        '<section class="card panel lg:col-span-2" aria-labelledby="reg-chart-title"><div class="panel-head"><h2 id="reg-chart-title">Registrations per week</h2><span class="text-xs text-muted">Last 8 weeks · active registrations</span></div>' +
          (hasChart ? '<div class="relative h-60"><canvas id="ch-regs" role="img" aria-describedby="reg-summary"></canvas></div>' : '') +
          '<p id="reg-summary" class="mt-3 text-sm text-muted">Loading…</p>' +
          '<details class="mt-2 text-sm"><summary class="cursor-pointer font-semibold text-brand-800">Show data table</summary><div id="reg-table" class="mt-2"></div></details></section>' +
        '<section class="card panel" aria-labelledby="attn-title"><div class="panel-head"><h2 id="attn-title">Needs attention</h2></div><div id="attention">' + Ui.skeletonRows(3) + '</div></section>' +
      '</div>' +
      '<section class="card mt-6 overflow-hidden" aria-labelledby="up-title"><div class="panel-head !mb-0 px-5 py-4"><h2 id="up-title">Upcoming events</h2><a class="text-link text-sm" href="events.html">Manage events</a></div><div id="up-table">' + Ui.skeletonRows(3) + '</div></section>');

    function kpi(label, value, sub, up) {
      return '<div class="card kpi-card"><span class="kc-label">' + label + '</span><span class="kc-value">' + value + '</span><span class="kc-sub' + (up ? ' is-up' : '') + '">' + sub + '</span></div>';
    }
    function weekStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; } // Monday

    function render(stats, events, perEvent, drafts) {
      var u = stats.users || {}, ev = stats.events || {};
      var allRegs = [], allFb = [];
      events.forEach(function (e) { var p = perEvent[e.id] || {}; allRegs = allRegs.concat(p.att || []); allFb = allFb.concat(p.fb || []); });
      var recent = function (list) { return list.filter(function (x) { return x.created_at && now - new Date(x.created_at) < WEEK; }).length; };
      var newEvents = recent(events), newRegs = recent(allRegs), newFb = recent(allFb);
      var avg = allFb.length ? allFb.reduce(function (s, f) { return s + Number(f.rating || 0); }, 0) / allFb.length : null;
      var monthKey = new Date().toISOString().slice(0, 7), joined = 0;
      (stats.user_growth || []).forEach(function (g) { if (String(g.month).slice(0, 7) === monthKey) joined = num(g.new_users); });

      $('#kpis').html(
        kpi('Upcoming events', num(ev.upcoming_events), newEvents + ' added in the last 7 days', newEvents > 0) +
        kpi('Registrations', num(stats.registrations && stats.registrations.total_registrations), '+' + newRegs + ' in the last 7 days', newRegs > 0) +
        kpi('Active users', num(u.active_users), '+' + joined + ' joined this month', joined > 0) +
        kpi('Feedback', num(stats.feedbacks && stats.feedbacks.total_feedback), avg == null ? 'No ratings yet' : 'Average ' + avg.toFixed(1) + ' / 5', false));

      // Registrations per week (Monday-start weeks), from each active registration's created_at.
      var weeks = [], start = weekStart(now);
      for (var i = 7; i >= 0; i--) { var w = new Date(start); w.setDate(w.getDate() - i * 7); weeks.push({ start: w, count: 0 }); }
      allRegs.forEach(function (r) { if (!r.created_at) return; var t = new Date(r.created_at);
        for (var k = weeks.length - 1; k >= 0; k--) { if (t >= weeks[k].start) { weeks[k].count++; break; } } });
      var labels = weeks.map(function (w) { return w.start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); });
      var total = weeks.reduce(function (s, w) { return s + w.count; }, 0);
      var summary = total ? total + ' active registration' + (total === 1 ? '' : 's') + ' made in the last 8 weeks.' : 'No registrations in the last 8 weeks.';
      $('#reg-summary').text(summary);
      $('#reg-table').html('<table class="data-table !min-w-0"><thead><tr><th scope="col">Week of</th><th scope="col" class="!text-right">Registrations</th></tr></thead><tbody>' +
        weeks.map(function (w, i2) { return '<tr><td>' + Ui.escape(labels[i2]) + '</td><td class="text-right tabular-nums">' + w.count + '</td></tr>'; }).join('') + '</tbody></table>');
      if (hasChart) {
        $('#ch-regs').attr('aria-label', 'Bar chart: ' + summary);
        var data = { labels: labels, datasets: [{ label: 'Registrations', data: weeks.map(function (w) { return w.count; }), backgroundColor: '#2463EB', hoverBackgroundColor: '#1B4FC2', borderRadius: 4, borderSkipped: 'bottom', maxBarThickness: 28 }] };
        if (chart) { chart.data = data; chart.update(); }
        else {
          Chart.defaults.font.family = getComputedStyle(document.body).fontFamily; Chart.defaults.color = '#4F5D6B';
          chart = new Chart(document.getElementById('ch-regs'), { type: 'bar', data: data, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#172F43', padding: 10, cornerRadius: 6, displayColors: false } },
            scales: { x: { grid: { display: false }, border: { color: '#E6E8EC' } }, y: { beginAtZero: true, grid: { color: '#E6E8EC' }, border: { display: false }, ticks: { precision: 0 } } } } });
        }
      }

      // Needs attention: real counts with a direct action each.
      var unread = Notifications.unreadCount();
      var rows = [
        [newFb, 'New feedback in the last 7 days', 'Review', 'registrations.html'],
        [drafts.announcements + drafts.promos, 'Unpublished announcements and promos', 'Publish', drafts.announcements ? 'announcements.html?filter=draft' : 'promos.html?filter=draft'],
        [unread, 'Unread notifications', 'Open', 'notifications.html']
      ];
      $('#attention').html(rows.map(function (r) {
        return '<div class="attn-row"><span class="attn-count">' + r[0] + '</span><span class="attn-label">' + r[1] + '</span><a class="text-link text-sm" href="' + r[3] + '">' + r[2] + '</a></div>';
      }).join(''));

      // Upcoming events table.
      var up = Civic.filterEvents(events, { upcomingOnly: true }).slice(0, 6);
      $('#up-table').html(up.length ? '<div class="table-shell !rounded-none !border-x-0 !border-b-0"><table class="data-table"><caption class="sr-only">Upcoming events</caption><thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Registrations</th><th scope="col">Status</th></tr></thead><tbody>' +
        up.map(function (e) {
          return '<tr><td><a class="cell-title hover:text-brand-800 hover:underline" href="registrations.html?id=' + encodeURIComponent(e.id) + '">' + Ui.escape(e.title) + '</a><span class="cell-sub">' + Ui.escape(e.location || '') + '</span></td>' +
            '<td class="whitespace-nowrap">' + Ui.escape(new Date(e.starts_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })) + '</td>' +
            '<td class="tabular-nums">' + ((perEvent[e.id] || {}).att || []).length + '</td><td>' + C.statusChip(Civic.status(e)) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="px-5 pb-5">' + C.empty('No upcoming events', 'Create an event and it will appear here with its registrations.', 'calendar') + '</div>');
    }

    function load(isRefresh) {
      var $btn = $('#dash-refresh'); if (isRefresh) Ui.setLoading($btn, true, 'Refreshing…');
      var statsReq = Api.get('/dashboard/admin'), eventsReq = Api.get('/events');
      var annReq = Api.get('/announcements', null, { silent: true }), proReq = Api.get('/promos', null, { silent: true });
      Notifications.fetch().fail(function () {});
      $.when(statsReq, eventsReq).done(function (s, e) {
        var events = e.data || [], perEvent = {};
        var calls = events.map(function (ev) {
          var d = $.Deferred();
          $.when(Api.get('/event-registrations/event/' + encodeURIComponent(ev.id) + '/attendees', null, { silent: true }), Api.get('/event-feedback/event/' + encodeURIComponent(ev.id), null, { silent: true }))
            .done(function (a, f) { perEvent[ev.id] = { att: a.data || [], fb: f.data || [] }; })
            .always(function () { d.resolve(); });
          return d.promise();
        });
        var drafts = { announcements: 0, promos: 0 };
        var dDone = $.Deferred();
        $.when(annReq, proReq).done(function (a, p) {
          drafts.announcements = (a.data || []).filter(function (x) { return x.published === false; }).length;
          drafts.promos = (p.data || []).filter(function (x) { return x.published === false; }).length;
        }).always(function () { dDone.resolve(); });
        $.when.apply($, calls.concat([dDone])).always(function () {
          render(s.data || {}, events, perEvent, drafts);
          if (isRefresh) { Ui.setLoading($btn, false); Ui.toast('Overview updated.', 'success'); }
        });
      }).fail(function (err) {
        if (isRefresh) { Ui.setLoading($btn, false); Api.toastError(err); } else fail(err);
      });
    }
    $('#dash-refresh').on('click', function () { load(true); });
    load(false);
  }

  /**
   * Personal dashboard (pages/dashboard.html) for normal users.
   * Data (all real): GET /event-registrations/my-registrations, GET /dashboard/me (feedback count),
   * GET /notifications (via the shared Notifications store, so read state matches the bell) and
   * GET /events for "Discover". Register on a card calls POST /event-registrations/register.
   */
  function userDashboard() {
    var user = Auth.getUser() || {}, first = String(user.full_name || '').split(' ')[0];
    var h = new Date().getHours(), greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    if (!boot(greeting + (first ? ', ' + first : ''), '', 'dashboard')) return;
    var today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    var umu = Civic.nextUmuganda().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    $('#main .lede').first().text(today + ' · Next Umuganda is ' + umu + ' (general observance)').show();
    App.actions('<a class="btn btn-primary btn-sm" href="events.html">Explore events</a>');

    put('<div id="ud-stats" class="stat-strip" aria-live="polite">' + ['Upcoming', 'Past events', 'Feedback given', 'Unread updates'].map(function (l) { return '<div><span class="ss-label">' + l + '</span><span class="ss-value"><span class="skeleton inline-block h-6 w-8"></span></span></div>'; }).join('') + '</div>' +
      '<div class="mt-6 grid gap-6 lg:grid-cols-5">' +
        '<section class="card panel lg:col-span-3" aria-labelledby="ud-up"><div class="panel-head"><h2 id="ud-up">Your upcoming events</h2><a class="text-link text-sm" href="my-registrations.html">View all</a></div><ul id="ud-upcoming" class="event-rows">' + Ui.skeletonRows(3) + '</ul></section>' +
        '<section class="card panel lg:col-span-2" aria-labelledby="ud-updates"><div class="panel-head"><h2 id="ud-updates">Updates</h2><button type="button" id="ud-markall" class="text-link text-sm" hidden>Mark all read</button></div><ul id="ud-notes" class="space-y-1">' + Ui.skeletonRows(3) + '</ul></section>' +
      '</div>' +
      '<section class="mt-10" aria-labelledby="ud-disc"><div class="section-heading"><h2 id="ud-disc" class="!text-xl">Discover events</h2><a class="text-link text-sm" href="events.html">Browse all</a></div><div id="ud-discover" class="card-grid">' + Ui.skeletonCards(3) + '</div></section>');

    var regs = [], events = [];
    function stat(i, v) { $('#ud-stats .ss-value').eq(i).text(v); }

    function renderNotes() {
      var items = Notifications.list().slice(0, 3);
      $('#ud-markall').prop('hidden', !Notifications.unreadCount());
      stat(3, Notifications.unreadCount());
      $('#ud-notes').html(items.length ? items.map(function (n) {
        var unread = !Notifications.isRead(n.id), link = Notifications.resourceLink(n);
        return '<li><a class="note-row" href="' + (link ? link.href : 'notifications.html') + '" data-note="' + Ui.escape(n.id) + '">' +
          '<span class="note-dot' + (unread ? ' is-unread' : '') + '" aria-hidden="true"></span>' +
          '<span class="min-w-0"><span class="block text-sm ' + (unread ? 'font-semibold' : '') + '">' + Ui.escape(n.title) + (unread ? '<span class="sr-only"> (unread)</span>' : '') + '</span>' +
          '<span class="block text-xs text-muted">' + Ui.escape(Ui.timeAgo(n.created_at)) + '</span></span></a></li>';
      }).join('') : '<li class="py-4 text-sm text-muted">No updates yet.</li>');
    }
    function renderUpcoming() {
      var mine = regs.filter(function (r) { return r.status === 'registered'; }).map(function (r) {
        return { id: r.event_id, title: r.title, starts_at: r.starts_at, ends_at: r.ends_at, location: r.location };
      });
      var upcoming = Civic.filterEvents(mine, { upcomingOnly: true }), past = mine.length - upcoming.length;
      stat(0, upcoming.length); stat(1, past);
      $('#ud-upcoming').html(upcoming.length ? upcoming.slice(0, 4).map(function (e) { return C.eventRow(e, { registration: 'registered' }); }).join('')
        : '<li>' + C.empty('No upcoming registrations', 'Register for an event and it will show up here.', 'calendar') + '</li>');
    }
    function renderDiscover() {
      var registered = {}; regs.forEach(function (r) { registered[String(r.event_id)] = r.status; });
      // Events you haven't registered for (cancelled ones can't be re-registered, so they're skipped too).
      var list = Civic.filterEvents(events.filter(function (e) { return e.published !== false && !registered[String(e.id)]; }), { upcomingOnly: true }).slice(0, 3);
      $('#ud-discover').html(list.length ? list.map(function (e) { return C.eventCard(e, false); }).join('') : C.empty('You\'re registered for everything coming up', 'New events will appear here.', 'calendar'));
    }

    function load() {
      var regsReq = Api.get('/event-registrations/my-registrations').done(function (r) { regs = r.data || []; renderUpcoming(); })
        .fail(function (err) { $('#ud-upcoming').empty().append($('<li>').append(Ui.errorState({ title: 'Couldn\'t load your registrations', message: err.message, onRetry: load }))); });
      Api.get('/dashboard/me', null, { silent: true }).done(function (r) { var d = r.data || {}; stat(2, parseInt(d.feedbacks && d.feedbacks.total_feedbacks, 10) || 0); })
        .fail(function () { stat(2, '—'); });
      Notifications.fetch().done(renderNotes).fail(function () { $('#ud-notes').html('<li class="py-4 text-sm text-muted">Updates could not be loaded.</li>'); stat(3, '—'); });
      var evReq = Api.get('/events', null, { cache: true }).done(function (r) { events = r.data || []; });
      $.when(regsReq, evReq).done(renderDiscover).fail(function (err) { $('#ud-discover').empty().append(Ui.errorState({ title: 'Couldn\'t load events', message: err.message, onRetry: load })); });
    }

    $('#ud-markall').on('click', function () { Notifications.markRead(Notifications.list().map(function (n) { return n.id; })); renderNotes(); });
    $('#ud-notes').on('click', '[data-note]', function () { Notifications.markRead($(this).attr('data-note')); });
    // Cards register through the shared handler in components.js; refresh the lists afterwards.
    $(document).on('ce:registered', function () { load(); });

    load();
  }

  App.register({
    // ROLE GUARD: admin/dashboard.html (admins only, Layout GUARD 2) gets the admin dashboard;
    // pages/dashboard.html (any signed-in user) gets the personal dashboard.
    'dashboard': function () { return admin ? dashboard() : userDashboard(); }
  });
})(window, jQuery);
