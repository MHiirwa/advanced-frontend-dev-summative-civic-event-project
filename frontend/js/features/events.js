/**
 * features/events.js — events list (search, date/location filters, pagination) and event detail.
 * ROLE GUARDS (UX only, the API enforces roles):
 *  - List: normal users only see published events; admins on admin/ pages see all.
 *  - Detail: normal users get registration + their own feedback; admins get registrants,
 *    all feedback and the average rating (admin-only endpoints).
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  var showList = App.showList, queryBar = App.queryBar, filterCards = App.filterCards;
  var EVENTS_PER_PAGE = 9;
  /**
   * Events list: search, community, date range, location, past events, sort, pagination.
   * Filtering is client-side via the shared Civic.filterEvents (the API has no query
   * parameters). Filter state is mirrored in the URL (?q=&community=&from=&to=&loc=&past=&sort=&page=)
   * so links from the community pages, the back button and shared links keep the same view.
   */
  function events() {
    showList('events', '/events', function (items) {
      var params = new URLSearchParams(location.search);
      var locations = items.map(function (e) { return (e.location || '').trim(); }).filter(function (l, i, a) { return l && a.indexOf(l) === i; }).sort();
      var communityOpts = Object.keys(Civic.COMMUNITIES).map(function (k) { return '<option value="' + k + '">' + Ui.escape(Civic.COMMUNITIES[k].title) + '</option>'; }).join('');
      // ROLE GUARD (UX only): admins get a shortcut to create an event; the page itself is for every signed-in user.
      if (Auth.isAdmin()) App.actions('<a class="btn btn-primary btn-sm" href="../admin/create-event.html">' + Ui.icon('plus', 'w-4 h-4') + 'Create event</a>');
      // Mobile-first: on phones the filters sit behind a "Filters" button (with the number of active
      // filters) so the results are visible without scrolling; from 641px up they are always shown.
      put('<form id="event-filters" class="card p-4" role="search" aria-label="Filter events" novalidate>' +
          '<button type="button" id="filters-toggle" class="filters-toggle btn btn-secondary btn-sm w-full justify-between" aria-expanded="false" aria-controls="filters-body">' +
            '<span class="inline-flex items-center gap-2">' + Ui.icon('search', 'w-4 h-4') + 'Search &amp; filters</span><span id="filters-active" class="chip chip-blue" hidden></span></button>' +
          '<div id="filters-body" class="filters-body">' +
          '<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1.2fr_1fr_1fr_1.2fr]">' +
            '<div class="sm:col-span-2 lg:col-span-1"><label class="label" for="filter">Search</label><input id="filter" class="input" type="search" placeholder="Title, description or location…" value="' + Ui.escape(params.get('q') || '') + '"></div>' +
            '<div><label class="label" for="f-community">Community</label><select id="f-community" class="input"><option value="">All communities</option>' + communityOpts + '</select></div>' +
            '<div><label class="label" for="f-from">From</label><input id="f-from" class="input" type="date" value="' + Ui.escape(params.get('from') || '') + '"></div>' +
            '<div data-field><label class="label" for="f-to">To</label><input id="f-to" class="input" type="date" value="' + Ui.escape(params.get('to') || '') + '"><p data-error id="f-to-error" class="field-error hidden"></p></div>' +
            '<div><label class="label" for="f-loc">Location</label><input id="f-loc" class="input" type="text" list="loc-options" placeholder="Any location" value="' + Ui.escape(params.get('loc') || '') + '">' +
              '<datalist id="loc-options">' + locations.map(function (l) { return '<option value="' + Ui.escape(l) + '">'; }).join('') + '</datalist></div>' +
          '</div>' +
          '<div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">' +
            '<div class="flex items-center gap-2"><label class="label !mb-0" for="sort">Sort</label><select id="sort" class="input !w-auto !min-h-0 !py-1.5 text-sm"><option value="date">Event date</option><option value="new">Recently added</option></select></div>' +
            '<label class="inline-flex items-center gap-2 text-sm"><input type="checkbox" id="f-past" class="h-4 w-4"> Include past events</label>' +
            '<button type="button" id="clear-filters" class="btn btn-ghost btn-sm ml-auto">Clear filters</button>' +
          '</div>' +
          '<p id="community-note" class="mt-3 text-xs text-muted" hidden></p>' +
          '</div>' +
        '</form>' +
        '<h2 id="results-title" class="sr-only" tabindex="-1">Event results</h2>' +
        '<p id="results-count" class="mt-5 text-sm text-muted" role="status" aria-live="polite"></p>' +
        '<div id="cards" class="card-grid mt-3"></div>' +
        '<nav id="pager" class="mt-8" aria-label="Events pages"></nav>');
      if (params.get('sort')) $('#sort').val(params.get('sort'));
      if (Civic.COMMUNITIES[params.get('community')]) $('#f-community').val(params.get('community'));
      $('#f-past').prop('checked', params.get('past') === '1');
      var page = Math.max(1, parseInt(params.get('page'), 10) || 1), regs = {};

      function apply(moveFocus) {
        var community = $('#f-community').val(), past = $('#f-past').is(':checked');
        var arr = Civic.filterEvents(items, { q: $('#filter').val(), loc: $('#f-loc').val(), from: $('#f-from').val(), to: $('#f-to').val(),
          community: community, upcomingOnly: !past, sort: $('#sort').val() });
        Ui.setFieldError($('#f-to'), arr.badRange ? '"To" must be on or after "From".' : '');
        $('#community-note').prop('hidden', !community).text(community
          ? Civic.COMMUNITIES[community].title + ': events whose title, description or location mention ' + Civic.COMMUNITIES[community].keywords.slice(0, 6).join(', ') + '…'
          : '');

        var pages = Math.max(1, Math.ceil(arr.length / EVENTS_PER_PAGE));
        page = Math.min(page, pages);
        var shown = arr.slice((page - 1) * EVENTS_PER_PAGE, page * EVENTS_PER_PAGE);
        var filtered = $('#filter').val().trim() || $('#f-loc').val().trim() || $('#f-from').val() || $('#f-to').val() || community || past;
        $('#results-count').text(arr.length
          ? 'Showing ' + ((page - 1) * EVENTS_PER_PAGE + 1) + '–' + ((page - 1) * EVENTS_PER_PAGE + shown.length) + ' of ' + arr.length + ' event' + (arr.length === 1 ? '' : 's') + (pages > 1 ? ' (page ' + page + ' of ' + pages + ')' : '')
          : '');
        // ROLE GUARD (UX only): C.eventCard(e, admin) adds Edit/Delete only on admin/ pages.
        $('#cards').html(shown.length ? shown.map(function (e) { return C.eventCard(e, admin, { registration: regs[String(e.id)] }); }).join('')
          : filtered ? C.empty('No matching events', 'Try a different search, community, date range or location, or include past events.', 'search')
            : C.empty('No upcoming events', 'Published events will appear here.', 'calendar'));
        $('#pager').html(C.pagination(page, pages));
        $('#clear-filters').prop('disabled', !filtered);
        var active = [$('#filter').val().trim(), $('#f-loc').val().trim(), $('#f-from').val(), $('#f-to').val(), community, past ? '1' : ''].filter(Boolean).length;
        $('#filters-active').prop('hidden', !active).text(active + ' active');

        var p = new URLSearchParams();
        if ($('#filter').val().trim()) p.set('q', $('#filter').val().trim());
        if (community) p.set('community', community);
        if ($('#f-from').val()) p.set('from', $('#f-from').val());
        if ($('#f-to').val()) p.set('to', $('#f-to').val());
        if ($('#f-loc').val().trim()) p.set('loc', $('#f-loc').val().trim());
        if (past) p.set('past', '1');
        if ($('#sort').val() !== 'date') p.set('sort', $('#sort').val());
        if (page > 1) p.set('page', page);
        history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
        if (moveFocus) { $('#results-title').trigger('focus'); $('#results-title')[0].scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      }
      var debounced = Ui.debounce(function () { page = 1; apply(false); }, 200);
      $('#filter, #f-loc').on('input', debounced);
      $('#f-from, #f-to, #sort, #f-community, #f-past').on('change', function () { page = 1; apply(false); });
      $('#event-filters').on('submit', function (e) { e.preventDefault(); });
      function setFilters(open) { $('#filters-toggle').attr('aria-expanded', String(open)); $('#filters-body').prop('hidden', !open); }
      // Collapsed on phones unless the link already carries filters.
      setFilters(!window.matchMedia('(max-width: 640px)').matches || !!(params.get('q') || params.get('loc') || params.get('from') || params.get('to') || params.get('community') || params.get('past')));
      $('#filters-toggle').on('click', function () { var open = $(this).attr('aria-expanded') !== 'true'; setFilters(open); if (open) $('#filter').trigger('focus'); });
      $('#clear-filters').on('click', function () { $('#filter, #f-loc, #f-from, #f-to, #f-community').val(''); $('#f-past').prop('checked', false); page = 1; apply(false); $('#filter').trigger('focus'); });
      $('#pager').on('click', '[data-page]', function () { page = Number($(this).attr('data-page')); apply(true); });
      apply(false);
      // Registration chips load after the list so a slow call never blocks browsing.
      App.myRegistrations().done(function (map) { regs = map; if (!$.isEmptyObject(map)) apply(false); });
    }, 'Events', '', 'events');
  }

  /* =================================================================
   * Event detail page (pages/event-details.html?id=…)
   * Layout: image + description | when/where + registration (user),
   * then feedback (user) or registrants + feedback stats (admin).
   * ================================================================= */
  function eventDetail() {
    var id = new URLSearchParams(location.search).get('id');
    if (!boot('Event details', '', 'events')) return;
    // ROLE GUARD (UX only): the signed-in user's role picks the blocks below. Admins get registrants,
    // all feedback and the average (admin-only endpoints); users get Register/Cancel and their own feedback.
    var isAdmin = Auth.isAdmin();
    var ev = null;
    var H2 = 'font-display text-xl font-semibold text-brand-900';

    function skeleton() {
      return '<div class="sr-only" role="status">Loading event…</div><div class="grid gap-6 lg:grid-cols-3" aria-hidden="true">' +
        '<div class="card overflow-hidden lg:col-span-2"><div class="skeleton h-64 w-full rounded-none"></div><div class="space-y-3 p-6"><div class="skeleton h-6 w-1/3"></div><div class="skeleton h-4 w-full"></div><div class="skeleton h-4 w-5/6"></div><div class="skeleton h-4 w-2/3"></div></div></div>' +
        '<div class="space-y-6"><div class="card space-y-3 p-6"><div class="skeleton h-5 w-1/2"></div><div class="skeleton h-4 w-full"></div><div class="skeleton h-4 w-3/4"></div></div><div class="card p-6"><div class="skeleton h-10 w-full"></div></div></div></div>';
    }
    function back() { return '<a class="back-link inline-flex items-center gap-1" href="events.html">' + Ui.icon('back', 'w-4 h-4') + ' Back to events</a>'; }
    function showError(err, canRetry) {
      $('#page-content').html(back()).append(Ui.errorState({ title: 'Couldn\'t load this event', message: err.message, onRetry: canRetry ? load : null }));
    }
    /** Star rating that can show fractions (e.g. 4.5 = four and a half stars); the exact value is read out for screen readers. */
    function stars(n) {
      n = Math.max(0, Math.min(5, Number(n) || 0));
      var label = (Math.round(n * 10) / 10) + ' out of 5 stars';
      return '<span class="stars relative inline-block whitespace-nowrap" aria-hidden="true"><span>☆☆☆☆☆</span>' +
        '<span class="absolute inset-y-0 left-0 overflow-hidden" style="width:' + (n / 5 * 100) + '%">★★★★★</span></span><span class="sr-only">' + label + '</span>';
    }
    function when(v) { return v ? '<time datetime="' + Ui.escape(v) + '">' + Ui.escape(Ui.formatDateTime(v)) + '</time>' : 'To be announced'; }

    function load() {
      put(skeleton());
      if (!id) { showError({ message: 'No event was specified in the link.' }, false); return; }
      Api.get('/events/' + encodeURIComponent(id)).done(function (r) {
        ev = r.data;
        // ROLE GUARD (UX only): normal users may only open published events; admins can preview drafts.
        if (!ev || (!isAdmin && ev.published === false)) { showError({ message: 'This event does not exist or is not published.' }, false); return; }
        render();
      }).fail(function (err) { showError(err, true); });
    }

    function render() {
      var img = C.eventImage(ev);
      var mapUrl = ev.location ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ev.location) : null;
      $('main h1').first().text(ev.title);
      document.title = ev.title + ' · CivicEvents';
      put(back() +
        '<div class="mt-4 grid gap-6 lg:grid-cols-3">' +
          '<article class="card overflow-hidden lg:col-span-2" aria-labelledby="about-title">' +
            (img ? '<img src="' + Ui.escape(img) + '" alt="Image for ' + Ui.escape(ev.title) + '" class="h-64 w-full object-cover sm:h-80" data-fallback-date="' + Ui.escape(ev.starts_at || '') + '">'
                 : '<div class="flex h-48 items-center justify-center bg-brand-50 text-brand-700" aria-hidden="true">' + Ui.icon('calendar', 'w-12 h-12') + '</div>') +
            '<div class="p-6">' +
              // ROLE GUARD (UX only): publication status is admin information.
              (isAdmin ? '<p class="mb-3">' + C.status(ev.published !== false) + '</p>' : '') +
              '<h2 id="about-title" class="' + H2 + '">About this event</h2>' +
              '<p class="mt-3 whitespace-pre-line leading-relaxed">' + Ui.escape(ev.description || 'No description has been provided for this event.') + '</p>' +
            '</div>' +
          '</article>' +
          '<aside class="space-y-6" aria-label="Event information">' +
            '<section class="card p-6" aria-labelledby="when-title"><h2 id="when-title" class="' + H2 + '">When &amp; where</h2>' +
              '<dl class="mt-4 space-y-3 text-sm">' +
                '<div><dt class="font-semibold text-muted">Starts</dt><dd>' + when(ev.starts_at) + '</dd></div>' +
                '<div><dt class="font-semibold text-muted">Ends</dt><dd>' + when(ev.ends_at) + '</dd></div>' +
                '<div><dt class="font-semibold text-muted">Location</dt><dd>' + Ui.escape(ev.location || 'To be announced') + '</dd></div>' +
              '</dl>' +
              (mapUrl ? '<a class="btn btn-secondary btn-small mt-4 inline-flex items-center gap-1" href="' + mapUrl + '" target="_blank" rel="noopener noreferrer">' + Ui.icon('pin', 'w-4 h-4') + ' Open in Google Maps<span class="sr-only"> (opens in a new tab)</span></a>' : '') +
            '</section>' +
            // ROLE GUARD (UX only): registering is a normal-user action, so admins never get this block.
            (isAdmin ? '' : '<section id="registration-box" class="card p-6" aria-labelledby="reg-title" aria-live="polite"></section>') +
          '</aside>' +
        '</div>' +
        // ROLE GUARD (UX only): users see/edit only their own feedback; admins get the full registrants/feedback panel.
        (isAdmin
          ? '<section id="admin-panel" class="mt-8" aria-labelledby="admin-title"><h2 id="admin-title" class="' + H2 + '">Registrants &amp; feedback</h2><div id="admin-panel-body" class="mt-4">' + Ui.skeletonRows(3) + '</div></section>'
          : '<section id="feedback-box" class="card mt-8 p-6" aria-labelledby="fb-title"><h2 id="fb-title" class="' + H2 + '">Your feedback</h2>' +
              '<p class="mt-1 text-sm text-muted">One rating per event; you can edit it any time. The event\'s average rating and all reviews are shared with the organisers.</p>' +
              '<div id="feedback-body" class="mt-4">' + Ui.skeletonRows(1) + '</div></section>'));
      if (isAdmin) loadAdminPanel(); else { loadRegistration(); loadFeedback(); }
    }

    /* ---------- Registration (normal users only) ---------- */
    function loadRegistration() {
      var $box = $('#registration-box').html('<h2 id="reg-title" class="' + H2 + '">Registration</h2><div class="mt-4">' + Ui.skeletonRows(1) + '</div>');
      Api.get('/event-registrations/my-registrations').done(function (r) {
        var mine = (r.data || []).filter(function (x) { return String(x.event_id) === String(ev.id); })[0];
        renderRegistration(mine ? mine.status : null);
      }).fail(function (err) {
        $box.find('div').first().empty().append(Ui.errorState({ title: 'Couldn\'t check your registration', message: err.message, onRetry: loadRegistration }));
      });
    }
    function renderRegistration(status) {
      var body;
      if (status === 'registered') {
        body = '<p class="flex items-center gap-2 font-semibold text-brand-800">' + Ui.icon('check', 'w-5 h-5') + ' You are registered for this event.</p>' +
          '<button type="button" id="cancel-reg" class="btn btn-secondary mt-4 w-full">Cancel registration</button>';
      } else if (status === 'cancelled') {
        body = '<p class="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="note">You cancelled your registration for this event. Re-registering is not available. Contact an administrator if you need a place.</p>';
      } else {
        body = '<p class="text-sm text-muted">Reserve your place at this event.</p><button type="button" id="do-reg" class="btn btn-primary mt-4 w-full">Register</button>';
      }
      $('#registration-box').html('<h2 id="reg-title" class="' + H2 + '">Registration</h2><div class="mt-4">' + body + '</div>');
      // Optimistic UI: show "registered" straight away; if the API refuses, go back and explain.
      $('#do-reg').on('click', function () {
        renderRegistration('registered'); $('#cancel-reg').trigger('focus');
        Api.post('/event-registrations/register', { event_id: ev.id }).done(function () {
          Ui.toast('You are registered for this event.', 'success');
        }).fail(function (err) {
          if (err.status === 409) { Ui.toast('You already have a registration for this event.', 'warning'); loadRegistration(); }
          else { renderRegistration(null); $('#do-reg').trigger('focus'); Api.toastError(err); }
        });
      });
      $('#cancel-reg').on('click', function () {
        var $b = $(this);
        Ui.confirm({ title: 'Cancel registration?', message: 'You will not be able to register for this event again afterwards.', confirmText: 'Cancel registration', danger: true }).then(function (ok) {
          if (!ok) return;
          Ui.setLoading($b, true, 'Cancelling…');
          Api.post('/event-registrations/cancel', { event_id: ev.id }).done(function () {
            Ui.toast('Your registration was cancelled.', 'success'); renderRegistration('cancelled');
          }).fail(function (err) { Ui.setLoading($b, false); Api.toastError(err); });
        });
      });
    }

    /* ---------- Feedback (normal users only: one entry per event) ---------- */
    function loadFeedback() {
      $('#feedback-body').html(Ui.skeletonRows(1));
      Api.get('/event-feedback/my-feedback').done(function (r) {
        var mine = (r.data || []).filter(function (f) { return String(f.event_id) === String(ev.id); })[0];
        mine ? showMyFeedback(mine) : feedbackForm(null);
      }).fail(function (err) {
        $('#feedback-body').empty().append(Ui.errorState({ title: 'Couldn\'t load your feedback', message: err.message, onRetry: loadFeedback }));
      });
    }
    function showMyFeedback(f) {
      $('#feedback-body').html(
        '<div class="rounded-xl bg-brand-50 p-4"><p class="text-lg">' + stars(f.rating) + '</p>' +
        '<p class="mt-2 whitespace-pre-line">' + Ui.escape(f.comment || 'No comment.') + '</p>' +
        ((f.updated_at || f.created_at) ? '<p class="mt-2 text-xs text-muted">Submitted ' + Ui.escape(Ui.timeAgo(f.updated_at || f.created_at)) + '</p>' : '') + '</div>' +
        '<button type="button" id="edit-fb" class="btn btn-secondary btn-small mt-4 inline-flex items-center gap-1">' + Ui.icon('edit', 'w-4 h-4') + ' Edit feedback</button>');
      $('#edit-fb').on('click', function () { feedbackForm(f); });
    }
    function feedbackForm(existing) {
      var r = existing ? Number(existing.rating) : 0;
      $('#feedback-body').html(
        '<form id="fb-form" class="space-y-4" novalidate>' +
          '<fieldset data-field><legend class="label">Rating</legend><div class="mt-1 flex flex-wrap gap-2">' +
            [1, 2, 3, 4, 5].map(function (n) {
              return '<label class="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-brand-100 px-3 py-2 hover:bg-brand-50"><input type="radio" name="rating" value="' + n + '"' + (n === r ? ' checked' : '') + '> ' + n + ' ★</label>';
            }).join('') +
          '</div><p data-error id="rating-error" class="field-error hidden"></p></fieldset>' +
          '<div data-field><label class="label" for="fb-comment">Comment <span class="text-muted">(optional)</span></label>' +
            '<textarea id="fb-comment" class="input mt-1" rows="4" maxlength="1000" placeholder="What did you think?">' + Ui.escape(existing ? existing.comment || '' : '') + '</textarea>' +
            '<p data-error id="fb-comment-error" class="field-error hidden"></p></div>' +
          '<div class="flex flex-wrap gap-2"><button type="submit" class="btn btn-primary">' + (existing ? 'Save changes' : 'Submit feedback') + '</button>' +
          (existing ? '<button type="button" id="fb-cancel" class="btn btn-ghost">Cancel</button>' : '') + '</div>' +
        '</form>');
      $('#fb-cancel').on('click', function () { showMyFeedback(existing); });
      $('#fb-form').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this), rating = Number($form.find('input[name=rating]:checked').val()), comment = $('#fb-comment').val().trim();
        Ui.clearFieldErrors($form);
        if (!(rating >= 1 && rating <= 5)) { Ui.setFieldError($form.find('input[name=rating]').first(), 'Choose a rating from 1 to 5.'); $form.find('input[name=rating]').first().trigger('focus'); return; }
        var $btn = $form.find('[type=submit]'); Ui.setLoading($btn, true, 'Saving…');
        var req = existing
          ? Api.put('/event-feedback/' + encodeURIComponent(existing.id), { rating: rating, comment: comment })
          : Api.post('/event-feedback', { event_id: ev.id, rating: rating, comment: comment });
        req.done(function (res) {
          Ui.toast(existing ? 'Your feedback was updated.' : 'Thanks for your feedback!', 'success');
          showMyFeedback($.extend({}, existing, res.data, { rating: rating, comment: comment }));
          $('#edit-fb').trigger('focus');
        }).fail(function (err) {
          Ui.setLoading($btn, false);
          // 409 = the DB's UNIQUE(user_id, event_id): this user already left feedback (e.g. in another tab).
          if (err.status === 409) { Ui.toast('You have already left feedback for this event. You can edit it instead.', 'warning'); loadFeedback(); }
          else Api.toastError(err);
        });
      });
    }

    /* ---------- Admin panel: registrants + feedback (admin-only endpoints) ---------- */
    function loadAdminPanel() {
      $('#admin-panel-body').html(Ui.skeletonRows(3));
      $.when(Api.get('/event-registrations/event/' + encodeURIComponent(ev.id) + '/attendees'), Api.get('/event-feedback/event/' + encodeURIComponent(ev.id)))
        .done(function (attRes, fbRes) {
          var att = attRes.data || [], fb = fbRes.data || [];
          var avg = fb.length ? fb.reduce(function (s, f) { return s + Number(f.rating || 0); }, 0) / fb.length : null;
          $('#admin-panel-body').html(
            '<div class="grid gap-4 sm:grid-cols-3">' +
              '<div class="stat-card card"><p class="muted">Registrants</p><strong>' + att.length + '</strong></div>' +
              '<div class="stat-card card"><p class="muted">Feedback entries</p><strong>' + fb.length + '</strong></div>' +
              '<div class="stat-card card"><p class="muted">Average rating</p><strong>' + (avg == null ? '—' : avg.toFixed(1) + ' / 5') + '</strong>' + (avg == null ? '' : '<p class="text-lg">' + stars(avg) + '</p>') + '</div>' +
            '</div>' +
            '<h3 class="mt-8 font-display text-lg font-semibold">Registrants</h3><div class="mt-3">' +
              (att.length ? C.table(['Name', 'Email', 'Registered'], att.map(function (a) { return '<tr><td>' + Ui.escape(a.full_name) + '</td><td>' + Ui.escape(a.email) + '</td><td>' + Ui.escape(Ui.formatDateTime(a.created_at || a.registered_at)) + '</td></tr>'; }).join(''))
                          : C.empty('No registrants yet', 'Active registrations will appear here.')) + '</div>' +
            '<h3 class="mt-8 font-display text-lg font-semibold">Feedback</h3><div class="mt-3">' +
              (fb.length ? '<ul class="stack-list">' + fb.map(function (f) { return '<li class="card p-4"><div class="flex flex-wrap items-center justify-between gap-2"><strong>' + Ui.escape(f.full_name) + '</strong><span>' + stars(f.rating) + '</span></div><p class="mt-2 whitespace-pre-line">' + Ui.escape(f.comment || 'No comment.') + '</p><p class="mt-1 text-xs text-muted">' + Ui.escape(Ui.timeAgo(f.created_at)) + '</p></li>'; }).join('') + '</ul>'
                         : C.empty('No feedback yet', 'Feedback from attendees will appear here.')) + '</div>');
        }).fail(function (err) {
          $('#admin-panel-body').empty().append(Ui.errorState({ title: 'Couldn\'t load registrants and feedback', message: err.message, onRetry: loadAdminPanel }));
        });
    }

    load();
  }

  App.register({
    'events': events,
    'event-details': eventDetail
  });
})(window, jQuery);
