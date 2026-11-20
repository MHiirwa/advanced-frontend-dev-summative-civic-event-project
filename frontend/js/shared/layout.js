/**
 * layout.js
 * ---------------------------------------------------------------
 * Renders the shared header (logo, nav, global search, notification bell,
 * profile menu, admin menu) and footer, then runs the page access guard.
 *
 * Every page calls this first:
 *
 *   if (!Layout.init({ access: 'user', active: 'events' })) return;
 *
 *   access: 'guest' -> login/signup (logged-in users are bounced to their home)
 *           'user'  -> any logged-in user            (GUARD 1: Auth.requireAuth)
 *           'admin' -> administrators only           (GUARD 2: Auth.requireAdmin)
 *   active: which nav item gets aria-current="page"
 *
 * Returns false when the user was redirected or blocked, so the page script stops.
 */
(function (window, $) {
  'use strict';

  var Layout = {};

  // App pages live in pages/ (any signed-in user) and admin/ (admins only), so every
  // link is built from the site root. ROOT is '../' when we are inside one of those folders.
  var ROOT = /\/(pages|admin)\//.test(window.location.pathname) ? '../' : '';
  Layout.root = ROOT;

  var NAV = [
    { key: 'events', label: 'Events', href: ROOT + 'pages/events.html' },
    { key: 'announcements', label: 'Announcements', href: ROOT + 'pages/announcements.html' },
    { key: 'promos', label: 'Promos', href: ROOT + 'pages/promos.html' },
    { key: 'notifications', label: 'Notifications', href: ROOT + 'pages/notifications.html' }
  ];

  // ROLE GUARD (UX only): admin shortcuts are tagged data-role="admin" below, so GUARD 3
  // (Auth.applyRoleVisibility) removes them from the DOM for normal users. The backend
  // still rejects non-admin calls to these endpoints with 403.
  var ADMIN_MENU = [
    { label: 'Manage events', href: ROOT + 'admin/events.html', icon: 'calendar' },
    { label: 'Manage announcements', href: ROOT + 'admin/announcements.html', icon: 'audio' },
    { label: 'Manage promos', href: ROOT + 'admin/promos.html', icon: 'video' },
    { label: 'Manage users', href: ROOT + 'admin/users.html', icon: 'users' },
    { label: 'Registrations & feedback', href: ROOT + 'admin/registrations.html', icon: 'inbox' },
    { label: 'Manage notifications', href: ROOT + 'admin/notifications.html', icon: 'bell' },
    { label: 'Create event', href: ROOT + 'admin/create-event.html', icon: 'plus' },
    { label: 'Create announcement', href: ROOT + 'admin/create-announcement.html', icon: 'plus' },
    { label: 'Create promo', href: ROOT + 'admin/create-promo.html', icon: 'plus' }
  ];

  var LOGO = '<svg class="h-9 w-9" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
    '<rect width="40" height="40" rx="11" fill="#156555"/>' +
    '<rect x="9" y="11" width="22" height="19" rx="3.5" fill="none" stroke="#fff" stroke-width="2.4"/>' +
    '<path d="M9 17h22" stroke="#fff" stroke-width="2.4"/>' +
    '<path d="M15 8v5M25 8v5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="20" cy="24" r="2.6" fill="#e8912d"/></svg>';

  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  function navLink(item, active, mobile) {
    var isActive = item.key === active;
    var base = mobile ? 'block rounded-lg px-3 py-2.5 text-base font-medium' : 'rounded-lg px-3 py-2 text-sm font-semibold';
    return '<a href="' + item.href + '" class="' + base + ' ' +
      (isActive ? 'bg-brand-50 text-brand-800' : 'text-ink/80 hover:bg-brand-50 hover:text-brand-800') + '"' +
      (isActive ? ' aria-current="page"' : '') + '>' + item.label + '</a>';
  }

  function renderHeader(active) {
    var user = Auth.getUser() || {};
    var desktopLinks = NAV.map(function (i) { return navLink(i, active, false); }).join('');
    var mobileLinks = NAV.map(function (i) { return navLink(i, active, true); }).join('');

    var adminDesktop =
      '<a data-role="admin" href="' + ROOT + 'admin/dashboard.html" class="rounded-lg px-3 py-2 text-sm font-semibold ' +
        (active === 'dashboard' ? 'bg-brand-50 text-brand-800" aria-current="page' : 'text-ink/80 hover:bg-brand-50 hover:text-brand-800') + '">Dashboard</a>' +
      '<div data-role="admin" class="relative" data-dropdown>' +
        '<button type="button" class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-ink/80 hover:bg-brand-50 hover:text-brand-800" ' +
          'aria-expanded="false" aria-controls="admin-menu" data-dropdown-toggle>Admin ' + Ui.icon('chevron', 'w-4 h-4') + '</button>' +
        '<div id="admin-menu" class="absolute left-0 z-50 mt-2 hidden w-64 rounded-xl border border-brand-100 bg-white p-1 shadow-lg">' +
          ADMIN_MENU.map(function (m) {
            return '<a href="' + m.href + '" class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50">' + Ui.icon(m.icon, 'w-4 h-4 text-brand-700') + m.label + '</a>';
          }).join('') +
        '</div>' +
      '</div>';

    var adminMobile =
      '<div data-role="admin" class="mt-2 border-t border-brand-100 pt-2">' +
        '<p class="px-3 pb-1 text-xs font-bold uppercase tracking-wide text-muted">Admin</p>' +
        navLink({ key: 'dashboard', label: 'Dashboard', href: ROOT + 'admin/dashboard.html' }, active, true) +
        ADMIN_MENU.map(function (m) { return navLink({ key: '', label: m.label, href: m.href }, active, true); }).join('') +
      '</div>';

    var html =
      '<a href="#main" class="skip-link">Skip to main content</a>' +
      '<header class="sticky top-0 z-40 border-b border-brand-100 bg-white/95 backdrop-blur">' +
        '<div class="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">' +
          '<a href="' + ROOT + Auth.homeFor(user) + '" class="flex shrink-0 items-center gap-2" aria-label="CivicEvents+ home">' + LOGO +
            '<span class="font-display text-xl font-semibold text-brand-900">CivicEvents<span class="text-accent">+</span></span></a>' +

          '<nav aria-label="Primary" class="ml-4 hidden items-center gap-1 lg:flex">' + desktopLinks + adminDesktop + '</nav>' +

          // Global search (no backend search endpoint exists; pages/search.html filters client-side)
          '<form role="search" action="' + ROOT + 'pages/search.html" method="get" class="ml-auto hidden w-full max-w-xs md:block">' +
            '<label for="global-search" class="sr-only">Search events, announcements and promos</label>' +
            '<div class="relative"><span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">' + Ui.icon('search', 'w-4 h-4') + '</span>' +
            '<input id="global-search" name="q" type="search" placeholder="Search…" class="input !rounded-full !py-2 pl-9 text-sm" autocomplete="off"></div>' +
          '</form>' +

          '<div class="ml-auto flex items-center gap-1 md:ml-0">' +
            '<button type="button" id="notif-bell" class="relative rounded-full p-2.5 text-ink hover:bg-brand-50" aria-label="Notifications" aria-haspopup="dialog" aria-expanded="false">' +
              Ui.icon('bell', 'w-6 h-6') +
              '<span id="notif-badge" class="absolute right-0.5 top-0.5 hidden min-w-[1.15rem] rounded-full bg-accent px-1 text-center text-[11px] font-bold leading-[1.15rem] text-ink" aria-hidden="true">0</span>' +
            '</button>' +

            '<div class="relative" data-dropdown>' +
              '<button type="button" class="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-brand-50" aria-expanded="false" aria-controls="profile-menu" data-dropdown-toggle>' +
                '<span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white" aria-hidden="true">' + Ui.escape(initials(user.full_name)) + '</span>' +
                '<span class="hidden max-w-[8rem] truncate text-sm font-semibold sm:block">' + Ui.escape((user.full_name || 'Account').split(' ')[0]) + '</span>' +
                '<span class="sr-only">Account menu</span>' + Ui.icon('chevron', 'hidden w-4 h-4 sm:block') +
              '</button>' +
              '<div id="profile-menu" class="absolute right-0 z-50 mt-2 hidden w-64 rounded-xl border border-brand-100 bg-white p-1 shadow-lg">' +
                '<div class="border-b border-brand-100 px-3 py-2">' +
                  '<p class="truncate font-semibold">' + Ui.escape(user.full_name || '') + '</p>' +
                  '<p class="truncate text-xs text-muted">' + Ui.escape(user.email || '') + '</p>' +
                  '<span class="badge mt-1 ' + (user.role === 'admin' ? 'badge-announcement' : 'badge-event') + '">' + Ui.escape(user.role || 'user') + '</span>' +
                '</div>' +
                '<a href="' + ROOT + 'pages/profile.html" class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50">' + Ui.icon('user', 'w-4 h-4 text-brand-700') + 'My profile</a>' +
                // ROLE GUARD (UX only): personal dashboard, registrations and feedback are normal-user features.
                '<a data-role="user" href="' + ROOT + 'pages/dashboard.html" class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50">' + Ui.icon('layout', 'w-4 h-4 text-brand-700') + 'My dashboard</a>' +
                '<a data-role="user" href="' + ROOT + 'pages/my-registrations.html" class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50">' + Ui.icon('calendar', 'w-4 h-4 text-brand-700') + 'My registrations</a>' +
                '<a data-role="user" href="' + ROOT + 'pages/my-feedback.html" class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-brand-50">' + Ui.icon('star', 'w-4 h-4 text-brand-700') + 'My feedback</a>' +
                '<button type="button" id="logout-btn" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-800 hover:bg-red-50">' + Ui.icon('logout', 'w-4 h-4') + 'Log out</button>' +
              '</div>' +
            '</div>' +

            '<button type="button" id="mobile-toggle" class="rounded-full p-2.5 hover:bg-brand-50 lg:hidden" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">' + Ui.icon('menu', 'w-6 h-6') + '</button>' +
          '</div>' +
        '</div>' +

        '<div id="mobile-nav" class="hidden border-t border-brand-100 bg-white px-4 pb-4 pt-2 lg:hidden">' +
          '<form role="search" action="' + ROOT + 'pages/search.html" method="get" class="mb-2 md:hidden">' +
            '<label for="global-search-m" class="sr-only">Search events, announcements and promos</label>' +
            '<input id="global-search-m" name="q" type="search" placeholder="Search…" class="input" autocomplete="off"></form>' +
          '<nav aria-label="Mobile primary">' + mobileLinks + adminMobile + '</nav>' +
        '</div>' +
      '</header>';

    $('#app-header').html(html);
  }

  function renderFooter() {
    var year = new Date().getFullYear();
    $('#app-footer').html(
      '<footer class="mt-16 bg-brand-900 text-brand-100">' +
        '<div class="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">' +
          '<div class="lg:col-span-2"><p class="font-display text-2xl font-semibold text-white">CivicEvents<span class="text-accent">+</span></p>' +
            '<p class="mt-3 max-w-md text-sm leading-relaxed text-brand-200">Your community hub for local events, audio announcements and promo videos. Stay informed and take part in what happens around you.</p></div>' +
          '<nav aria-label="Footer explore"><p class="text-sm font-bold uppercase tracking-wide text-white">Explore</p>' +
            '<ul class="mt-3 space-y-2 text-sm"><li><a class="hover:text-white hover:underline" href="' + ROOT + 'pages/events.html">Events</a></li>' +
            '<li><a class="hover:text-white hover:underline" href="' + ROOT + 'pages/announcements.html">Announcements</a></li>' +
            '<li><a class="hover:text-white hover:underline" href="' + ROOT + 'pages/promos.html">Promos</a></li>' +
            '<li><a class="hover:text-white hover:underline" href="' + ROOT + 'pages/profile.html">My profile</a></li></ul></nav>' +
          '<div><p class="text-sm font-bold uppercase tracking-wide text-white">Help &amp; contact</p>' +
            '<ul class="mt-3 space-y-2 text-sm"><li><a class="inline-flex items-center gap-2 hover:text-white hover:underline" href="mailto:' + Ui.escape(CONFIG.SUPPORT_EMAIL) + '">' + Ui.icon('mail', 'w-4 h-4') + Ui.escape(CONFIG.SUPPORT_EMAIL) + '</a></li>' +
            '<li>Mon–Fri, 8:00–17:00</li>' +
            '<li>Need an admin? Email us with the subject “Access request”.</li></ul></div>' +
        '</div>' +
        '<div class="border-t border-white/10 px-4 py-4 text-center text-xs text-brand-200">© ' + year + ' CivicEvents+ · Built for the Advanced Frontend Development summative · Accessibility: keyboard navigable, screen-reader friendly</div>' +
      '</footer>'
    );
  }

  /* ---------- Dropdowns + mobile menu (disclosure pattern) ---------- */
  function closeDropdowns(except) {
    $('[data-dropdown]').each(function () {
      if (except && this === except) return;
      $(this).find('[data-dropdown-toggle]').attr('aria-expanded', 'false');
      $(this).children('div').addClass('hidden');
    });
  }

  function bindHeader() {
    $(document).on('click', '[data-dropdown-toggle]', function (e) {
      e.stopPropagation();
      var $dd = $(this).closest('[data-dropdown]');
      var open = $(this).attr('aria-expanded') === 'true';
      closeDropdowns($dd[0]);
      $(this).attr('aria-expanded', String(!open));
      $dd.children('div').toggleClass('hidden', open);
    });
    $(document).on('click', function (e) {
      if (!$(e.target).closest('[data-dropdown]').length) closeDropdowns();
    });
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape') {
        var $open = $('[data-dropdown-toggle][aria-expanded="true"]');
        if ($open.length) { closeDropdowns(); $open.first().trigger('focus'); }
      }
    });

    $('#mobile-toggle').on('click', function () {
      var open = $(this).attr('aria-expanded') === 'true';
      $(this).attr({ 'aria-expanded': String(!open), 'aria-label': open ? 'Open menu' : 'Close menu' });
      $('#mobile-nav').toggleClass('hidden', open);
    });

    $('#logout-btn').on('click', function () {
      Auth.logout('You have been logged out.', 'success');
    });
  }

  /* ---------- Public entry point ---------- */
  Layout.init = function (opts) {
    opts = opts || {};
    var access = opts.access || 'user';

    Ui.showFlash(); // toasts queued before a redirect (e.g. "Account created")

    if (access === 'guest') {
      // Already signed in? Skip the login/signup screens.
      if (Auth.isLoggedIn()) { window.location.replace(Auth.homeFor(Auth.getUser())); return false; }
      return true;
    }

    // GUARD 1 — must be logged in (redirects to login.html otherwise)
    if (!Auth.requireAuth()) return false;

    // Mount points for the shared header/footer; created if the page doesn't declare them.
    if (!$('#app-header').length) $('body').prepend('<div id="app-header"></div>');
    if (!$('#app-footer').length) $('body').append('<div id="app-footer"></div>');

    renderHeader(opts.active);
    renderFooter();
    // GUARD 3 — strip data-role="admin"/"user" elements that don't match the current role
    Auth.applyRoleVisibility($('#app-header'));
    bindHeader();
    Notifications.init();

    // GUARD 2 — admin-only pages show the "no access" screen to normal users
    if (access === 'admin' && !Auth.requireAdmin()) return false;

    return true;
  };

  window.Layout = Layout;
})(window, jQuery);
