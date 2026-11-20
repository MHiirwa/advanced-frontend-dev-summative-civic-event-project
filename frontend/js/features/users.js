/**
 * features/users.js — "My profile" (any signed-in user) and admin user management.
 * ROLE GUARDS:
 *  - Profile: users may edit full_name/email only; role and is_active are read-only
 *    (only administrators manage them, and the API ignores them on this endpoint).
 *  - User management (admin/users.html, data-access="admin"): admins can enable/disable
 *    accounts but never change a role (rule from the brief; there is no UI for it).
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  /* =================================================================
   * My profile: full_name and email are editable; role and is_active are read-only
   * (the API ignores them on PATCH /users/profile/me, and only admins manage them).
   * ================================================================= */
  function profile() {
    if (!boot('My profile', 'Keep your account details up to date.', 'profile')) return;
    put('<div class="sr-only" role="status">Loading…</div><div class="card form-card space-y-3" aria-hidden="true"><div class="skeleton h-5 w-1/3"></div><div class="skeleton h-10 w-full"></div><div class="skeleton h-10 w-full"></div></div>');
    Api.get('/users/profile/me').done(function (r) {
      var u = r.data || {}, H2 = 'font-display text-xl font-semibold text-brand-900';
      put('<div class="grid max-w-4xl gap-6 md:grid-cols-5">' +
        '<section class="card p-6 md:col-span-2" aria-labelledby="acct-title"><h2 id="acct-title" class="' + H2 + '">Account</h2>' +
          '<dl class="mt-4 space-y-4 text-sm">' +
            '<div><dt class="font-semibold text-muted">Role</dt><dd class="mt-1"><span class="badge ' + (u.role === 'admin' ? 'badge-announcement' : 'badge-event') + '">' + Ui.escape(u.role || 'user') + '</span></dd></div>' +
            '<div><dt class="font-semibold text-muted">Account status</dt><dd class="mt-1">' + C.accountStatus(u.is_active) + '</dd></div>' +
            (u.created_at ? '<div><dt class="font-semibold text-muted">Member since</dt><dd class="mt-1">' + Ui.escape(Ui.formatDate(u.created_at)) + '</dd></div>' : '') +
          '</dl>' +
          '<p class="mt-4 text-sm text-muted">Role and account status can only be changed by an administrator. Contact <a class="underline" href="mailto:' + Ui.escape(CONFIG.SUPPORT_EMAIL) + '">' + Ui.escape(CONFIG.SUPPORT_EMAIL) + '</a> if something looks wrong.</p>' +
        '</section>' +
        '<section class="card p-6 md:col-span-3" aria-labelledby="edit-title"><h2 id="edit-title" class="' + H2 + '">Edit details</h2>' +
          '<form id="profile-form" class="mt-4 space-y-4" novalidate>' +
            '<div data-field><label class="label" for="full_name">Full name</label><input class="input" id="full_name" autocomplete="name" required aria-required="true" value="' + Ui.escape(u.full_name || '') + '"><p data-error id="full_name-error" class="field-error hidden"></p></div>' +
            '<div data-field><label class="label" for="email">Email</label><input class="input" id="email" type="email" autocomplete="email" required aria-required="true" value="' + Ui.escape(u.email || '') + '"><p data-error id="email-error" class="field-error hidden"></p></div>' +
            '<div id="profile-alert" class="hidden"></div>' +
            '<button class="btn btn-primary" type="submit">Save changes</button>' +
          '</form></section></div>');
      var $form = $('#profile-form'), $btn = $form.find('[type=submit]');
      $form.on('input', 'input', function () { Ui.setFieldError($(this), ''); });
      $form.on('submit', function (e) {
        e.preventDefault();
        Ui.clearFieldErrors($form); Ui.formAlert($('#profile-alert'), '');
        var name = $('#full_name').val().trim(), email = $('#email').val().trim();
        if (!name) Ui.setFieldError($('#full_name'), 'Please enter your full name.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) Ui.setFieldError($('#email'), 'Please enter a valid email address, e.g. name@example.com.');
        var $bad = $form.find('[aria-invalid="true"]').first();
        if ($bad.length) { $bad.trigger('focus'); return; }
        if (name === u.full_name && email === u.email) { Ui.toast('Nothing to save: your details are unchanged.', 'info'); return; }
        Ui.setLoading($btn, true, 'Saving…');
        Api.patch('/users/profile/me', { full_name: name, email: email }).done(function (x) {
          u = $.extend(u, x.data || { full_name: name, email: email });
          Auth.setUser($.extend(Auth.getUser() || {}, { full_name: u.full_name, email: u.email }));
          Ui.toast('Your profile was updated.', 'success');
        }).fail(function (err) {
          if (err.status === 409) {
            // 409 Conflict: another account already uses this email.
            Ui.setFieldError($('#email'), 'This email is already used by another account. Please choose a different one.');
            Ui.formAlert($('#profile-alert'), 'Your changes were not saved because "' + email + '" is already in use.', 'warning');
            $('#email').trigger('focus');
          } else Ui.formAlert($('#profile-alert'), err.message, 'error');
        }).always(function () { Ui.setLoading($btn, false); });
      });
    }).fail(fail);
  }
  // ROLE GUARD: admin/users.html only (data-access="admin", Layout GUARD 2); GET /users and
  // PATCH /users/:id/enable|disable are admin-only. There is deliberately no role control:
  // the brief says admins cannot change a user's role from the UI.
  function adminUsers() { if (!boot('User management', 'Enable or disable community accounts.', 'users')) return; put(C.loading()); Api.get('/users').done(function (r) { var rows = r.data || []; put(C.table(['Name', 'Email', 'Role', 'Status', 'Action'], rows.map(function (u) { return '<tr><td>' + Ui.escape(u.full_name) + '</td><td>' + Ui.escape(u.email) + '</td><td>' + Ui.escape(u.role) + '</td><td>' + (u.is_active ? 'Active' : 'Disabled') + '</td><td><button class="btn btn-secondary btn-small toggle-user" data-id="' + u.id + '" data-active="' + u.is_active + '">' + (u.is_active ? 'Disable' : 'Enable') + '</button></td></tr>'; }).join(''))); $('.toggle-user').on('click', function () { var $b = $(this), active = $b.data('active') === true || $b.data('active') === 'true'; if (!window.confirm((active ? 'Disable' : 'Enable') + ' this user?')) return; Api.patch('/users/' + $b.data('id') + '/' + (active ? 'disable' : 'enable')).done(function () { adminUsers(); }).fail(Api.toastError); }); }).fail(fail); }

  App.register({
    'profile': profile,
    'users': adminUsers
  });
})(window, jQuery);
