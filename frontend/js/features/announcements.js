/**
 * features/announcements.js — announcements list and detail (custom audio player).
 * ROLE GUARD (UX only): normal users only see published announcements; on admin/ pages
 * (admin) cards also show status and Edit/Delete/Publish controls.
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  var showList = App.showList, queryBar = App.queryBar, filterCards = App.filterCards, mediaDetail = App.mediaDetail;
  // ROLE GUARD (UX only): showList hides unpublished announcements unless this is an admin/ page;
  // C.announcementCard(a, admin) adds status + Edit/Delete/Publish only for admins.
  function announcements() {
    showList('announcements', '/announcements', function (items) {
      function render() {
        var q = $('#filter').val().trim().toLowerCase(), old = $('#sort').val() === 'old';
        var list = items.filter(function (x) { return !q || [x.title, x.description, x.caption_text].join(' ').toLowerCase().indexOf(q) !== -1; })
          .sort(function (a, b) { return (new Date(b.created_at) - new Date(a.created_at)) * (old ? -1 : 1); });
        $('#list').html(list.length ? '<ul class="card audio-list">' + list.map(C.audioRow).join('') + '</ul>' : (items.length ? C.empty('Nothing matches', 'Try another word.', 'search') : C.empty('No announcements yet', 'Audio updates from administrators will appear here.', 'audio')));
      }
      put('<div class="toolbar-row"><label class="sr-only" for="filter">Search</label><input id="filter" class="input max-w-sm" type="search" placeholder="Search announcements…">' +
        '<label class="sr-only" for="sort">Sort</label><select id="sort" class="input !w-auto"><option value="new">Newest first</option><option value="old">Oldest first</option></select></div>' + '<div id="list"></div>');
      $('#filter').on('input', Ui.debounce(render, 150)); $('#sort').on('change', render);
      render();
    }, 'Announcements', 'Audio updates published by administrators.', 'announcements');
  }
  /* Announcement detail: custom accessible audio player; length read from the audio metadata. */
  function announcementDetail() {
    mediaDetail('announcements', 'Announcement', function (a, isAdmin, H2) {
      return '<article class="card p-6" aria-labelledby="ann-player-title">' +
        // ROLE GUARD (UX only): only admins see the Published/Unpublished status (users never see drafts).
        (isAdmin ? '<p class="mb-3">' + C.status(a.published) + '</p>' : '') +
        '<p class="text-sm text-muted">Published <time datetime="' + Ui.escape(a.created_at) + '">' + Ui.escape(Ui.formatDateTime(a.created_at)) + '</time> · Length <span class="ap-length">…</span></p>' +
        '<h2 id="ann-player-title" class="mt-4 ' + H2 + '">Listen</h2>' +
        C.audioPlayer(a.audio_url, a.title) +
        '<section class="mt-6 border-t border-brand-100 pt-5" aria-labelledby="ann-transcript-title"><h2 id="ann-transcript-title" class="' + H2 + '">Transcript</h2>' +
          '<p class="mt-2 text-muted">A written transcript has not been provided for this audio announcement. If you need this information in another format, contact <a class="underline" href="mailto:' + Ui.escape(CONFIG.SUPPORT_EMAIL) + '">' + Ui.escape(CONFIG.SUPPORT_EMAIL) + '</a>.</p></section>' +
      '</article>';
    });
  }

  App.register({
    'announcements': announcements,
    'announcement-details': announcementDetail
  });
})(window, jQuery);
