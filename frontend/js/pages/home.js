/**
 * home.js — public home page (index.html).
 *  - Shared header/footer via Layout.init({ access: 'public' }): guests see Log in / Sign up,
 *    signed-in users see the normal app header.
 *  - Split hero (Kigali photo), the next general Umuganda date (calendar rule, not an event),
 *    two community tiles (local photos) and, for signed-in users only, the next three real events.
 *    Every content endpoint requires a login, so guests are not shown placeholder events.
 */
(function (window, $) {
  'use strict';
  var C = window.Components;
  if (!Layout.init({ access: 'public', active: 'home' })) return;
  var signedIn = Auth.isLoggedIn();

  // ROLE GUARD (UX only): guests get a sign-up action next to Explore; signed-in users don't need it.
  if (!signedIn) $('#hero-actions').append('<a class="btn btn-secondary" href="signup.html">Create an account</a>');

  var next = Civic.nextUmuganda();
  $('#umuganda-note').html('<span class="umuganda-dot" aria-hidden="true"></span><strong>Next Umuganda: ' +
    Ui.escape(next.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) +
    '</strong><span class="text-muted">· confirm with your local sector</span>');

  $('#community-tiles').html(Object.keys(Civic.COMMUNITIES).map(function (k) {
    var c = Civic.COMMUNITIES[k];
    return '<a class="community-tile card" href="' + c.href + '">' +
      '<img src="' + c.image + '" alt="' + Ui.escape(c.alt) + '" loading="lazy" width="240" height="160">' +
      '<span class="community-tile-body"><span class="community-tile-title">' + Ui.escape(c.title) + '</span>' +
      '<span class="community-tile-text">' + Ui.escape(c.short) + '</span></span>' +
      '<span class="community-tile-arrow" aria-hidden="true">' + Ui.icon('arrowRight', 'w-5 h-5') + '</span></a>';
  }).join(''));

  if (!signedIn) return;
  $('#upcoming-section').prop('hidden', false);
  function loadUpcoming() {
    var $t = $('#upcoming-events').html('<li>' + Ui.skeletonRows(3) + '</li>');
    $.when(Api.get('/events', null, { cache: true }), window.App ? window.App.myRegistrations() : $.Deferred().resolve({})).done(function (r, regs) {
      var items = Civic.filterEvents((r.data || []).filter(function (e) { return e.published !== false; }), { upcomingOnly: true }).slice(0, 3);
      $t.html(items.length ? items.map(function (e) { return C.eventRow(e, { registration: (regs || {})[String(e.id)] }); }).join('')
        : '<li>' + C.empty('No upcoming events yet', 'Published events will appear here.', 'calendar') + '</li>');
    }).fail(function (err) {
      $t.empty().append($('<li>').append(Ui.errorState({ title: 'Couldn\'t load events', message: err.message, onRetry: loadUpcoming })));
    });
  }
  loadUpcoming();
})(window, jQuery);
