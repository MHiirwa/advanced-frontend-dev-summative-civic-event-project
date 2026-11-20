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
  function promos() { showList('promos', '/promos', function (items) { put(queryBar() + '<div id="cards" class="card-grid">' + (items.length ? items.map(function (p) { return C.promoCard(p, admin); }).join('') : C.empty('No promos yet', 'New community stories will appear here.')) + '</div>'); filterCards(items, function (arr) { $('#cards').html(arr.length ? arr.map(function (p) { return C.promoCard(p, admin); }).join('') : C.empty('No matching promos', 'Try a different search.')); }); }, 'Promos', 'See the initiatives and stories shaping our community.', 'promos'); }
  /* Promo detail: native video controls (play/pause, volume, fullscreen) + English captions
   * from caption_text via a WebVTT Blob URL, and the same text as a transcript. */
  var captionBlobUrl = null;
  function promoDetail() {
    mediaDetail('promos', 'Promo', function (p, isAdmin, H2) {
      if (captionBlobUrl) URL.revokeObjectURL(captionBlobUrl);
      captionBlobUrl = C.captionsUrl(p.caption_text);
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
          '<section class="mt-6 border-t border-brand-100 pt-5" aria-labelledby="promo-transcript-title"><h2 id="promo-transcript-title" class="' + H2 + '">Transcript</h2>' +
            '<p class="mt-2 whitespace-pre-line leading-relaxed">' + Ui.escape(p.caption_text || 'No captions or transcript were provided for this promo.') + '</p></section>' +
        '</div>' +
      '</article>';
    });
    // Make sure captions are visible even if a browser ignores `default`; show an error if the file can't play.
    document.addEventListener('loadedmetadata', function (e) {
      if (e.target.id === 'promo-video' && e.target.textTracks[0]) e.target.textTracks[0].mode = 'showing';
    }, true);
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
