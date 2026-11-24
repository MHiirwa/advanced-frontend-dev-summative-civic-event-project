/**
 * features/promos.js — promos list and detail (video with WebVTT captions + transcript).
 * ROLE GUARD (UX only): normal users only see published promos; on admin/ pages (admin)
 * cards also show status and Edit/Delete/Publish controls.
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  var showList = App.showList, queryBar = App.queryBar, filterCards = App.filterCards, mediaDetail = App.mediaDetail;
  // ROLE GUARD (UX only): showList hides unpublished promos unless this is an admin/ page;
  // C.promoCard(p, admin) adds status + Edit/Delete/Publish only for admins.
  function promos() {
    showList('promos', '/promos', function (items) {
      function render() {
        var q = $('#filter').val().trim().toLowerCase(), old = $('#sort').val() === 'old';
        var list = items.filter(function (x) { return !q || [x.title, x.description, x.caption_text].join(' ').toLowerCase().indexOf(q) !== -1; })
          .sort(function (a, b) { return (new Date(b.created_at) - new Date(a.created_at)) * (old ? -1 : 1); });
        $('#list').html(list.length ? '<div class="card-grid">' + list.map(C.promoCard).join('') + '</div>' : (items.length ? C.empty('Nothing matches', 'Try another word.', 'search') : C.empty('No promos yet', 'Short videos with English captions will appear here.', 'video')));
      }
      put('<div class="toolbar-row"><label class="sr-only" for="filter">Search</label><input id="filter" class="input max-w-sm" type="search" placeholder="Search promos…">' +
        '<label class="sr-only" for="sort">Sort</label><select id="sort" class="input !w-auto"><option value="new">Newest first</option><option value="old">Oldest first</option></select></div>' + '<div id="list"></div>');
      $('#filter').on('input', Ui.debounce(render, 150)); $('#sort').on('change', render);
      render();
    }, 'Promos', 'Short videos with English captions.', 'promos');
  }
  /* Promo detail: native video controls (play/pause, volume, fullscreen) + English captions
   * from caption_text via a WebVTT Blob URL (see C.captionsUrl), and the same words as a transcript.
   * Timed subtitles (SRT/VTT) keep their timings. Plain text starts as one cue and, once the video's
   * duration is known, is replaced by timed caption lines spread across the video. */
  var captionBlobUrl = null, captionText = '';
  function promoDetail() {
    mediaDetail('promos', 'Promo', function (p, isAdmin, H2) {
      if (captionBlobUrl) URL.revokeObjectURL(captionBlobUrl);
      captionText = p.caption_text || '';
      captionBlobUrl = C.captionsUrl(captionText);
      var url = Ui.escape(p.video_url || '');
      return '<article class="card overflow-hidden">' +
        // preload="metadata": only the header (size/duration/first frame) loads until the user presses play.
        '<video id="promo-video" class="aspect-video w-full bg-black" controls playsinline preload="metadata" src="' + url + '"' + (captionBlobUrl ? ' aria-describedby="promo-transcript-title"' : '') + '>' +
          (captionBlobUrl ? '<track kind="captions" srclang="en" label="English" src="' + captionBlobUrl + '" default>' : '') +
          '<p class="p-4 text-white">Your browser cannot play this video. <a class="underline" href="' + url + '" download>Download the video</a>.</p>' +
        '</video>' +
        '<p id="promo-video-error" class="hidden bg-red-50 px-6 py-3 text-sm text-red-800" role="alert">This video could not be played. <a class="underline" href="' + url + '" download>Download it</a> instead.</p>' +
        '<div class="p-6">' +
          // ROLE GUARD (UX only): only admins see the Published/Unpublished status (users never see drafts).
          (isAdmin ? '<p class="mb-3">' + C.status(p.published) + '</p>' : '') +
          '<h2 class="' + H2 + '">About this promo</h2>' +
          '<p class="mt-2 whitespace-pre-line leading-relaxed">' + Ui.escape(p.description || 'No description provided.') + '</p>' +
          '<section class="mt-6 border-t border-line pt-6" aria-labelledby="promo-transcript-title"><h2 id="promo-transcript-title" class="' + H2 + '">Transcript</h2>' +
            '<p class="mt-2 whitespace-pre-line leading-relaxed">' + Ui.escape(C.captionTranscript(p.caption_text) || 'No captions or transcript were provided for this promo.') + '</p></section>' +
        '</div>' +
      '</article>';
    });
    // Make sure captions are visible even if a browser ignores `default`; show an error if the file can't play.
    // loadedmetadata normally carries the duration; some files (e.g. browser-recorded WebM/MKV) only
    // report it later through durationchange, so both events can trigger the one-time swap.
    function onMedia(e) {
      var video = e.target;
      if (video.id !== 'promo-video') return;
      // Plain-text captions: now that the duration is known, swap in a track with timed lines (once).
      if (captionText && !video.dataset.timedCaptions && !C.isTimedCaptions(captionText) && isFinite(video.duration) && video.duration > 0) {
        video.dataset.timedCaptions = '1';
        var timedUrl = C.captionsUrl(captionText, video.duration), old = video.querySelector('track');
        if (timedUrl && old) {
          var track = document.createElement('track');
          track.kind = 'captions'; track.srclang = 'en'; track.label = 'English'; track.src = timedUrl; track.default = true;
          old.replaceWith(track);
          if (captionBlobUrl) URL.revokeObjectURL(captionBlobUrl);
          captionBlobUrl = timedUrl;
        }
      }
      // Captions on by default, even if a browser ignores `default`.
      Array.prototype.forEach.call(video.textTracks, function (t, i) { t.mode = i === video.textTracks.length - 1 ? 'showing' : 'disabled'; });
    }
    document.addEventListener('loadedmetadata', onMedia, true);
    document.addEventListener('durationchange', onMedia, true);
    document.addEventListener('error', function (e) {
      if (e.target.id === 'promo-video') $('#promo-video-error').removeClass('hidden');
    }, true);
    window.addEventListener('pagehide', function () { if (captionBlobUrl) URL.revokeObjectURL(captionBlobUrl); });
  }

  App.register({
    'promos': promos,
    'promo-details': promoDetail
  });
})(window, jQuery);
