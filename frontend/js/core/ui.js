/**
 * ui.js
 * ---------------------------------------------------------------
 * Small UI toolkit shared by every page: toasts, confirm dialog,
 * form helpers, formatting, skeletons, empty/error states, icons.
 */
(function (window, $) {
  'use strict';

  var FLASH_KEY = 'ce_flash';

  /* ---------- Icons ----------
   * Lucide icon paths (https://lucide.dev, ISC licence), inlined so no extra
   * dependency is loaded. One icon family across the whole product; never emoji.
   * Keys are stable names used by the rest of the code. */
  var ICONS = {
    bell: '<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    menu: '<path d="M4 12h16"/><path d="M4 6h16"/><path d="M4 18h16"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    userCheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    circleCheck: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    circleX: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    edit: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    audio: '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
    video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    layout: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    filter: '<path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"/>',
    /* Civic categories */
    landmark: '<path d="M10 18v-7"/><path d="M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M3 22h18"/><path d="M6 18v-7"/>',
    campus: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    sprout: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    shovel: '<path d="M2 22v-5l5-5 5 5-5 5z"/><path d="M9.5 14.5 16 8"/><path d="m17 2 5 5-.5.5a3.53 3.53 0 0 1-5 0s0 0 0 0a3.53 3.53 0 0 1 0-5L17 2"/>'
  };

  var Ui = {};

  /** Returns an inline SVG string. Decorative by default (aria-hidden). */
  Ui.icon = function (name, cls) {
    return '<svg class="' + (cls || 'w-5 h-5') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONS[name] || '') + '</svg>';
  };

  /** Escape untrusted text before putting it into HTML strings (prevents XSS). */
  Ui.escape = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  Ui.debounce = function (fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 250);
    };
  };

  /* ---------- Dates ---------- */
  Ui.formatDate = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(d);
  };
  Ui.formatDateTime = function (iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  };
  Ui.timeAgo = function (iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d)) return '';
    var diff = (d.getTime() - Date.now()) / 1000; // negative = past
    var rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    var units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (var i = 0; i < units.length; i++) {
      if (Math.abs(diff) >= units[i][1]) return rtf.format(Math.round(diff / units[i][1]), units[i][0]);
    }
    return 'just now';
  };

  /* ---------- Toasts ---------- */
  var TOAST_STYLES = {
    success: { box: 'border-green-700 bg-green-50 text-green-900', icon: 'circleCheck' },
    error: { box: 'border-red-600 bg-red-50 text-red-900', icon: 'alert' },
    warning: { box: 'border-amber-600 bg-amber-50 text-amber-900', icon: 'warning' },
    info: { box: 'border-brand-600 bg-brand-50 text-brand-900', icon: 'info' }
  };

  function toastRegion() {
    var $r = $('#toast-region');
    if (!$r.length) {
      // aria-live region so screen readers announce new toasts politely
      $r = $('<div id="toast-region" class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm" aria-live="polite" aria-atomic="false"></div>');
      $('body').append($r);
    }
    return $r;
  }

  Ui.toast = function (message, type, timeout) {
    type = TOAST_STYLES[type] ? type : 'info';
    var s = TOAST_STYLES[type];
    var $t = $(
      '<div class="toast flex items-start gap-3 rounded-xl border-l-4 px-4 py-3 shadow-lg ' + s.box + '" role="' + (type === 'error' ? 'alert' : 'status') + '">' +
        '<span class="mt-0.5 shrink-0">' + Ui.icon(s.icon, 'w-5 h-5') + '</span>' +
        '<p class="flex-1 text-sm font-medium">' + Ui.escape(message) + '</p>' +
        '<button type="button" class="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2" aria-label="Dismiss notification">' + Ui.icon('x', 'w-4 h-4') + '</button>' +
      '</div>'
    );
    function remove() { $t.addClass('toast-out'); setTimeout(function () { $t.remove(); }, 200); }
    $t.find('button').on('click', remove);
    toastRegion().append($t);
    setTimeout(remove, timeout || (type === 'error' ? 7000 : 4500));
    return $t;
  };

  /** Queue a toast to show after the next page load (used before redirects). */
  Ui.flash = function (message, type) {
    try { sessionStorage.setItem(FLASH_KEY, JSON.stringify({ message: message, type: type || 'info' })); } catch (e) { /* storage blocked */ }
  };
  Ui.showFlash = function () {
    try {
      var raw = sessionStorage.getItem(FLASH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(FLASH_KEY);
      var f = JSON.parse(raw);
      Ui.toast(f.message, f.type);
    } catch (e) { /* ignore */ }
  };

  /* ---------- Buttons ---------- */
  /** Toggle a button's loading state (spinner + disabled + aria-busy). */
  Ui.setLoading = function ($btn, loading, loadingText) {
    if (loading) {
      if ($btn.data('orig-html') == null) $btn.data('orig-html', $btn.html());
      $btn.prop('disabled', true).attr('aria-busy', 'true')
        .html('<span class="spinner" aria-hidden="true"></span><span>' + Ui.escape(loadingText || 'Please wait…') + '</span>');
    } else {
      if ($btn.data('orig-html') != null) $btn.html($btn.data('orig-html')).removeData('orig-html');
      $btn.prop('disabled', false).removeAttr('aria-busy');
    }
  };

  /* ---------- Forms ---------- */
  /**
   * Show/clear an error under a field.
   * Markup contract: <div data-field> <input id="x"> <p data-error id="x-error" class="hidden"></p> </div>
   */
  Ui.setFieldError = function ($input, message) {
    var $wrap = $input.closest('[data-field]');
    var $err = $wrap.find('[data-error]').first();
    var errId = $err.attr('id');
    // Remember the field's own hints (e.g. password rules) once, so an error is ADDED to them
    // instead of replacing them, and they come back when the error clears.
    if ($input.data('base-describedby') == null) $input.data('base-describedby', $input.attr('aria-describedby') || '');
    var base = String($input.data('base-describedby')).split(/\s+/).filter(function (x) { return x && x !== errId; });
    if (message) {
      $err.text(message).removeClass('hidden');
      $input.attr('aria-invalid', 'true');
      if (errId) $input.attr('aria-describedby', [errId].concat(base).join(' '));
      $input.addClass('input-error');
    } else {
      $err.text('').addClass('hidden');
      $input.removeAttr('aria-invalid').removeClass('input-error');
      if (base.length) $input.attr('aria-describedby', base.join(' ')); else $input.removeAttr('aria-describedby');
    }
  };
  Ui.clearFieldErrors = function ($form) {
    $form.find('[data-field] input, [data-field] textarea, [data-field] select').each(function () {
      Ui.setFieldError($(this), '');
    });
  };

  /** Form-level alert (role=alert) shown above the submit button. */
  Ui.formAlert = function ($el, message, type) {
    if (!message) { $el.addClass('hidden').empty(); return; }
    var s = TOAST_STYLES[type || 'error'];
    $el.removeClass('hidden').attr('role', 'alert')
      .attr('class', 'flex items-start gap-2 rounded-lg border-l-4 px-3 py-2 text-sm ' + s.box)
      .html('<span class="mt-0.5 shrink-0">' + Ui.icon(s.icon, 'w-4 h-4') + '</span><span>' + Ui.escape(message) + '</span>');
  };

  /**
   * Validate a File before uploading (type + size).
   * kind: 'image' | 'audio' | 'video' (limits live in CONFIG.UPLOADS).
   * Returns an error string, or null when the file is fine.
   */
  Ui.validateFile = function (file, kind) {
    var rule = CONFIG.UPLOADS[kind];
    if (!file) return null;
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (rule.exts.indexOf(ext) === -1) {
      return 'Unsupported file type ".' + ext + '". Allowed: ' + rule.exts.join(', ') + '.';
    }
    if (file.size > rule.maxMB * 1024 * 1024) {
      return 'File is too large (' + (file.size / 1048576).toFixed(1) + ' MB). Maximum is ' + rule.maxMB + ' MB.';
    }
    return null;
  };

  /* ---------- Loading / empty / error states ---------- */
  Ui.skeletonCards = function (n) {
    var html = '';
    for (var i = 0; i < (n || 6); i++) {
      html += '<div class="card p-0 overflow-hidden" aria-hidden="true">' +
        '<div class="skeleton h-40 w-full rounded-none"></div>' +
        '<div class="p-4 space-y-3"><div class="skeleton h-5 w-3/4"></div><div class="skeleton h-4 w-1/2"></div><div class="skeleton h-4 w-full"></div></div></div>';
    }
    return '<div class="sr-only" role="status">Loading…</div>' + html;
  };
  Ui.skeletonRows = function (n) {
    var html = '';
    for (var i = 0; i < (n || 4); i++) {
      html += '<div class="flex gap-3 p-3" aria-hidden="true"><div class="skeleton h-10 w-10 rounded-full shrink-0"></div><div class="flex-1 space-y-2"><div class="skeleton h-4 w-2/3"></div><div class="skeleton h-3 w-full"></div></div></div>';
    }
    return '<div class="sr-only" role="status">Loading…</div>' + html;
  };

  Ui.emptyState = function (opts) {
    return '<div class="text-center py-14 px-4 col-span-full">' +
      '<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">' + Ui.icon(opts.icon || 'inbox', 'w-7 h-7') + '</div>' +
      '<h3 class="font-display text-xl font-semibold">' + Ui.escape(opts.title || 'Nothing here yet') + '</h3>' +
      (opts.message ? '<p class="mt-1 text-muted">' + Ui.escape(opts.message) + '</p>' : '') +
      (opts.actionHtml ? '<div class="mt-5">' + opts.actionHtml + '</div>' : '') +
      '</div>';
  };

  /** Error block with a Retry button. Returns a jQuery element. */
  Ui.errorState = function (opts) {
    var $el = $(
      '<div class="text-center py-14 px-4 col-span-full" role="alert">' +
        '<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">' + Ui.icon('alert', 'w-7 h-7') + '</div>' +
        '<h3 class="font-display text-xl font-semibold">' + Ui.escape(opts.title || 'Something went wrong') + '</h3>' +
        '<p class="mt-1 text-muted">' + Ui.escape(opts.message || 'Please try again.') + '</p>' +
        (opts.onRetry ? '<button type="button" class="btn btn-secondary mt-5" data-retry>' + Ui.icon('refresh', 'w-4 h-4') + ' Try again</button>' : '') +
      '</div>'
    );
    if (opts.onRetry) $el.find('[data-retry]').on('click', opts.onRetry);
    return $el;
  };

  /** Replace the page content with a "no access" screen (client-side 403 UX). */
  Ui.showForbidden = function () {
    var home = (window.Auth && Auth.homeFor) ? Auth.homeFor(Auth.getUser()) : 'login.html';
    $('#main').html(
      '<section class="mx-auto max-w-xl px-4 py-20 text-center">' +
        '<div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">' + Ui.icon('lock', 'w-8 h-8') + '</div>' +
        '<h1 class="font-display text-3xl font-semibold" tabindex="-1" id="forbidden-title">You don\'t have access to this page</h1>' +
        '<p class="mt-3 text-muted">This area is for administrators only. If you think you should have access, please contact an administrator.</p>' +
        '<div class="mt-7 flex flex-wrap justify-center gap-3">' +
          '<a class="btn btn-primary" href="' + home + '">Go back home</a>' +
          '<a class="btn btn-secondary" href="mailto:' + Ui.escape(CONFIG.SUPPORT_EMAIL) + '?subject=Access%20request">' + Ui.icon('mail', 'w-4 h-4') + ' Contact an admin</a>' +
        '</div>' +
      '</section>'
    );
    $('#forbidden-title').trigger('focus');
  };

  /* ---------- Confirm dialog (replaces window.confirm) ---------- */
  /**
   * Ui.confirm({ title, message, confirmText, danger }) -> Promise<boolean>
   * Accessible modal: role=dialog, focus trapped, Esc cancels, focus restored.
   */
  Ui.confirm = function (opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var prev = document.activeElement;
      var $m = $(
        '<div class="fixed inset-0 z-[90] flex items-center justify-center p-4">' +
          '<div class="absolute inset-0 bg-black/50" data-dismiss></div>' +
          '<div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="cf-title" aria-describedby="cf-msg">' +
            '<h2 id="cf-title" class="font-display text-xl font-semibold">' + Ui.escape(opts.title || 'Are you sure?') + '</h2>' +
            '<p id="cf-msg" class="mt-2 text-muted">' + Ui.escape(opts.message || '') + '</p>' +
            '<div class="mt-6 flex justify-end gap-3">' +
              '<button type="button" class="btn btn-secondary" data-cancel>Cancel</button>' +
              '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + Ui.escape(opts.confirmText || 'Confirm') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
      function done(val) {
        $(document).off('keydown.confirm');
        $m.remove();
        if (prev && prev.focus) prev.focus();
        resolve(val);
      }
      $m.on('click', '[data-ok]', function () { done(true); });
      $m.on('click', '[data-cancel], [data-dismiss]', function () { done(false); });
      $(document).on('keydown.confirm', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); done(false); }
        if (e.key === 'Tab') { // keep focus inside the dialog
          var $f = $m.find('button');
          var first = $f.first()[0], last = $f.last()[0];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      $('body').append($m);
      $m.find('[data-cancel]').trigger('focus'); // safest default focus
    });
  };

  window.Ui = Ui;
})(window, jQuery);
