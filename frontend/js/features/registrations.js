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
    if (!boot('My registrations', 'Keep track of the events you have joined.', 'my-registrations')) return;
    put(C.loading());
    Api.get('/event-registrations/my-registrations').done(function (r) {
      var rows = r.data || [];
      put(rows.length ? '<div class="stack-list">' + rows.map(function (x) {
        return '<article class="card list-row"><div><h2>' + Ui.escape(x.title) + '</h2><p class="muted">' + Ui.escape(Ui.formatDateTime(x.starts_at)) + ' · ' + Ui.escape(x.location) + '</p><span class="status ' + (x.status === 'cancelled' ? 'status-draft' : 'status-live') + '">' + Ui.escape(x.status) + '</span></div>' + (x.status !== 'cancelled' ? '<button class="btn btn-secondary btn-small cancel-registration" data-id="' + x.event_id + '">Cancel</button>' : '') + '</article>';
      }).join('') + '</div>' : C.empty('No registrations yet', 'Find an event and reserve your place.'));
      $('.cancel-registration').on('click', function () {
        var id = $(this).data('id');
        if (!window.confirm('Cancel this registration?')) return;
        Api.post('/event-registrations/cancel', { event_id: id }).done(function () {
          Ui.toast('Registration cancelled.', 'success');
          registrations();
        }).fail(Api.toastError);
      });
    }).fail(fail);
  }
  // Any signed-in user: only their own feedback; the API has no per-event feedback list for users.
  function feedback() { if (!boot('My feedback', 'Review the feedback you have shared with the community.', 'my-feedback')) return; put(C.loading()); Api.get('/event-feedback/my-feedback').done(function (r) { var rows = r.data || []; put(rows.length ? '<div class="stack-list">' + rows.map(function (x) { return '<article class="card list-row"><div><h2>' + Ui.escape(x.title) + '</h2><p class="stars">' + '★'.repeat(Number(x.rating || 0)) + '</p><p>' + Ui.escape(x.comment || 'No comment') + '</p></div></article>'; }).join('') + '</div>' : C.empty('No feedback yet', 'After an event, share what you thought.')); }).fail(fail); }
  // ROLE GUARD: admin/registrations.html only (data-access="admin", Layout GUARD 2). The attendees
  // and per-event feedback endpoints are admin-only, so normal users could not load this anyway.
  function adminRegistrations() {
    if (!boot('Event registrations & feedback', 'Inspect attendees and feedback for individual events.', 'registrations')) return;
    put(C.loading());
    Api.get('/events').done(function (res) {
      var events = res.data || [];
      put('<label class="label" for="event-select">Choose event</label><select class="input" id="event-select"><option value="">Select an event</option>' + events.map(function (e) { return '<option value="' + e.id + '">' + Ui.escape(e.title) + '</option>'; }).join('') + '</select><div id="event-review" class="mt-6"></div>');
      $('#event-select').on('change', function () {
        var id = $(this).val();
        if (!id) { $('#event-review').empty(); return; }
        $('#event-review').html(C.loading());
        $.when(Api.get('/event-registrations/event/' + encodeURIComponent(id) + '/attendees'), Api.get('/event-feedback/event/' + encodeURIComponent(id)))
          .done(function (attendeeRes, feedbackRes) {
            var attendees = attendeeRes.data || [], feedback = feedbackRes.data || [];
            var average = feedback.length ? (feedback.reduce(function (sum, f) { return sum + Number(f.rating || 0); }, 0) / feedback.length).toFixed(1) : 'No ratings';
            $('#event-review').html(
              '<div class="stat-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))"><article class="stat-card card"><p class="muted">Attendees</p><strong>' + attendees.length + '</strong></article><article class="stat-card card"><p class="muted">Feedback entries</p><strong>' + feedback.length + '</strong></article><article class="stat-card card"><p class="muted">Average rating</p><strong>' + average + '</strong></article></div>' +
              '<h2 class="mt-6">Attendees</h2>' + (attendees.length ? C.table(['Name','Email','Status'], attendees.map(function (a) { return '<tr><td>' + Ui.escape(a.full_name) + '</td><td>' + Ui.escape(a.email) + '</td><td>' + Ui.escape(a.status) + '</td></tr>'; }).join('')) : C.empty('No active attendees','This event has no registered attendees.')) +
              '<h2 class="mt-6">Feedback</h2>' + (feedback.length ? C.table(['Name','Rating','Comment'], feedback.map(function (f) { return '<tr><td>' + Ui.escape(f.full_name) + '</td><td>' + Ui.escape(f.rating) + '</td><td>' + Ui.escape(f.comment || '') + '</td></tr>'; }).join('')) : C.empty('No feedback yet','No user has submitted feedback for this event.'))
            );
          }).fail(fail);
      });
    }).fail(fail);
  }

  App.register({
    'my-registrations': registrations,
    'my-feedback': feedback,
    'registrations': adminRegistrations
  });
})(window, jQuery);
