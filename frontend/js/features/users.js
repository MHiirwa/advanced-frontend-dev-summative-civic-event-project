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
    if (!boot('My profile', '', 'profile')) return;
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
  // ROLE GUARD: admin/users.html only (data-access="admin", Layout GUARD 2); GET /users,
  // GET /users/:id and PATCH /users/:id/enable|disable are admin-only in the API.
  // There is deliberately no role control: the brief says admins cannot change a user's role.
  // Safety rule (UX): an admin can never disable their own account from the UI (it would lock
  // them out), and disabling another admin asks for an explicit confirmation.
  var USERS_PAGE_SIZE = 20; // the API's default page size (GET /users?page=&limit=)

  function roleChip(role) { return role === 'admin' ? C.chip('Admin', 'maize') : C.chip('User', 'blue'); }

  /** Confirm + PATCH enable/disable, then toast and refresh via `done`. */
  function toggleUser(u, $btn, done) {
    var me = Auth.getUser() || {}, disabling = u.is_active !== false;
    if (String(u.id) === String(me.id)) return; // never offered in the UI; guarded here too
    Ui.confirm({
      title: (disabling ? 'Disable ' : 'Enable ') + (u.full_name || 'this account') + '?',
      message: disabling
        ? (u.role === 'admin' ? 'This is an administrator account. They will be signed out of admin tools and cannot log in until re-enabled.' : 'They will not be able to log in until the account is enabled again.')
        : 'They will be able to log in again.',
      confirmText: disabling ? 'Disable account' : 'Enable account', danger: disabling
    }).then(function (ok) {
      if (!ok) return;
      Ui.setLoading($btn, true, disabling ? 'Disabling…' : 'Enabling…');
      Api.patch('/users/' + encodeURIComponent(u.id) + '/' + (disabling ? 'disable' : 'enable')).done(function () {
        Ui.toast((u.full_name || 'Account') + (disabling ? ' was disabled.' : ' was enabled.'), 'success');
        done();
      }).fail(function (err) { Ui.setLoading($btn, false); Api.toastError(err); });
    });
  }

  function adminUsers() {
    var id = new URLSearchParams(location.search).get('id');
    return id ? userDetail(id) : userList();
  }

  function userList() {
    if (!boot('Users', 'Enable or disable accounts. Roles cannot be changed here.', 'users')) return;
    var page = Math.max(1, parseInt(new URLSearchParams(location.search).get('page'), 10) || 1), me = Auth.getUser() || {};
    put('<div class="toolbar-row"><label class="sr-only" for="u-q">Search users on this page</label><input id="u-q" class="input max-w-xs" type="search" placeholder="Search name or email…">' +
        '<label class="sr-only" for="u-status">Status</label><select id="u-status" class="input !w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select></div>' +
      '<div id="u-table">' + Ui.skeletonRows(4) + '</div><nav id="u-pager" class="mt-4 flex items-center justify-between text-sm" aria-label="Users pages"></nav>');
    var rows = [];
    function render() {
      var q = $('#u-q').val().trim().toLowerCase(), st = $('#u-status').val();
      var list = rows.filter(function (u) {
        if (q && (u.full_name + ' ' + u.email).toLowerCase().indexOf(q) === -1) return false;
        if (st === 'active' && u.is_active === false) return false;
        if (st === 'disabled' && u.is_active !== false) return false;
        return true;
      });
      $('#u-table').html(list.length ? '<div class="table-shell"><table class="data-table"><caption class="sr-only">Users, page ' + page + '</caption><thead><tr><th scope="col">Name</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Joined</th><th scope="col"><span class="sr-only">Actions</span></th></tr></thead><tbody>' +
        list.map(function (u) {
          var self = String(u.id) === String(me.id);
          return '<tr><td><span class="cell-title">' + Ui.escape(u.full_name) + (self ? ' ' + C.chip('You', 'muted') : '') + '</span><span class="cell-sub">' + Ui.escape(u.email) + '</span></td>' +
            '<td>' + roleChip(u.role) + '</td><td>' + C.accountStatus(u.is_active) + '</td>' +
            '<td class="whitespace-nowrap text-muted">' + Ui.escape(Ui.formatDate(u.created_at)) + '</td>' +
            '<td><div class="row-actions"><a class="btn btn-ghost btn-sm" href="users.html?id=' + encodeURIComponent(u.id) + '">View</a>' +
              (self ? '' : '<button type="button" class="btn btn-secondary btn-sm toggle-user" data-id="' + Ui.escape(u.id) + '">' + (u.is_active === false ? 'Enable' : 'Disable') + '</button>') +
            '</div></td></tr>';
        }).join('') + '</tbody></table></div>'
        : C.empty(rows.length ? 'No users match' : 'No users on this page', rows.length ? 'Try another name, email or status.' : '', 'users'));
    }
    function load() {
      $('#u-table').html(Ui.skeletonRows(4));
      Api.get('/users', { page: page, limit: USERS_PAGE_SIZE }).done(function (r) {
        rows = r.data || [];
        render();
        // The API returns no total, so "Next" is offered while a full page comes back.
        $('#u-pager').html('<span class="text-muted">Page ' + page + '</span><span class="flex gap-2">' +
          '<a class="btn btn-secondary btn-sm' + (page > 1 ? '' : ' pointer-events-none opacity-50') + '" href="users.html?page=' + (page - 1) + '"' + (page > 1 ? '' : ' aria-disabled="true" tabindex="-1"') + '>Previous</a>' +
          '<a class="btn btn-secondary btn-sm' + (rows.length === USERS_PAGE_SIZE ? '' : ' pointer-events-none opacity-50') + '" href="users.html?page=' + (page + 1) + '"' + (rows.length === USERS_PAGE_SIZE ? '' : ' aria-disabled="true" tabindex="-1"') + '>Next</a></span>');
      }).fail(function (err) { $('#u-table').empty().append(Ui.errorState({ title: 'Couldn\'t load users', message: err.message, onRetry: load })); });
    }
    $('#u-q').on('input', Ui.debounce(render, 150)); $('#u-status').on('change', render);
    $('#u-table').on('click', '.toggle-user', function () {
      var uid = String($(this).attr('data-id')), u = rows.filter(function (x) { return String(x.id) === uid; })[0];
      if (u) toggleUser(u, $(this), load);
    });
    load();
  }

  /** Single user (GET /users/:id): read-only details + enable/disable. No role editing. */
  function userDetail(id) {
    if (!boot('User details', '', 'users')) return;
    var me = Auth.getUser() || {};
    function load() {
      put('<div class="card panel max-w-2xl">' + Ui.skeletonRows(3) + '</div>');
      Api.get('/users/' + encodeURIComponent(id)).done(function (r) {
        var u = r.data || {}, self = String(u.id) === String(me.id);
        $('main h1').first().text(u.full_name || 'User details');
        put('<a class="back-link mb-4" href="users.html">' + Ui.icon('back', 'w-4 h-4') + 'All users</a>' +
          '<section class="card panel max-w-2xl" aria-labelledby="ud-title">' +
            '<div class="panel-head"><h2 id="ud-title">Account</h2>' + (self ? C.chip('This is you', 'muted') : '<button type="button" id="ud-toggle" class="btn btn-secondary btn-sm">' + (u.is_active === false ? 'Enable account' : 'Disable account') + '</button>') + '</div>' +
            '<dl class="detail-list">' +
              '<dt>Name</dt><dd>' + Ui.escape(u.full_name) + '</dd>' +
              '<dt>Email</dt><dd><a class="text-link" href="mailto:' + Ui.escape(u.email) + '">' + Ui.escape(u.email) + '</a></dd>' +
              '<dt>Role</dt><dd>' + roleChip(u.role) + ' <span class="ml-1 text-xs text-muted">Roles can\'t be changed from the admin UI.</span></dd>' +
              '<dt>Status</dt><dd>' + C.accountStatus(u.is_active) + '</dd>' +
              '<dt>Joined</dt><dd>' + Ui.escape(Ui.formatDateTime(u.created_at)) + '</dd>' +
              '<dt>Last updated</dt><dd>' + Ui.escape(Ui.formatDateTime(u.updated_at)) + '</dd>' +
            '</dl></section>');
        $('#ud-toggle').on('click', function () { toggleUser(u, $(this), load); });
      }).fail(function (err) {
        $('#page-content').html('<a class="back-link mb-4" href="users.html">' + Ui.icon('back', 'w-4 h-4') + 'All users</a>').append(Ui.errorState({ title: 'Couldn\'t load this user', message: err.message, onRetry: load }));
      });
    }
    load();
  }

  App.register({
    'profile': profile,
    'users': adminUsers
  });
})(window, jQuery);
