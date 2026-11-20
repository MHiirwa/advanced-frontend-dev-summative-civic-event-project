(function (window, $) {
  'use strict';
  var C = {};
  C.loading = function () { return '<div class="loading-panel"><span class="spinner"></span><span>Loading from CivicEvents+…</span></div>'; };
  C.empty = function (title, text) { return '<div class="empty-panel"><div class="empty-icon">✦</div><h2>' + Ui.escape(title) + '</h2><p>' + Ui.escape(text || '') + '</p></div>'; };
  C.error = function (message) { return '<div class="error-panel"><strong>Something went wrong</strong><p>' + Ui.escape(message) + '</p><button class="btn btn-secondary retry-btn" type="button">Try again</button></div>'; };
  C.status = function (published) { return '<span class="status ' + (published ? 'status-live' : 'status-draft') + '">' + (published ? 'Published' : 'Unpublished') + '</span>'; };
  // ROLE GUARD (UX only): Edit/Delete/Publish buttons. Cards only call this when their `admin`
  // argument is true (admin/ pages); the API rejects these actions for non-admins with 403.
  C.manageActions = function (item, type) {
    var resource = type === 'events' ? 'events' : type === 'announcements' ? 'announcements' : 'promos';
    var file = type === 'events' ? 'create-event.html' : type === 'announcements' ? 'create-announcement.html' : 'create-promo.html';
    var buttons = '<a class="btn btn-secondary btn-small" href="' + file + '?id=' + encodeURIComponent(item.id) + '">Edit</a><button class="btn btn-danger btn-small manage-delete" data-resource="' + resource + '" data-id="' + item.id + '">Delete</button>';
    if (type !== 'events') buttons += '<button class="btn btn-secondary btn-small manage-publish" data-resource="' + resource + '" data-id="' + item.id + '" data-published="' + item.published + '">' + (item.published ? 'Unpublish' : 'Publish') + '</button>';
    return '<div class="manage-actions">' + buttons + '</div>';
  };
  /** Event image URL from metadata (metadata may arrive as an object or a JSON string). */
  C.eventImage = function (e) {
    var m = e && e.metadata;
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (x) { m = null; } }
    return (m && m.image_url) || null;
  };
  // `admin` = render admin extras (status pill + manage buttons). Pass true only on admin/ pages.
  C.eventCard = function (e, admin) {
    var image = C.eventImage(e);
    var root = /\/admin\//.test(window.location.pathname) ? '../pages/' : '';
    return '<article class="card content-card"><div class="media-frame">' + (image ? '<img src="' + Ui.escape(image) + '" alt="" loading="lazy">' : '<span>COMMUNITY EVENT</span>') + '</div><div class="card-body"><div class="card-meta"><span>EVENT</span>' + (admin ? C.status(e.published) : '') + '</div><h2>' + Ui.escape(e.title) + '</h2><p class="muted clamp">' + Ui.escape(e.description || 'Join your community for this event.') + '</p><p class="card-detail">📅 ' + Ui.escape(Ui.formatDateTime(e.starts_at) || 'Date to be announced') + '</p><p class="card-detail">⌖ ' + Ui.escape(e.location || 'Location to be announced') + '</p><a class="btn btn-secondary btn-small" href="' + root + 'event-details.html?id=' + encodeURIComponent(e.id) + '">View event</a>' + (admin ? C.manageActions(e, 'events') : '') + '</div></article>';
  };
  C.announcementCard = function (a, admin) {
    var root = /\/admin\//.test(window.location.pathname) ? '../pages/' : '';
    return '<article class="card content-card"><div class="card-body"><div class="card-meta"><span class="badge badge-announcement">Announcement</span>' + (admin ? C.status(a.published) : '') + '</div>' +
      '<h2>' + Ui.escape(a.title) + '</h2>' +
      // Length comes from the audio file's own metadata (the API has no duration field); C.audioPlayer fills .ap-length.
      '<p class="muted"><time datetime="' + Ui.escape(a.created_at) + '">' + Ui.escape(Ui.formatDate(a.created_at)) + '</time> · Length <span class="ap-length">…</span></p>' +
      C.audioPlayer(a.audio_url, a.title) +
      '<a class="btn btn-secondary btn-small" href="' + root + 'announcement-details.html?id=' + encodeURIComponent(a.id) + '">Open announcement</a>' + (admin ? C.manageActions(a, 'announcements') : '') + '</div></article>';
  };

  /* ---------- Accessible audio player ----------
   * A native <audio> (no controls) driven by our own play/pause button and a range slider.
   * Keyboard: Tab to the button (Space/Enter toggles) and the slider (arrow keys seek 1 s,
   * PageUp/PageDown 10 %). preload="metadata" only fetches the header, which is enough
   * for the duration. Events are bound once on document (see bottom of file), so players
   * work after any re-render without extra init calls. */
  var PLAY_SVG = '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg>';
  var PAUSE_SVG = '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  C.formatTime = function (sec) {
    if (!isFinite(sec) || sec < 0) return '--:--';
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };
  C.audioPlayer = function (src, title) {
    var t = Ui.escape(title || 'announcement'), url = Ui.escape(src || '');
    return '<div class="audio-player my-3 rounded-xl border border-brand-100 bg-brand-50 p-3" data-audio-player data-title="' + t + '">' +
      '<audio preload="metadata" src="' + url + '">' +
        '<p>Your browser cannot play this audio. <a href="' + url + '" download>Download the audio file</a>.</p>' +
      '</audio>' +
      '<div class="flex items-center gap-3">' +
        '<button type="button" class="ap-toggle inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50" aria-label="Play ' + t + '">' + PLAY_SVG + '</button>' +
        '<div class="min-w-0 flex-1">' +
          '<input type="range" class="ap-seek w-full" min="0" max="0" step="1" value="0" aria-label="Seek within ' + t + '" aria-valuetext="0:00 of unknown length">' +
          '<div class="flex justify-between text-xs tabular-nums text-muted"><span class="ap-current">0:00</span><span class="ap-duration">--:--</span></div>' +
        '</div>' +
      '</div>' +
      '<p class="ap-error mt-2 hidden text-sm text-red-800" role="alert">This audio could not be played. <a class="underline" href="' + url + '" download>Download the file</a> instead.</p>' +
    '</div>';
  };
  function playerOf(el) { return $(el).closest('[data-audio-player]'); }
  function syncPlayer(audio) {
    var $p = playerOf(audio), d = audio.duration, c = audio.currentTime || 0;
    $p.find('.ap-current').text(C.formatTime(c));
    $p.find('.ap-duration').text(C.formatTime(d));
    $p.closest('article, section').find('.ap-length').first().text(C.formatTime(d));
    var $seek = $p.find('.ap-seek');
    if (isFinite(d)) $seek.attr('max', Math.floor(d));
    if (!$seek.data('dragging')) $seek.val(Math.floor(c));
    $seek.attr('aria-valuetext', C.formatTime(c) + ' of ' + (isFinite(d) ? C.formatTime(d) : 'unknown length'));
  }
  // Media events don't bubble, so listen in the capture phase.
  ['loadedmetadata', 'durationchange', 'timeupdate'].forEach(function (evt) {
    document.addEventListener(evt, function (e) { if (e.target.tagName === 'AUDIO' && playerOf(e.target).length) syncPlayer(e.target); }, true);
  });
  ['play', 'pause', 'ended'].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      var $p = playerOf(e.target); if (!$p.length) return;
      var playing = evt === 'play', t = $p.attr('data-title');
      $p.find('.ap-toggle').html(playing ? PAUSE_SVG : PLAY_SVG).attr('aria-label', (playing ? 'Pause ' : 'Play ') + t);
    }, true);
  });
  // Only one clip plays at a time (also pauses a promo video).
  document.addEventListener('play', function (e) {
    $('audio, video').each(function () { if (this !== e.target && !this.paused) this.pause(); });
  }, true);
  document.addEventListener('error', function (e) {
    if (e.target.tagName !== 'AUDIO') return;
    var $p = playerOf(e.target); if (!$p.length) return;
    $p.find('.ap-error').removeClass('hidden');
    $p.find('.ap-toggle, .ap-seek').prop('disabled', true);
    $p.closest('article, section').find('.ap-length').first().text('unavailable');
  }, true);
  $(document).on('click', '.ap-toggle', function () {
    var audio = playerOf(this).find('audio')[0];
    if (audio.paused) { var pr = audio.play(); if (pr && pr.catch) pr.catch(function () { Ui.toast('This audio could not be played.', 'error'); }); }
    else audio.pause();
  });
  $(document).on('input', '.ap-seek', function () {
    var audio = playerOf(this).find('audio')[0];
    $(this).data('dragging', true);
    audio.currentTime = Number(this.value);
    syncPlayer(audio);
  }).on('change', '.ap-seek', function () { $(this).data('dragging', false); });

  /* ---------- Captions: WebVTT built from promo.caption_text ----------
   * The API stores captions as plain text, but <track> needs a WebVTT file. We build one cue
   * spanning the whole video and serve it from a Blob URL (same origin, so no CORS issue). */
  C.captionsUrl = function (text) {
    text = String(text || '').trim();
    if (!text) return null;
    var cue = text.replace(/-->/g, '→')  // "-->" is reserved in WebVTT (replace before escaping ">")
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\r/g, '').replace(/\n\s*\n+/g, '\n'); // a blank line would end the cue early
    var vtt = 'WEBVTT\n\n00:00:00.000 --> 99:59:59.000\n' + cue + '\n';
    return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
  };
  C.promoCard = function (p, admin) { var root = /\/admin\//.test(window.location.pathname) ? '../pages/' : ''; return '<article class="card content-card"><div class="media-frame video-placeholder">▶</div><div class="card-body"><div class="card-meta"><span class="badge badge-promo">Promo</span>' + (admin ? C.status(p.published) : '') + '</div><h2>' + Ui.escape(p.title) + '</h2><p class="muted clamp">' + Ui.escape(p.description || '') + '</p><video class="media-player" controls preload="metadata" src="' + Ui.escape(p.video_url) + '"></video><details class="caption-panel"><summary>Read captions</summary><p>' + Ui.escape(p.caption_text || 'No caption text was supplied.') + '</p></details><a class="btn btn-secondary btn-small" href="' + root + 'promo-details.html?id=' + encodeURIComponent(p.id) + '">Open promo</a>' + (admin ? C.manageActions(p, 'promos') : '') + '</div></article>'; };
  /** Active/disabled pill for a user account (used on the profile page). */
  C.accountStatus = function (active) {
    return '<span class="status ' + (active === false ? 'status-draft' : 'status-live') + '">' + (active === false ? 'Disabled' : 'Active') + '</span>';
  };
  /**
   * Accessible pagination: Previous/Next plus numbered buttons (with ellipses for long ranges).
   * Buttons carry data-page; the current page has aria-current="page". Wrap it in a <nav aria-label>.
   */
  C.pagination = function (page, pages) {
    if (pages <= 1) return '';
    var nums = [];
    for (var i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    var btn = 'inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border px-3 text-sm font-semibold';
    var html = '<ul class="flex flex-wrap items-center justify-center gap-2">' +
      '<li><button type="button" class="' + btn + ' border-brand-100 bg-white hover:bg-brand-50 disabled:opacity-40" data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + ' aria-label="Previous page">' + Ui.icon('back', 'w-4 h-4') + '<span class="ml-1 hidden sm:inline">Previous</span></button></li>';
    nums.forEach(function (n, idx) {
      if (idx && n - nums[idx - 1] > 1) html += '<li aria-hidden="true" class="px-1 text-muted">…</li>';
      html += '<li><button type="button" class="' + btn + (n === page ? ' border-brand-700 bg-brand-700 text-white' : ' border-brand-100 bg-white hover:bg-brand-50') + '" data-page="' + n + '" aria-label="Page ' + n + '"' + (n === page ? ' aria-current="page"' : '') + '>' + n + '</button></li>';
    });
    html += '<li><button type="button" class="' + btn + ' border-brand-100 bg-white hover:bg-brand-50 disabled:opacity-40" data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + ' aria-label="Next page"><span class="mr-1 hidden sm:inline">Next</span><span class="inline-block rotate-180">' + Ui.icon('back', 'w-4 h-4') + '</span></button></li>';
    return html + '</ul>';
  };
  C.table = function (headers, rows) { return '<div class="table-wrap"><table><thead><tr>' + headers.map(function (h) { return '<th>' + Ui.escape(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>'; };
  C.publicHeader = function ($target, active) {
    var loggedIn = Auth.isLoggedIn();
    var user = Auth.getUser();
    var logo = '<a class="public-brand" href="index.html" aria-label="CivicEvents+ home"><span class="public-brand-mark">C+</span><span>CivicEvents<em>+</em></span></a>';
    var publicLinks =
      '<a class="' + (active === 'home' ? 'active' : '') + '" href="index.html">Home</a>' +
      '<a href="pages/events.html">Explore Events</a>' +
      '<a href="index.html#civic-life">Rwanda Civic Life</a>' +
      '<a href="pages/events.html">ALU Campus</a>' +
      '<a href="pages/announcements.html">Announcements</a>' +
      '<a href="pages/promos.html">Promotions</a>';
    var accountLinks = loggedIn
      ? '<a class="btn btn-primary btn-small" href="' + (user.role === 'admin' ? 'admin/dashboard.html' : 'pages/dashboard.html') + '">My dashboard</a><button type="button" class="btn btn-ghost btn-small public-logout">Log out</button>'
      : '<a class="public-login" href="login.html">Log in</a><a class="btn btn-primary btn-small" href="signup.html">Sign up</a>';
    $target.html(
      '<div class="container public-header-inner">' + logo +
      '<button class="public-menu-button" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="public-mobile-nav">Menu</button>' +
      '<nav class="public-nav" aria-label="Primary navigation">' + publicLinks + '</nav>' +
      '<div class="public-account">' + accountLinks + '</div></div>' +
      '<nav id="public-mobile-nav" class="public-mobile-nav" aria-label="Mobile navigation" hidden>' + publicLinks +
      '<div class="public-mobile-account">' + accountLinks + '</div></nav>'
    );
    $target.find('.public-menu-button').on('click', function () {
      var open = $(this).attr('aria-expanded') === 'true';
      $(this).attr({'aria-expanded': String(!open), 'aria-label': open ? 'Open navigation' : 'Close navigation'});
      $('#public-mobile-nav').prop('hidden', open);
    });
    $target.find('.public-logout').on('click', function () { Auth.logout('You have been logged out.', 'success'); });
  };
  C.publicFooter = function ($target) {
    $target.html(
      '<div class="container public-footer-grid">' +
      '<div class="public-footer-brand"><p>CivicEvents<em>+</em></p><span>People, places and possibilities across Rwanda.</span></div>' +
      '<nav aria-label="Footer navigation"><h2>Explore</h2><a href="pages/events.html">Events</a><a href="pages/announcements.html">Announcements</a><a href="pages/promos.html">Promotions</a></nav>' +
      '<nav aria-label="Account navigation"><h2>Account</h2><a href="login.html">Log in</a><a href="signup.html">Create account</a><a href="pages/profile.html">Profile</a></nav>' +
      '<div><h2>Community</h2><p>Rwanda civic life</p><p>Campus life</p><p>Local participation</p></div>' +
      '</div><div class="container public-footer-bottom"><span>© ' + new Date().getFullYear() + ' CivicEvents+</span><span>Community engagement, made accessible.</span></div>'
    );
  };
  window.Components = C;
})(window, jQuery);
