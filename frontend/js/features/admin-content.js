/**
 * features/admin-content.js — admin "Manage events/announcements/promos" lists and the shared
 * create/edit form for all three content types.
 * ROLE GUARD: every page using this file is in admin/ (data-access="admin"), so boot() runs
 * Layout GUARD 2 and normal users see the "no access" screen. Create/update/delete/publish
 * endpoints are admin-only in the API as well.
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  // ROLE GUARD: admin/events|announcements|promos.html only (Layout GUARD 2). Shows drafts too, and
  // Delete / Publish / Unpublish call admin-only endpoints.
  function adminContent(type, endpoint, title, intro, createHref) {
    if (!boot(title, intro, type)) return;
    var LABEL = { events: 'event', announcements: 'announcement', promos: 'promo' }[type];
    var publishable = type !== 'events'; // the API has publish/unpublish for announcements + promos only
    var viewPage = { events: 'event-details', announcements: 'announcement-details', promos: 'promo-details' }[type];
    App.actions('<a class="btn btn-primary btn-sm" href="' + createHref + '">' + Ui.icon('plus', 'w-4 h-4') + 'Create ' + LABEL + '</a>');
    put('<div class="toolbar-row"><label class="sr-only" for="m-q">Search ' + type + '</label><input id="m-q" class="input max-w-xs" type="search" placeholder="Search ' + type + '…">' +
        '<label class="sr-only" for="m-filter">Filter</label><select id="m-filter" class="input !w-auto">' +
        (publishable ? '<option value="">All</option><option value="published">Published</option><option value="draft">Drafts</option>'
                     : '<option value="">All events</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option>') +
        '</select><span id="m-count" class="ml-auto text-sm text-muted" role="status"></span></div><div id="m-table">' + Ui.skeletonRows(4) + '</div>');
    var items = [];
    var preset = new URLSearchParams(location.search).get('filter');
    if (preset && $('#m-filter option[value="' + preset + '"]').length) $('#m-filter').val(preset);

    function row(x) {
      var actions = '<a class="btn btn-ghost btn-sm" href="../pages/' + viewPage + '.html?id=' + encodeURIComponent(x.id) + '">View</a>' +
        '<a class="btn btn-secondary btn-sm" href="' + createHref + '?id=' + encodeURIComponent(x.id) + '">Edit</a>' +
        (publishable ? '<button type="button" class="btn btn-secondary btn-sm m-publish" data-id="' + Ui.escape(x.id) + '">' + (x.published !== false ? 'Unpublish' : 'Publish') + '</button>' : '') +
        '<button type="button" class="btn btn-ghost btn-sm text-red-700 m-delete" data-id="' + Ui.escape(x.id) + '" aria-label="Delete ' + Ui.escape(x.title) + '">Delete</button>';
      var first = '<td><span class="cell-title">' + Ui.escape(x.title) + '</span><span class="cell-sub">' + Ui.escape(type === 'events' ? (x.location || '') : (x.description || '').slice(0, 80)) + '</span></td>';
      var when = type === 'events'
        ? '<td><span class="whitespace-nowrap">' + Ui.escape(Ui.formatDate(x.starts_at) || 'TBA') + '</span><span class="cell-sub">' + Ui.escape(C.timeRange(x.starts_at, x.ends_at)) + '</span></td>'
        : '<td class="whitespace-nowrap text-muted">' + Ui.escape(Ui.formatDate(x.created_at)) + '</td>';
      var status = '<td>' + (type === 'events' ? C.statusChip(Civic.status(x)) : C.status(x.published !== false)) + '</td>';
      return '<tr>' + first + when + status + '<td><div class="row-actions">' + actions + '</div></td></tr>';
    }
    function render() {
      var q = $('#m-q').val().trim().toLowerCase(), f = $('#m-filter').val();
      var list = items.filter(function (x) {
        if (q && [x.title, x.description, x.location].join(' ').toLowerCase().indexOf(q) === -1) return false;
        if (f === 'published' && x.published === false) return false;
        if (f === 'draft' && x.published !== false) return false;
        if (f === 'upcoming' && Civic.status(x) === 'completed') return false;
        if (f === 'completed' && Civic.status(x) !== 'completed') return false;
        return true;
      }).sort(type === 'events'
        ? function (a, b) { return new Date(b.starts_at || 0) - new Date(a.starts_at || 0); }
        : function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
      $('#m-count').text(items.length ? list.length + ' of ' + items.length : '');
      $('#m-table').html(list.length
        ? '<div class="table-shell"><table class="data-table"><caption class="sr-only">' + Ui.escape(title) + '</caption><thead><tr><th scope="col">' + (type === 'events' ? 'Event' : 'Title') + '</th><th scope="col">' + (type === 'events' ? 'Date' : 'Added') + '</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' + list.map(row).join('') + '</tbody></table></div>'
        : items.length ? C.empty('Nothing matches', 'Try another search or filter.', 'search')
          : C.empty('No ' + type + ' yet', 'Create the first ' + LABEL + ' to get started.', type === 'events' ? 'calendar' : type === 'announcements' ? 'audio' : 'video') +
            '<div class="mt-3 text-center"><a class="btn btn-primary btn-sm" href="' + createHref + '">' + Ui.icon('plus', 'w-4 h-4') + 'Create ' + LABEL + '</a></div>');
    }
    function load() {
      $('#m-table').html(Ui.skeletonRows(4));
      Api.get(endpoint).done(function (r) { items = r.data || []; render(); })
        .fail(function (err) { $('#m-table').empty().append(Ui.errorState({ title: 'Couldn\'t load ' + type, message: err.message, onRetry: load })); });
    }
    function find(id) { return items.filter(function (x) { return String(x.id) === String(id); })[0]; }
    $('#m-q').on('input', Ui.debounce(render, 150)); $('#m-filter').on('change', render);
    $('#m-table').on('click', '.m-delete', function () {
      var x = find($(this).attr('data-id')), $b = $(this); if (!x) return;
      Ui.confirm({ title: 'Delete “' + x.title + '”?', message: 'This permanently removes the ' + LABEL + (type === 'events' ? ' and its feedback. Events that anyone has registered for (even if they cancelled) can\'t be deleted.' : '.') + ' It cannot be undone.', confirmText: 'Delete', danger: true }).then(function (ok) {
        if (!ok) return;
        Ui.setLoading($b, true, 'Deleting…');
        Api.del(endpoint + '/' + encodeURIComponent(x.id)).done(function () { Ui.toast('“' + x.title + '” was deleted.', 'success'); load(); })
          .fail(function (err) { Ui.setLoading($b, false); Api.toastError(err); });
      });
    });
    $('#m-table').on('click', '.m-publish', function () {
      var x = find($(this).attr('data-id')), $b = $(this), action = x && x.published !== false ? 'unpublish' : 'publish'; if (!x) return;
      Ui.setLoading($b, true, action === 'publish' ? 'Publishing…' : 'Unpublishing…');
      Api.patch(endpoint + '/' + encodeURIComponent(x.id) + '/' + action).done(function () {
        Ui.toast('“' + x.title + '” is now ' + (action === 'publish' ? 'published.' : 'a draft.'), 'success'); load();
      }).fail(function (err) { Ui.setLoading($b, false); Api.toastError(err); });
    });
    load();
  }
  /* =================================================================
   * Create/edit forms for events, announcements and promos (admin/ pages).
   * ROLE GUARD: these pages have data-access="admin", so boot() -> Layout.init runs
   * GUARD 2 and normal users get the "no access" screen. The API also requires admin.
   *
   * Backend behaviour this form is built around:
   *  - events: POST/PUT ignore `published` (no draft state, no publish endpoint) -> no toggle.
   *  - announcements: POST/PUT accept `published`; PUT ignores a new audio file -> file only on create.
   *  - promos: PUT accepts `published`, POST ignores it -> we call PATCH /unpublish afterwards.
   *  Generic rule: after saving, if the saved `published` differs from the toggle, call
   *  PATCH /:id/publish|unpublish so the result always matches what the admin chose.
   * ================================================================= */
  function form(type) {
    var id = new URLSearchParams(location.search).get('id'), isEdit = !!id;
    var CFG = {
      events: { label: 'event', endpoint: '/events', kind: 'image', publishable: false, fileOnEdit: true },
      announcements: { label: 'announcement', endpoint: '/announcements', kind: 'audio', publishable: true, fileOnEdit: false },
      promos: { label: 'promo', endpoint: '/promos', kind: 'video', publishable: true, fileOnEdit: true }
    }[type];
    if (!boot((isEdit ? 'Edit ' : 'Create ') + CFG.label, '', type)) return;
    var rule = CONFIG.UPLOADS[CFG.kind], original = null, previewUrl = null;

    function field(name, label, input, hint) {
      return '<div data-field><label class="label" for="f-' + name + '">' + label + '</label>' + input +
        (hint ? '<p id="f-' + name + '-hint" class="mt-1 text-sm text-muted">' + hint + '</p>' : '') +
        '<p data-error id="f-' + name + '-error" class="field-error hidden"></p></div>';
    }
    function text(name, label, required, tag) {
      var attrs = ' class="input" id="f-' + name + '" name="' + name + '"' + (required ? ' required aria-required="true"' : '');
      return field(name, label + (required ? '' : ' <span class="text-muted">(optional)</span>'), tag === 'textarea' ? '<textarea' + attrs + ' rows="4"></textarea>' : '<input' + attrs + ' type="' + (tag || 'text') + '">');
    }
    var fields = text('title', 'Title', true);
    if (type === 'events') fields += text('description', 'Description', false, 'textarea') + text('location', 'Location', true) +
      '<div class="two-col">' + text('starts_at', 'Starts at', true, 'datetime-local') + text('ends_at', 'Ends at', true, 'datetime-local') + '</div>';
    if (type === 'promos') fields += text('description', 'Description', true, 'textarea') + text('caption_text', 'Caption text (shown as English captions and a transcript)', true, 'textarea');

    var fileLabel = { image: 'Event image', audio: 'Audio file', video: 'Video file' }[CFG.kind];
    var fileHint = 'Allowed: ' + rule.exts.join(', ') + '. Maximum ' + rule.maxMB + ' MB.' + (isEdit ? ' Leave empty to keep the current file.' : '');
    var fileBlock = (!isEdit || CFG.fileOnEdit)
      ? field('file', fileLabel + (isEdit ? ' <span class="text-muted">(optional)</span>' : ''),
          '<input class="input" type="file" id="f-file" name="' + CFG.kind + '" accept="' + rule.exts.map(function (x) { return '.' + x; }).join(',') + '" aria-describedby="f-file-hint"' + (isEdit ? '' : ' required aria-required="true"') + '>', fileHint)
      : '<div><p class="label">Audio file</p><p class="text-sm text-muted">The audio of an existing announcement can\'t be replaced (the API keeps the original file). Create a new announcement to publish different audio.</p></div>';
    var publishBlock = CFG.publishable
      ? '<div class="flex items-start gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4"><input type="checkbox" role="switch" id="f-published" class="mt-1 h-5 w-5 accent-[#2463EB]" checked aria-describedby="f-published-hint">' +
        '<div><label for="f-published" class="font-semibold">Published</label><p id="f-published-hint" class="text-sm text-muted">When on, everyone can see this ' + CFG.label + '. Turn off to keep it as a hidden draft.</p></div></div>'
      : '<p class="rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-muted">Events are visible to everyone as soon as they are saved. The API has no draft state for events.</p>';

    put('<div class="form-card card"><form id="content-form" novalidate>' + fields + fileBlock +
      '<div id="file-preview" class="hidden" aria-live="polite"></div>' + publishBlock +
      '<div id="upload-progress" class="hidden"><div class="mb-1 flex justify-between text-sm font-semibold"><span id="upload-label">Uploading…</span><span id="upload-pct">0%</span></div>' +
        '<div class="h-2.5 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-labelledby="upload-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="upload-bar" class="h-full bg-brand-700 transition-all" style="width:0%"></div></div></div>' +
      '<div id="form-alert" class="hidden"></div>' +
      '<div class="flex flex-wrap gap-3"><button class="btn btn-primary" type="submit"' + (isEdit ? ' disabled' : '') + '>' + (isEdit ? 'Save changes' : 'Create ' + CFG.label) + '</button><a class="btn btn-ghost" href="' + type + '.html">Cancel</a></div>' +
    '</form></div>');
    var $form = $('#content-form'), $submit = $form.find('[type=submit]');

    /* ---------- Dates: datetime-local <-> ISO (keep the admin's local time zone) ---------- */
    function toLocalInput(v) {
      if (!v) return '';
      var d = new Date(v); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }
    function checkDates() {
      var s = $('#f-starts_at').val(), e = $('#f-ends_at').val();
      var bad = s && e && new Date(e) <= new Date(s), msg = 'End time must be after the start time.';
      // Only clear our own message, so a "This field is required." error stays visible.
      if (bad) Ui.setFieldError($('#f-ends_at'), msg);
      else if ($('#f-ends_at-error').text() === msg) Ui.setFieldError($('#f-ends_at'), '');
      return !bad;
    }
    $('#f-starts_at, #f-ends_at').on('change', checkDates);
    // Clear a "required" error as soon as the field gets a value.
    $form.on('input change', 'input:not([type=file]), textarea', function () {
      if ($(this).val().trim() && $('#' + this.id + '-error').text() === 'This field is required.') Ui.setFieldError($(this), '');
    });

    /* ---------- File: validate + preview before upload ---------- */
    function size(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
    function showPreview(html) { $('#file-preview').toggleClass('hidden', !html).html(html || ''); }
    function existingPreview() {
      if (!original) return showPreview('');
      var img = type === 'events' && C.eventImage(original);
      if (img) return showPreview('<p class="label">Current image</p><img src="' + Ui.escape(img) + '" alt="Current image for ' + Ui.escape(original.title) + '" class="max-h-56 rounded-xl border border-brand-100 object-cover">');
      var media = original.audio_url || original.video_url;
      showPreview(media ? '<p class="text-sm text-muted">Current file: <a class="underline" href="' + Ui.escape(media) + '" target="_blank" rel="noopener">' + Ui.escape(media.split('/').pop()) + '</a></p>' : '');
    }
    $('#f-file').on('change', function () {
      var file = this.files[0];
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
      if (!file) { Ui.setFieldError($(this), ''); return existingPreview(); }
      var err = Ui.validateFile(file, CFG.kind);
      Ui.setFieldError($(this), err || '');
      if (err) { this.value = ''; return existingPreview(); }
      var info = '<p class="text-sm"><span class="font-semibold">' + Ui.escape(file.name) + '</span> <span class="text-muted">· ' + size(file.size) + '</span></p>';
      if (CFG.kind === 'image') {
        previewUrl = URL.createObjectURL(file);
        showPreview('<p class="label">Preview</p><img src="' + previewUrl + '" alt="Preview of the selected image" class="max-h-56 rounded-xl border border-brand-100 object-cover">' + info);
      } else showPreview('<div class="flex items-center gap-3 rounded-xl border border-brand-100 p-3">' + Ui.icon(CFG.kind, 'w-6 h-6 text-brand-700') + info + '</div>');
    });

    /* ---------- Edit mode: load the current values ---------- */
    if (isEdit) {
      Api.get(CFG.endpoint + '/' + encodeURIComponent(id)).done(function (r) {
        original = r.data || {};
        ['title', 'description', 'location', 'caption_text'].forEach(function (k) { $('#f-' + k).val(original[k] || ''); });
        $('#f-starts_at').val(toLocalInput(original.starts_at)); $('#f-ends_at').val(toLocalInput(original.ends_at));
        $('#f-published').prop('checked', original.published !== false);
        existingPreview();
        $submit.prop('disabled', false);
      }).fail(function (err) {
        Ui.formAlert($('#form-alert'), 'Couldn\'t load this ' + CFG.label + ': ' + err.message + ' Reload the page to try again.', 'error');
      });
    }

    /* ---------- Submit ---------- */
    function progress(pct) {
      $('#upload-progress').removeClass('hidden');
      $('#upload-bar').css('width', pct + '%'); $('#upload-pct').text(pct + '%');
      $('#upload-progress [role=progressbar]').attr('aria-valuenow', pct);
      $('#upload-label').text(pct < 100 ? 'Uploading…' : 'Processing…');
    }
    $form.on('submit', function (e) {
      e.preventDefault();
      Ui.clearFieldErrors($form); Ui.formAlert($('#form-alert'), '');
      var $file = $('#f-file'), file = $file.length ? $file[0].files[0] : null;
      $form.find('[required]').not('[type=file]').each(function () { if (!$(this).val().trim()) Ui.setFieldError($(this), 'This field is required.'); });
      if (type === 'events') checkDates();
      if ($file.length && !isEdit && !file) Ui.setFieldError($file, 'Please choose a file to upload.');
      if (file) { var ferr = Ui.validateFile(file, CFG.kind); if (ferr) Ui.setFieldError($file, ferr); }
      var $bad = $form.find('[aria-invalid="true"]').first();
      if ($bad.length) { $bad.trigger('focus'); return; }

      var fd = new FormData(), wantPublished = CFG.publishable ? $('#f-published').is(':checked') : null;
      ['title', 'description', 'location', 'caption_text'].forEach(function (k) { if ($('#f-' + k).length) fd.append(k, $('#f-' + k).val().trim()); });
      ['starts_at', 'ends_at'].forEach(function (k) { if ($('#f-' + k).length) fd.append(k, new Date($('#f-' + k).val()).toISOString()); });
      if (CFG.publishable) fd.append('published', String(wantPublished));
      if (file) fd.append(CFG.kind, file);

      Ui.setLoading($submit, true, file ? 'Uploading…' : 'Saving…');
      $form.find('input, textarea').prop('disabled', true);
      if (file) progress(0);
      var url = CFG.endpoint + (isEdit ? '/' + encodeURIComponent(id) : '');
      Api.upload(isEdit ? 'PUT' : 'POST', url, fd, { onProgress: file ? progress : null })
        .then(function (res) {
          var saved = res.data || {};
          // Fix up the published state if the create/update call ignored it (see header comment).
          if (CFG.publishable && saved.id != null && saved.published !== wantPublished) {
            // The item is already saved, so a failure here must not look like a failed save (a retry would duplicate it).
            return Api.patch(CFG.endpoint + '/' + encodeURIComponent(saved.id) + '/' + (wantPublished ? 'publish' : 'unpublish'))
              .then(null, function () { return $.Deferred().resolve({ publishFailed: true }).promise(); });
          }
        })
        .done(function (r) {
          if (r && r.publishFailed) Ui.flash('Saved, but the published setting could not be updated. Use Publish/Unpublish in the list.', 'warning');
          else Ui.flash(isEdit ? 'Your changes were saved.' : 'The ' + CFG.label + ' was created.', 'success');
          window.location.href = type + '.html';
        })
        .fail(function (err) {
          Ui.setLoading($submit, false);
          $form.find('input, textarea').prop('disabled', false);
          $('#upload-progress').addClass('hidden');
          Object.keys(err.fieldErrors || {}).forEach(function (k) { Ui.setFieldError($('#f-' + (k === CFG.kind ? 'file' : k)), err.fieldErrors[k]); });
          Ui.formAlert($('#form-alert'), err.isNetwork ? 'Could not reach the server. Check your connection and press the button again to retry.' : err.message, 'error');
        });
    });
  }

  App.register({
    'admin-events': function () { return adminContent('events', '/events', 'Manage events', '', 'create-event.html'); },
    'admin-announcements': function () { return adminContent('announcements', '/announcements', 'Manage announcements', '', 'create-announcement.html'); },
    'admin-promos': function () { return adminContent('promos', '/promos', 'Manage promos', '', 'create-promo.html'); },
    'create-event': function () { return form('events'); },
    'create-announcement': function () { return form('announcements'); },
    'create-promo': function () { return form('promos'); }
  });
})(window, jQuery);
