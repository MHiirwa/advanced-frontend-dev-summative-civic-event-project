(function (window, $) {
  'use strict';
  var C = {};
  /* ---------- States ---------- */
  C.loading = function () { return '<div class="loading-panel" role="status"><span class="spinner" aria-hidden="true"></span><span>Loading…</span></div>'; };
  /** Empty state. `icon` is an optional Ui.icon name (default: inbox). */
  C.empty = function (title, text, icon) { return '<div class="empty-panel"><div class="empty-icon">' + Ui.icon(icon || 'inbox', 'w-5 h-5') + '</div><h2>' + Ui.escape(title) + '</h2>' + (text ? '<p>' + Ui.escape(text) + '</p>' : '') + '</div>'; };
  C.error = function (message) { return '<div class="error-panel" role="alert"><div class="error-icon">' + Ui.icon('alert', 'w-5 h-5') + '</div><strong>Something went wrong</strong><p>' + Ui.escape(message) + '</p><button class="btn btn-secondary retry-btn" type="button">' + Ui.icon('refresh', 'w-4 h-4') + ' Try again</button></div>'; };
  /** Published / draft pill (admin information). Icon + text, never colour alone. */
  C.status = function (published) { return '<span class="status ' + (published ? 'status-live' : 'status-draft') + '">' + Ui.icon(published ? 'circleCheck' : 'edit', '') + (published ? 'Published' : 'Draft') + '</span>'; };

  /* ---------- Design-system primitives ---------- */
  /** Chip: short label with optional icon. variant = blue | sage | coral | maize | success | warning | danger | muted. */
  C.chip = function (text, variant, icon) {
    return '<span class="chip' + (variant ? ' chip-' + variant : '') + '">' + (icon ? Ui.icon(icon, '') : '') + Ui.escape(text) + '</span>';
  };
  /** Status chip: 'live' | 'today' | 'upcoming' | 'completed' | 'registered'. */
  C.statusChip = function (key) {
    var s = Civic.STATUS[key]; if (!s) return '';
    return '<span class="chip ' + s.chip + '">' + Ui.icon(s.icon, '') + s.label + '</span>';
  };
  /**
   * Date tile ("29 NOV") from a real ISO date. Shows "Date TBA" when the event has no date.
   * The full date is in a visually hidden <time> so screen readers hear e.g. "Saturday, 29 November 2026".
   */
  C.dateTile = function (iso, opts) {
    opts = opts || {};
    var d = iso ? new Date(iso) : null;
    if (!d || isNaN(d)) return '<span class="date-tile tbd' + (opts.large ? ' lg' : '') + '"><span class="dt-day">TBA</span><span class="dt-month">date</span></span>';
    var full = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return '<time class="date-tile' + (opts.large ? ' lg' : '') + (opts.past ? ' is-past' : '') + '" datetime="' + Ui.escape(iso) + '">' +
      '<span class="dt-day" aria-hidden="true">' + d.getDate() + '</span>' +
      '<span class="dt-month" aria-hidden="true">' + d.toLocaleDateString(undefined, { month: 'short' }).replace('.', '') + '</span>' +
      '<span class="sr-only">' + Ui.escape(full) + '</span></time>';
  };
  /** Time range text, e.g. "09:00 – 12:00" (same day) or full dates when it spans days. */
  C.timeRange = function (startIso, endIso) {
    if (!startIso) return 'Time to be announced';
    var s = new Date(startIso), e = endIso ? new Date(endIso) : null;
    var t = function (d) { return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); };
    if (!e || isNaN(e)) return t(s);
    if (s.toDateString() === e.toDateString()) return t(s) + ' – ' + t(e);
    return Ui.formatDateTime(startIso) + ' – ' + Ui.formatDateTime(endIso);
  };
  /** Rating as Lucide stars (filled to the nearest half via clipping) + exact value for screen readers. */
  C.stars = function (n) {
    n = Math.max(0, Math.min(5, Number(n) || 0));
    var row = function (fill) { var h = ''; for (var i = 0; i < 5; i++) h += Ui.icon('star', 'w-4 h-4' + (fill ? ' fill-current' : '')); return h; };
    return '<span class="stars relative inline-flex align-middle" aria-hidden="true"><span class="inline-flex text-line-strong">' + row(false) + '</span>' +
      '<span class="absolute inset-y-0 left-0 inline-flex overflow-hidden whitespace-nowrap" style="width:' + (n / 5 * 100) + '%">' + row(true) + '</span></span>' +
      '<span class="sr-only">' + (Math.round(n * 10) / 10) + ' out of 5 stars</span>';
  };
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
  /** Relative path from the current page to the pages/ folder (works from /, /pages/ and /admin/). */
  C.pagesPath = function () {
    var p = window.location.pathname;
    return /\/admin\//.test(p) ? '../pages/' : /\/pages\//.test(p) ? '' : 'pages/';
  };

  /**
   * Compact event card built around the date tile.
   *  - Image only when the event has one (metadata.image_url); never a stand-in photo.
   *  - Status chips come from real data: time status (Civic.status) and, for signed-in
   *    users, their registration (opts.registration = 'registered' | 'cancelled').
   *  - "Umuganda" chip only when the event's own text says Umuganda.
   *  - The title link covers the whole card (stretched link) so the card is one tab stop;
   *    admin manage buttons sit above it.
   * ROLE GUARD (UX only): `admin` adds the Published/Draft pill + Edit/Delete (admin/ pages only).
   */
  /** Plain-text excerpt for cards: whitespace collapsed, cut at a word boundary. */
  C.excerpt = function (text, max) {
    var t = String(text || '').replace(/\s+/g, ' ').trim(); max = max || 110;
    if (t.length <= max) return t;
    return t.slice(0, max).replace(/\s+\S*$/, '') + '…';
  };
  /** Date panel shown when an event has no image, or when its image fails to load. */
  C.datePanel = function (d) {
    return '<span class="ev-date-panel">' + (d ? '<span>' + d.toLocaleDateString(undefined, { month: 'short' }) + '</span><strong>' + d.getDate() + '</strong>' : '<span>Date TBA</span>') + '</span>';
  };
  C.eventCard = function (e, admin, opts) {
    opts = opts || {};
    var image = C.eventImage(e), st = Civic.status(e), d = e.starts_at ? new Date(e.starts_at) : null;
    var href = C.pagesPath() + 'event-details.html?id=' + encodeURIComponent(e.id);
    var community = Object.keys(Civic.COMMUNITIES).filter(function (k) { return Civic.inCommunity(e, k); }).map(function (k) { return Civic.COMMUNITIES[k].title; }).join(' · ');
    var when = d ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Date to be announced';
    var chips = (st && st !== 'upcoming' ? C.statusChip(st) : '') + (Civic.mentionsUmuganda(e) ? C.chip('Umuganda', 'sage', 'shovel') : '') + (admin ? C.status(e.published !== false) : '');
    // ROLE GUARD (UX only): only normal users register; admins manage events instead.
    var action = opts.registration === 'registered' ? C.statusChip('registered')
      : opts.registration === 'cancelled' ? C.chip('Registration cancelled', 'muted')
      : (!Auth.isAdmin() && st !== 'completed' ? '<button type="button" class="ev-register text-link" data-id="' + Ui.escape(e.id) + '" aria-label="Register for ' + Ui.escape(e.title) + '">Register' + Ui.icon('arrowRight', 'w-4 h-4') + '</button>' : '');
    return '<article class="card ev-card">' +
      '<a class="ev-media" href="' + href + '" tabindex="-1" aria-hidden="true">' +
        (image ? '<img src="' + Ui.escape(image) + '" alt="" loading="lazy" data-fallback-date="' + Ui.escape(e.starts_at || '') + '">' : C.datePanel(d)) +
      '</a>' +
      '<div class="ev-body">' +
        // Hierarchy: community (caption) > title (card title) > status chips > date and place (meta, with
        // icons for quick scanning) > short description > actions (View neutral, Register = accent).
        (community ? '<p class="dc-kicker">' + Ui.escape(community) + '</p>' : '') +
        '<h3 class="dc-title"><a href="' + href + '">' + Ui.escape(e.title) + '</a></h3>' +
        (chips ? '<div class="ev-chips">' + chips + '</div>' : '') +
        '<p class="ev-meta"><span>' + Ui.icon('calendar') + Ui.escape(when) + '</span>' +
          '<span>' + Ui.icon('pin') + '<span class="truncate">' + Ui.escape(e.location || 'Location to be announced') + '</span></span></p>' +
        (e.description ? '<p class="ev-desc clamp">' + Ui.escape(C.excerpt(e.description)) + '</p>' : '') +
        '<div class="ev-foot">' +
          '<span class="ev-action flex items-center gap-4"><a class="ev-view" href="' + href + '" aria-label="View details for ' + Ui.escape(e.title) + '">View</a>' + action + '</span></div>' +
      '</div>' +
      (admin ? '<div class="ec-admin">' + C.manageActions(e, 'events') + '</div>' : '') +
    '</article>';
  };


  /**
   * Compact event row for lists (home "Coming up", user dashboard): month over day, title,
   * "weekday time · location", and one status chip (registration status if known, else time status).
   */
  C.eventRow = function (e, opts) {
    opts = opts || {};
    var d = e.starts_at ? new Date(e.starts_at) : null, st = Civic.status(e);
    var when = d ? d.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Date to be announced';
    var chip = opts.registration === 'registered' ? C.statusChip('registered') : (st ? C.statusChip(st) : '');
    return '<li><a class="event-row" href="' + C.pagesPath() + 'event-details.html?id=' + encodeURIComponent(e.id) + '">' +
      (d ? '<time class="date-stack" datetime="' + Ui.escape(e.starts_at) + '"><span class="ds-month">' + d.toLocaleDateString(undefined, { month: 'short' }).replace('.', '') + '</span><span class="ds-day">' + d.getDate() + '</span></time>'
         : '<span class="date-stack"><span class="ds-month">TBA</span></span>') +
      '<span class="min-w-0 flex-1"><span class="er-title">' + Ui.escape(e.title) + '</span>' +
      '<span class="er-meta">' + Ui.escape(when) + ' · ' + Ui.escape(e.location || 'Location to be announced') + '</span></span>' +
      chip + '</a></li>';
  };

  /** Section heading with an optional "See all" link on the right. */
  C.sectionHeader = function (id, title, linkHref, linkLabel, extra) {
    return '<div class="section-heading"><h2 id="' + id + '">' + Ui.escape(title) + '</h2>' +
      '<div class="flex items-center gap-3">' + (extra || '') +
      (linkHref ? '<a class="text-link text-sm" href="' + linkHref + '">' + Ui.escape(linkLabel || 'See all') + '</a>' : '') + '</div></div>';
  };

  /** Compact announcement row (title, date) linking to its detail page, where the audio player lives. */
  C.announcementRow = function (a) {
    return '<li><a class="media-row" href="' + C.pagesPath() + 'announcement-details.html?id=' + encodeURIComponent(a.id) + '">' +
      '<span class="media-row-icon" aria-hidden="true">' + Ui.icon('audio', 'w-4 h-4') + '</span>' +
      '<span class="min-w-0 flex-1"><span class="media-row-title">' + Ui.escape(a.title) + '</span>' +
      '<span class="media-row-meta">' + Ui.escape(Ui.formatDate(a.created_at)) + '</span></span>' +
      '<span class="media-row-action">Listen' + Ui.icon('chevronRight', 'w-4 h-4') + '</span></a></li>';
  };

  /** Compact promo row (title, short description) linking to its captioned video page. No autoplay, no preload. */
  C.promoRow = function (p) {
    return '<li><a class="media-row" href="' + C.pagesPath() + 'promo-details.html?id=' + encodeURIComponent(p.id) + '">' +
      '<span class="media-row-icon is-video" aria-hidden="true">' + Ui.icon('play', 'w-4 h-4') + '</span>' +
      '<span class="min-w-0 flex-1"><span class="media-row-title">' + Ui.escape(p.title) + '</span>' +
      (p.description ? '<span class="media-row-meta truncate block">' + Ui.escape(p.description) + '</span>' : '') + '</span>' +
      '<span class="media-row-action">Watch' + Ui.icon('chevronRight', 'w-4 h-4') + '</span></a></li>';
  };

  /**
   * Announcement row: play/pause (same accessible player logic as the detail page), title, date and
   * the audio length read from the file. Used by the announcements list.
   */
  C.audioRow = function (a) {
    var t = Ui.escape(a.title), url = Ui.escape(a.audio_url || ''), href = C.pagesPath() + 'announcement-details.html?id=' + encodeURIComponent(a.id);
    return '<li class="audio-row" data-audio-player data-title="' + t + '">' +
      '<audio preload="metadata" src="' + url + '"><p>Your browser cannot play this audio. <a href="' + url + '" download>Download it</a>.</p></audio>' +
      '<button type="button" class="ap-toggle inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-50" aria-label="Play ' + t + '">' + PLAY_SVG + '</button>' +
      '<span class="min-w-0 flex-1"><a class="er-title hover:text-brand-800 hover:underline" href="' + href + '">' + t + '</a>' +
        '<span class="er-meta"><time datetime="' + Ui.escape(a.created_at) + '">' + Ui.escape(Ui.formatDate(a.created_at)) + '</time> · <span class="ap-current">0:00</span> / <span class="ap-length ap-duration">…</span></span>' +
        '<span class="ap-error mt-1 hidden text-xs text-red-800" role="alert">This audio could not be played. <a class="underline" href="' + url + '" download>Download it</a>.</span></span>' +
      '<a class="btn btn-ghost btn-sm" href="' + href + '">Details</a></li>';
  };
  C.announcementCard = function (a) { return '<ul class="card audio-list">' + C.audioRow(a) + '</ul>'; };


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
    return '<div class="audio-player my-3 rounded-xl bg-subtle p-4" data-audio-player data-title="' + t + '">' +
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
  /** The .ap-length label belonging to this player: inside it (list rows) or in its card (detail page). */
  function lengthEl($p) { var $l = $p.find('.ap-length'); return $l.length ? $l.first() : $p.closest('article, section').find('.ap-length').first(); }

  function syncPlayer(audio) {
    var $p = playerOf(audio), d = audio.duration, c = audio.currentTime || 0;
    $p.find('.ap-current').text(C.formatTime(c));
    $p.find('.ap-duration').text(C.formatTime(d));
    lengthEl($p).text(C.formatTime(d));
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
    lengthEl($p).text('unavailable');
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
   * The API stores captions as one text field, but <track> needs a WebVTT file, which we build
   * and serve from a Blob URL (same origin, so no CORS issue). caption_text can be either:
   *  1. Timed subtitles (SRT or WebVTT pasted by the admin, e.g. exported from a subtitle tool):
   *     the exact timings are kept.
   *  2. Plain text: split into short caption lines (sentences, max ~12 words) and spread across
   *     the video's duration, weighted by word count, so captions follow the speech roughly.
   *     Until the duration is known, the whole text is shown as one cue (C.captionsUrl(text)). */
  var TIME_RE = /(\d{1,2}:)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;
  function escCue(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function toSeconds(m) { return (m[1] ? parseInt(m[1], 10) * 3600 : 0) + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt((m[4] + '00').slice(0, 3), 10) / 1000; }
  function vttTime(sec) {
    sec = Math.max(0, sec);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60, p = function (n, w) { return String(n).padStart(w, '0'); };
    return p(h, 2) + ':' + p(m, 2) + ':' + p(Math.floor(s), 2) + '.' + p(Math.round((s % 1) * 1000) % 1000, 3);
  }
  function blobUrl(cues) {
    var vtt = 'WEBVTT\n\n' + cues.map(function (c) { return vttTime(c.start) + ' --> ' + vttTime(c.end) + '\n' + escCue(c.text); }).join('\n\n') + '\n';
    return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
  }

  /** True when the text is SRT/WebVTT (has at least one "start --> end" timing line). */
  C.isTimedCaptions = function (text) { return /\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}/.test(String(text || '')); };

  /** Parse SRT or WebVTT into [{ start, end, text }]. Sequence numbers, headers and NOTE blocks are ignored. */
  C.parseTimedCaptions = function (text) {
    var cues = [];
    String(text || '').replace(/\r/g, '').split(/\n\s*\n/).forEach(function (block) {
      var lines = block.split('\n'), i = 0;
      while (i < lines.length && lines[i].indexOf('-->') === -1) i++;
      if (i === lines.length) return; // WEBVTT header, NOTE, STYLE or junk
      var parts = lines[i].split('-->'), a = TIME_RE.exec(parts[0]), b = TIME_RE.exec(parts[1] || '');
      var body = lines.slice(i + 1).join('\n').replace(/<[^>]+>/g, '').trim(); // drop <i>, <b>, voice tags
      if (a && b && body) cues.push({ start: toSeconds(a), end: toSeconds(b), text: body });
    });
    return cues.filter(function (c) { return c.end > c.start; }).sort(function (x, y) { return x.start - y.start; });
  };

  /** Plain words for the transcript: timed captions lose their numbers and timings. */
  C.captionTranscript = function (text) {
    return C.isTimedCaptions(text) ? C.parseTimedCaptions(text).map(function (c) { return c.text.replace(/\n/g, ' '); }).join('\n') : String(text || '').trim();
  };

  /** Split plain text into caption-sized lines: sentences, long ones cut at ~12 words. */
  function captionLines(text) {
    var out = [];
    String(text).replace(/\r/g, '').split(/\n+|(?<=[.!?…])\s+/).forEach(function (sentence) {
      var words = sentence.trim().split(/\s+/).filter(Boolean);
      for (var i = 0; i < words.length; i += 12) {
        var chunk = words.slice(i, i + 12);
        if (words.length - (i + 12) > 0 && words.length - (i + 12) < 4) { chunk = words.slice(i); i = words.length; } // no 1–3 word leftovers
        out.push(chunk.join(' '));
      }
    });
    return out.filter(Boolean);
  }

  /**
   * Blob URL of a WebVTT file for caption_text, or null when there is no text.
   * `duration` (seconds) lets plain text be timed across the video; without it plain text is one cue.
   */
  C.captionsUrl = function (text, duration) {
    text = String(text || '').trim();
    if (!text) return null;
    if (C.isTimedCaptions(text)) {
      var timed = C.parseTimedCaptions(text);
      if (timed.length) return blobUrl(timed);
    }
    var lines = captionLines(text);
    if (!(duration > 0) || !isFinite(duration) || lines.length < 2) return blobUrl([{ start: 0, end: 359999, text: lines.join('\n') || text }]);
    // Weight each line by its word count (+1 so short lines still get time), leave a small gap between cues.
    var weights = lines.map(function (l) { return l.split(/\s+/).length + 1; }), total = weights.reduce(function (s, w) { return s + w; }, 0), t = 0;
    return blobUrl(lines.map(function (l, i) {
      var len = duration * weights[i] / total, cue = { start: t, end: Math.max(t + 0.5, t + len - 0.05), text: l };
      t += len; return cue;
    }));
  };
  /**
   * Promo card. The thumbnail is the video's first frame: the <video> only gets its src (with a
   * #t=0.5 fragment) when it scrolls into view, so lists never download videos up front.
   */
  C.promoCard = function (p) {
    var href = C.pagesPath() + 'promo-details.html?id=' + encodeURIComponent(p.id);
    return '<article class="card ev-card">' +
      '<a class="promo-thumb" href="' + href + '" aria-label="Watch ' + Ui.escape(p.title) + '">' +
        '<video data-lazy-src="' + Ui.escape((p.video_url || '') + '#t=0.5') + '" preload="none" muted playsinline aria-hidden="true" tabindex="-1"></video>' +
        '<span class="promo-play" aria-hidden="true">' + PLAY_SVG + '</span></a>' +
      '<div class="ev-body"><h3 class="dc-title"><a href="' + href + '">' + Ui.escape(p.title) + '</a></h3>' +
        (p.description ? '<p class="ev-desc clamp">' + Ui.escape(p.description) + '</p>' : '') +
        '<p class="ev-meta mt-auto"><span>' + Ui.icon('video') + (p.caption_text ? 'English captions' : 'No captions') + '</span></p></div>' +
    '</article>';
  };
  // Lazy first-frame loader for promo thumbnails (IntersectionObserver; falls back to loading at once).
  var lazyIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { loadThumb(en.target); lazyIO.unobserve(en.target); } });
  }, { rootMargin: '200px' }) : null;
  function loadThumb(v) { v.preload = 'metadata'; v.src = v.getAttribute('data-lazy-src'); v.removeAttribute('data-lazy-src'); }
  function scanLazy(root) { $(root).find('video[data-lazy-src]').each(function () { lazyIO ? lazyIO.observe(this) : loadThumb(this); }); }
  new MutationObserver(function (muts) { muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scanLazy(n); }); }); })
    .observe(document.documentElement, { childList: true, subtree: true });
  // Event image that can't load (deleted file, wrong host): swap in the date panel so no broken-image icon shows.
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName !== 'IMG' || !img.hasAttribute('data-fallback-date')) return;
    var iso = img.getAttribute('data-fallback-date'), d = iso ? new Date(iso) : null;
    var $wrap = $(img).parent();
    if ($wrap.hasClass('ev-media')) { $wrap.addClass('img-failed'); $(img).replaceWith(C.datePanel(d && !isNaN(d) ? d : null)); }
    else $(img).replaceWith('<div class="flex h-48 items-center justify-center bg-subtle text-muted" role="img" aria-label="Image unavailable">' + Ui.icon('calendar', 'w-12 h-12') + '</div>');
  }, true);
  document.addEventListener('error', function (e) { // video that can't load: keep the dark tile with the play icon
    if (e.target.tagName === 'VIDEO' && e.target.closest('.promo-thumb')) e.target.style.visibility = 'hidden';
  }, true);

  /* ---------- Register from any event card (events list, community pages, search, dashboard) ----------
   * POST /event-registrations/register. The API returns 409 if the user already has a registration
   * for that event, including a cancelled one (re-registering is not allowed). */
  // Optimistic UI: the "Registered" chip shows immediately; if the API call fails, the button
  // comes back (focus restored) and the error is explained.
  $(document).on('click', '.ev-register', function () {
    var $b = $(this), id = $b.attr('data-id'), $slot = $('<span class="ev-optimistic"></span>').html(C.statusChip('registered'));
    $b.after($slot).detach();
    Api.post('/event-registrations/register', { event_id: id }).done(function () {
      Ui.toast('You are registered.', 'success');
      $(document).trigger('ce:registered', [id]);
    }).fail(function (err) {
      $slot.replaceWith($b); $b.trigger('focus');
      if (err.status === 409) Ui.toast('You already have a registration for this event (re-registering after cancelling isn\'t possible).', 'warning');
      else Api.toastError(err);
    });
  });
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
      '<li><button type="button" class="' + btn + ' border-line bg-white hover:bg-subtle hover:border-line-strong disabled:opacity-40 disabled:cursor-not-allowed" data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + ' aria-label="Previous page">' + Ui.icon('back', 'w-4 h-4') + '<span class="ml-1 hidden sm:inline">Previous</span></button></li>';
    nums.forEach(function (n, idx) {
      if (idx && n - nums[idx - 1] > 1) html += '<li aria-hidden="true" class="px-1 text-muted">…</li>';
      html += '<li><button type="button" class="' + btn + (n === page ? ' border-brand-700 bg-brand-700 text-white' : ' border-line bg-white hover:bg-subtle hover:border-line-strong') + '" data-page="' + n + '" aria-label="Page ' + n + '"' + (n === page ? ' aria-current="page"' : '') + '>' + n + '</button></li>';
    });
    html += '<li><button type="button" class="' + btn + ' border-line bg-white hover:bg-subtle hover:border-line-strong disabled:opacity-40 disabled:cursor-not-allowed" data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + ' aria-label="Next page"><span class="mr-1 hidden sm:inline">Next</span><span class="inline-block rotate-180">' + Ui.icon('back', 'w-4 h-4') + '</span></button></li>';
    return html + '</ul>';
  };
  C.table = function (headers, rows) { return '<div class="table-wrap"><table><thead><tr>' + headers.map(function (h) { return '<th>' + Ui.escape(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>'; };
  window.Components = C;
})(window, jQuery);
