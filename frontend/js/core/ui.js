/**
 * ui.js
 * ---------------------------------------------------------------
 * Small UI toolkit shared by every page: toasts, confirm dialog,
 * form helpers, formatting, skeletons, empty/error states, icons.
 */
(function (window, $) {
  'use strict';

  var FLASH_KEY = 'ce_flash';

  /* ---------- Icons (feather-style, inline SVG) ---------- */
  var ICONS = {
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    chevron: '<polyline points="6 9 12 15 18 9"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    audio: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>',
    video: '<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>',
    layout: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
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
    success: { box: 'border-green-600 bg-green-50 text-green-900', icon: 'check' },
    error: { box: 'border-red-600 bg-red-50 text-red-900', icon: 'alert' },
    warning: { box: 'border-amber-600 bg-amber-50 text-amber-900', icon: 'alert' },
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
    if (message) {
      $err.text(message).removeClass('hidden');
      $input.attr('aria-invalid', 'true');
      if ($err.attr('id')) $input.attr('aria-describedby', $err.attr('id'));
      $input.addClass('input-error');
    } else {
      $err.text('').addClass('hidden');
      $input.removeAttr('aria-invalid').removeClass('input-error');
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
