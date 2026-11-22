/**
 * features/registrations.js — "My registrations" and "My feedback" (normal users) and the
 * admin "Registrations & feedback" page.
 * ROLE GUARDS: my-registrations/my-feedback are user pages (any signed-in user). The admin
 * page lives in admin/ (data-access="admin"), so boot() blocks normal users; its endpoints
 * (attendees, all feedback for an event) are admin-only in the API too.
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  // Any signed-in user: their own registrations (GET /event-registrations/my-registrations).
  function registrations() {
    if (!boot('My registrations', '', 'my-registrations')) return;
    App.actions('<a class="btn btn-primary btn-sm" href="events.html">Explore events</a>');
    var rows = [], tab = 'upcoming';
    function group(x) { return x.status === 'cancelled' ? 'cancelled' : Civic.status({ starts_at: x.starts_at, ends_at: x.ends_at }) === 'completed' ? 'past' : 'upcoming'; }
    function render() {
      var counts = { upcoming: 0, past: 0, cancelled: 0 }; rows.forEach(function (x) { counts[group(x)]++; });
      $('#reg-tabs').html(['upcoming', 'past', 'cancelled'].map(function (t) {
        return '<button type="button" role="tab" class="seg' + (t === tab ? ' is-on' : '') + '" aria-selected="' + (t === tab) + '" data-tab="' + t + '">' + t.charAt(0).toUpperCase() + t.slice(1) + ' <span class="seg-count">' + counts[t] + '</span></button>';
      }).join(''));
      var list = rows.filter(function (x) { return group(x) === tab; }).sort(function (a, b) { return (new Date(a.starts_at) - new Date(b.starts_at)) * (tab === 'upcoming' ? 1 : -1); });
      $('#reg-list').html(list.length ? '<ul class="card event-rows px-4">' + list.map(function (x) {
        var d = x.starts_at ? new Date(x.starts_at) : null;
        return '<li class="reg-row">' +
          (d ? '<time class="date-stack" datetime="' + Ui.escape(x.starts_at) + '"><span class="ds-month">' + d.toLocaleDateString(undefined, { month: 'short' }) + '</span><span class="ds-day">' + d.getDate() + '</span></time>' : '<span class="date-stack"><span class="ds-month">TBA</span></span>') +
          '<span class="min-w-0 flex-1"><a class="er-title hover:text-brand-800 hover:underline" href="event-details.html?id=' + encodeURIComponent(x.event_id) + '">' + Ui.escape(x.title) + '</a>' +
          '<span class="er-meta">' + Ui.escape(d ? d.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Date to be announced') + ' · ' + Ui.escape(x.location || '') + '</span></span>' +
          (tab === 'upcoming' ? C.statusChip('registered') + '<button type="button" class="btn btn-ghost btn-sm text-red-700 cancel-registration" data-id="' + Ui.escape(x.event_id) + '" aria-label="Cancel registration for ' + Ui.escape(x.title) + '">Cancel</button>'
            : tab === 'past' ? C.chip('Completed', 'muted') + '<a class="btn btn-ghost btn-sm" href="event-details.html?id=' + encodeURIComponent(x.event_id) + '#feedback-box">Give feedback</a>'
            : C.chip('Cancelled', 'muted')) +
        '</li>';
      }).join('') + '</ul>'
        : C.empty(tab === 'upcoming' ? 'No upcoming registrations' : tab === 'past' ? 'No past events yet' : 'No cancelled registrations', tab === 'upcoming' ? 'Find an event and reserve your place.' : '', 'calendar'));
    }
    function load() {
      put('<div id="reg-tabs" class="seg-group" role="tablist" aria-label="Registrations"></div><div id="reg-list" class="mt-4">' + Ui.skeletonRows(3) + '</div>');
      Api.get('/event-registrations/my-registrations').done(function (r) { rows = r.data || []; render(); }).fail(fail);
    }
    $('#page-content').on('click', '[data-tab]', function () { tab = $(this).attr('data-tab'); render(); $('[data-tab="' + tab + '"]').trigger('focus'); });
    $('#page-content').on('click', '.cancel-registration', function () {
      var id = $(this).attr('data-id'), $b = $(this);
      Ui.confirm({ title: 'Cancel this registration?', message: 'You will not be able to register for this event again afterwards.', confirmText: 'Cancel registration', danger: true }).then(function (ok) {
        if (!ok) return;
        Ui.setLoading($b, true, 'Cancelling…');
        Api.post('/event-registrations/cancel', { event_id: id }).done(function () { Ui.toast('Registration cancelled.', 'success'); load(); })
          .fail(function (err) { Ui.setLoading($b, false); Api.toastError(err); });
      });
    });
    load();
  }

  // Any signed-in user: only their own feedback; the API has no per-event feedback list for users.
  function feedback() {
    if (!boot('My feedback', 'Ratings and comments you have left on events.', 'my-feedback')) return;
    put('<div class="card">' + Ui.skeletonRows(3) + '</div>');
    Api.get('/event-feedback/my-feedback').done(function (r) {
      var rows = (r.data || []).slice().sort(function (a, b) { return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at); });
      put(rows.length ? '<ul class="card divide-y divide-line">' + rows.map(function (x) {
        return '<li class="p-4"><div class="flex flex-wrap items-center justify-between gap-2"><a class="font-semibold hover:text-brand-800 hover:underline" href="event-details.html?id=' + encodeURIComponent(x.event_id) + '">' + Ui.escape(x.title) + '</a>' + C.stars(x.rating) + '</div>' +
          '<p class="mt-1 whitespace-pre-line text-sm">' + Ui.escape(x.comment || 'No comment.') + '</p>' +
          '<p class="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted"><span>' + Ui.escape(Ui.timeAgo(x.updated_at || x.created_at)) + '</span><a class="text-link" href="event-details.html?id=' + encodeURIComponent(x.event_id) + '#feedback-box">Edit</a></p></li>';
      }).join('') + '</ul>' : C.empty('No feedback yet', 'After an event, share what you thought from its page.', 'star'));
    }).fail(fail);
  }

  // ROLE GUARD: admin/registrations.html only (data-access="admin", Layout GUARD 2). The attendees
  // and per-event feedback endpoints are admin-only, so normal users could not load this anyway.
  function adminRegistrations() {
    var id = new URLSearchParams(location.search).get('id');
    return id ? registrationDetail(id) : registrationOverview();
  }

  function avgOf(feedback) {
    return feedback.length ? feedback.reduce(function (s, f) { return s + Number(f.rating || 0); }, 0) / feedback.length : null;
  }

  /** Overview: every event with registrant + feedback counts (admin-only endpoints, 2 calls per event). */
  function registrationOverview() {
    if (!boot('Registrations & feedback', 'Attendance and ratings for every event.', 'registrations')) return;
    put('<div class="toolbar-row"><label class="sr-only" for="r-q">Search events</label><input id="r-q" class="input max-w-xs" type="search" placeholder="Search events…">' +
      '<label class="sr-only" for="r-when">When</label><select id="r-when" class="input !w-auto"><option value="">All events</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option></select></div>' +
      '<div id="r-table">' + Ui.skeletonRows(4) + '</div>');
    var events = [];
    function render() {
      var q = $('#r-q').val().trim().toLowerCase(), when = $('#r-when').val();
      var list = events.filter(function (e) {
        if (q && (e.title + ' ' + (e.location || '')).toLowerCase().indexOf(q) === -1) return false;
        var st = Civic.status(e);
        if (when === 'upcoming' && st === 'completed') return false;
        if (when === 'completed' && st !== 'completed') return false;
        return true;
      }).sort(function (a, b) { return new Date(b.starts_at || 0) - new Date(a.starts_at || 0); });
      $('#r-table').html(list.length ? '<div class="table-shell"><table class="data-table"><caption class="sr-only">Registrations and feedback per event</caption><thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Registrants</th><th scope="col">Feedback</th><th scope="col">Avg rating</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        list.map(function (e) {
          return '<tr><td><span class="cell-title">' + Ui.escape(e.title) + '</span><span class="cell-sub">' + Ui.escape(e.location || '') + '</span></td>' +
            '<td class="whitespace-nowrap">' + Ui.escape(Ui.formatDate(e.starts_at) || 'TBA') + '</td>' +
            '<td class="tabular-nums" data-att="' + Ui.escape(e.id) + '"><span class="skeleton inline-block h-4 w-6"></span></td>' +
            '<td class="tabular-nums" data-fb="' + Ui.escape(e.id) + '"><span class="skeleton inline-block h-4 w-6"></span></td>' +
            '<td data-avg="' + Ui.escape(e.id) + '"><span class="skeleton inline-block h-4 w-10"></span></td>' +
            '<td><div class="row-actions"><a class="btn btn-secondary btn-sm" href="registrations.html?id=' + encodeURIComponent(e.id) + '">View</a></div></td></tr>';
        }).join('') + '</tbody></table></div>'
        : C.empty(events.length ? 'No events match' : 'No events yet', events.length ? 'Try another search or time filter.' : 'Registrations appear here once events exist.', 'calendar'));
      list.forEach(fillCounts);
    }
    var counts = {};
    function fillCounts(e) {
      var key = String(e.id);
      function paint() {
        var c = counts[key]; if (!c || c.pending) return;
        $('[data-att="' + key + '"]').text(c.att == null ? '—' : c.att);
        $('[data-fb="' + key + '"]').text(c.fb == null ? '—' : c.fb.length);
        $('[data-avg="' + key + '"]').html(c.fb && c.fb.length ? C.stars(avgOf(c.fb)) + ' <span class="ml-1 text-sm tabular-nums">' + avgOf(c.fb).toFixed(1) + '</span>' : '<span class="text-muted">—</span>');
      }
      if (counts[key]) return paint();
      counts[key] = { pending: true };
      $.when(Api.get('/event-registrations/event/' + encodeURIComponent(key) + '/attendees', null, { silent: true }), Api.get('/event-feedback/event/' + encodeURIComponent(key), null, { silent: true }))
        .done(function (a, f) { counts[key] = { att: (a.data || []).length, fb: f.data || [] }; paint(); })
        .fail(function () { counts[key] = { att: null, fb: null }; paint(); });
    }
    function load() {
      $('#r-table').html(Ui.skeletonRows(4));
      Api.get('/events').done(function (r) { events = r.data || []; render(); })
        .fail(function (err) { $('#r-table').empty().append(Ui.errorState({ title: 'Couldn\'t load events', message: err.message, onRetry: load })); });
    }
    $('#r-q').on('input', Ui.debounce(render, 150)); $('#r-when').on('change', render);
    load();
  }

  /** One event: attendee list + every feedback entry and the computed average. */
  function registrationDetail(id) {
    if (!boot('Registrations & feedback', '', 'registrations')) return;
    var back = '<a class="back-link mb-4" href="registrations.html">' + Ui.icon('back', 'w-4 h-4') + 'All events</a>';
    function load() {
      put(back + '<div class="card panel">' + Ui.skeletonRows(4) + '</div>');
      $.when(Api.get('/events/' + encodeURIComponent(id)), Api.get('/event-registrations/event/' + encodeURIComponent(id) + '/attendees'), Api.get('/event-feedback/event/' + encodeURIComponent(id)))
        .done(function (evRes, attRes, fbRes) {
          var ev = evRes.data || {}, attendees = attRes.data || [], feedback = fbRes.data || [], avg = avgOf(feedback);
          $('main h1').first().text(ev.title || 'Registrations & feedback');
          put(back +
            '<p class="mb-4 text-sm text-muted">' + Ui.escape(Ui.formatDateTime(ev.starts_at) || 'Date to be announced') + ' · ' + Ui.escape(ev.location || 'Location to be announced') +
              ' · <a class="text-link" href="../pages/event-details.html?id=' + encodeURIComponent(id) + '">Public page</a></p>' +
            '<div class="kpi-grid !grid-cols-1 sm:!grid-cols-3">' +
              '<div class="card kpi"><span class="kpi-icon tone-green">' + Ui.icon('userCheck', 'w-6 h-6') + '</span><span><span class="kpi-value">' + attendees.length + '</span><span class="kpi-label">Registrants</span></span></div>' +
              '<div class="card kpi"><span class="kpi-icon tone-blue">' + Ui.icon('inbox', 'w-6 h-6') + '</span><span><span class="kpi-value">' + feedback.length + '</span><span class="kpi-label">Feedback entries</span></span></div>' +
              '<div class="card kpi"><span class="kpi-icon tone-coral">' + Ui.icon('star', 'w-6 h-6') + '</span><span><span class="kpi-value">' + (avg == null ? '—' : avg.toFixed(1) + ' / 5') + '</span><span class="kpi-label">Average rating</span></span></div>' +
            '</div>' +
            '<section class="card panel mt-6" aria-labelledby="att-title"><div class="panel-head"><h2 id="att-title">Registrants</h2></div>' +
              (attendees.length ? '<div class="table-shell"><table class="data-table"><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Registered</th></tr></thead><tbody>' +
                attendees.map(function (a) { return '<tr><td class="cell-title">' + Ui.escape(a.full_name) + '</td><td>' + Ui.escape(a.email) + '</td><td class="whitespace-nowrap text-muted">' + Ui.escape(Ui.formatDateTime(a.created_at)) + '</td></tr>'; }).join('') + '</tbody></table></div>'
                : C.empty('No registrants yet', 'Active registrations will appear here.', 'users')) + '</section>' +
            '<section class="card panel mt-6" aria-labelledby="fb-title"><div class="panel-head"><h2 id="fb-title">Feedback</h2></div>' +
              (feedback.length ? '<ul class="media-list">' + feedback.map(function (f) {
                return '<li class="py-3"><div class="flex flex-wrap items-center justify-between gap-2"><strong>' + Ui.escape(f.full_name) + '</strong>' + C.stars(f.rating) + '</div>' +
                  '<p class="mt-1 whitespace-pre-line text-sm">' + Ui.escape(f.comment || 'No comment.') + '</p><p class="mt-1 text-xs text-muted">' + Ui.escape(Ui.timeAgo(f.created_at)) + '</p></li>';
              }).join('') + '</ul>' : C.empty('No feedback yet', 'Ratings and comments from attendees will appear here.', 'star')) + '</section>');
        }).fail(function (err) { $('#page-content').html(back).append(Ui.errorState({ title: 'Couldn\'t load this event', message: err.message, onRetry: load })); });
    }
    load();
  }

  App.register({
    'my-registrations': registrations,
    'my-feedback': feedback,
    'registrations': adminRegistrations
  });
})(window, jQuery);
