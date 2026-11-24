/**
 * layout.js
 * ---------------------------------------------------------------
 * The one shared header (logo, primary nav with the Explore menu, search,
 * notification bell, profile menu, admin menu) and footer for EVERY page except
 * the sign-in/sign-up screens, plus the page access guard.
 *
 * Every page calls this first:
 *
 *   if (!Layout.init({ access: 'user', active: 'events' })) return;
 *
 *   access: 'guest'  -> login/signup (signed-in users are bounced to their home; no header)
 *           'public' -> home page: header for guests or signed-in users, no guard
 *           'user'   -> any signed-in user            (GUARD 1: Auth.requireAuth)
 *           'admin'  -> administrators only           (GUARD 2: Auth.requireAdmin)
 *   active: the current page key; mapped to a nav item that gets aria-current="page"
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

  /** Page key -> primary nav item. Event pages and both communities live under "Explore events". */
  var SECTION = {
    home: 'home', events: 'explore', 'event-details': 'explore', explore: 'explore', community: 'explore', search: 'explore',
    announcements: 'announcements', 'announcement-details': 'announcements', promos: 'promos', 'promo-details': 'promos',
    'my-registrations': 'my-registrations'
  };

  /**
   * Primary nav by audience. ROLE GUARD (UX only):
   *  - guests:  Home · Explore events · Announcements · Promos
   *  - users:   Home · Explore events · My registrations · Announcements · Promos
   *  - admins:  Home · Explore events · Announcements · Promos · Dashboard · Admin
   *             (Dashboard = admin overview, Admin = content management)
   */
  function navFor(signedIn) {
    var home = { key: 'home', label: 'Home', href: ROOT + 'index.html' },
        explore = { key: 'explore', label: 'Explore events', explore: true },
        ann = { key: 'announcements', label: 'Announcements', href: ROOT + 'pages/announcements.html' },
        promos = { key: 'promos', label: 'Promos', href: ROOT + 'pages/promos.html' };
    if (!signedIn) return [home, explore, ann, promos];
    if (Auth.isAdmin()) return [home, explore, ann, promos,
      { key: 'admin-dashboard', label: 'Dashboard', href: ROOT + 'admin/dashboard.html' },
      { key: 'admin', label: 'Admin', href: ROOT + 'admin/events.html' }];
    return [home, explore, { key: 'my-registrations', label: 'My registrations', href: ROOT + 'pages/my-registrations.html' }, ann, promos];
  }

  // ROLE GUARD (UX only): admin destinations. They are tagged data-role="admin" in the header,
  // so GUARD 3 (Auth.applyRoleVisibility) removes them from the DOM for normal users, and the
  // admin sub-navigation is only drawn on admin/ pages (already protected by GUARD 2).
  // The backend still rejects non-admin calls to these endpoints with 403.
  var ADMIN_SECTIONS = [
    { key: 'dashboard', label: 'Dashboard', href: ROOT + 'admin/dashboard.html', icon: 'layout' },
    { key: 'admin-events', label: 'Events', href: ROOT + 'admin/events.html', icon: 'calendar', also: ['create-event'] },
    { key: 'admin-announcements', label: 'Announcements', href: ROOT + 'admin/announcements.html', icon: 'megaphone', also: ['create-announcement'] },
    { key: 'admin-promos', label: 'Promos', href: ROOT + 'admin/promos.html', icon: 'video', also: ['create-promo'] },
    { key: 'users', label: 'Users', href: ROOT + 'admin/users.html', icon: 'users' },
    { key: 'registrations', label: 'Registrations', href: ROOT + 'admin/registrations.html', icon: 'inbox' },
    { key: 'admin-notifications', label: 'Notifications', href: ROOT + 'admin/notifications.html', icon: 'bell' }
  ];
  // Brand mark (assets/images/civicevents-logo.svg, transparent PNG). Decorative: the link carries the name.
  var LOGO = '<img src="' + ROOT + 'assets/images/civicevents-logo.svg" alt="" width="36" height="36" class="h-9 w-9 object-contain">';

  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  /* ---------- Explore menu content (shared by desktop panel and mobile list) ---------- */
  function communities() {
    return Object.keys(Civic.COMMUNITIES).map(function (k) { return Civic.COMMUNITIES[k]; });
  }
  var BROWSE = [
    { label: 'All events', href: ROOT + 'pages/events.html' },
    { label: 'Announcements', href: ROOT + 'pages/announcements.html' },
    { label: 'Promos', href: ROOT + 'pages/promos.html' }
  ];

  function explorePanel() {
    return '<div id="explore-panel" class="explore-panel" hidden>' +
      '<div class="mx-auto grid max-w-7xl items-center gap-2 px-4 py-2 md:grid-cols-[1fr_1fr_auto] md:gap-6">' +
        communities().map(function (c) {
          // Compact row: small logo on the left, title on the right, one-line description below it.
          return '<a class="explore-dest" data-explore-link href="' + ROOT + c.href + '">' +
            '<span class="explore-logo' + (c.logoCrop ? ' crop-' + c.logoCrop : '') + '"><img src="' + ROOT + c.logo + '" alt="' + Ui.escape(c.logoAlt) + '" loading="lazy"></span>' +
            '<span class="min-w-0"><span class="explore-title">' + Ui.escape(c.title) + '</span>' +
            '<span class="explore-text">' + Ui.escape(c.short) + '</span></span></a>';
        }).join('') +
        '<div class="explore-browse"><p class="explore-browse-title">Browse</p>' +
          BROWSE.map(function (b) { return '<a data-explore-link href="' + b.href + '">' + b.label + '</a>'; }).join('') +
        '</div>' +
      '</div></div>';
  }

  /* ---------- Header ---------- */
  function navItem(item, current) {
    var on = item.key === current;
    if (item.explore) {
      return '<div class="nav-explore flex">' +
        '<button type="button" id="explore-toggle" class="nav-item' + (on ? ' is-current' : '') + '" aria-expanded="false" aria-controls="explore-panel">' +
          'Explore events' + Ui.icon('chevron', 'nav-chevron w-4 h-4') + '</button></div>';
    }
    return '<a class="nav-item' + (on ? ' is-current' : '') + '" href="' + item.href + '"' + (on ? ' aria-current="page"' : '') + '>' + item.label + '</a>';
  }

  function mobileLink(href, label, on, extraAttr) {
    return '<a href="' + href + '" class="block rounded-md px-3 py-2.5 text-base font-medium ' + (on ? 'bg-brand-50 text-brand-800' : 'text-ink hover:bg-brand-50') + '"' + (on ? ' aria-current="page"' : '') + (extraAttr || '') + '>' + label + '</a>';
  }

  function renderHeader(active, signedIn, adminPage) {
    var user = Auth.getUser() || {};
    // On admin/ pages the "Dashboard" item is current and the public sections are not.
    var current = adminPage ? 'admin' : (SECTION[active] || '');

    var right = signedIn
      // Right-hand group, all vertically centred with equal gaps: search, notifications, account.
      // Search opens pages/search.html (no backend search endpoint; results are filtered client-side).
      ? '<form role="search" action="' + ROOT + 'pages/search.html" method="get" class="header-search hidden xl:flex">' +
          '<label for="global-search" class="sr-only">Search events, announcements and promos</label>' + Ui.icon('search', 'w-4 h-4') +
          '<input id="global-search" name="q" type="search" class="input" placeholder="Search…" autocomplete="off"></form>' +
        '<a href="' + ROOT + 'pages/search.html" class="hidden rounded-full p-2 text-ink hover:bg-brand-50 sm:inline-flex xl:hidden" aria-label="Search">' + Ui.icon('search', 'w-5 h-5') + '</a>' +
        '<button type="button" id="notif-bell" class="relative rounded-full p-2 text-ink hover:bg-brand-50" aria-label="Notifications" aria-haspopup="dialog" aria-expanded="false">' +
          Ui.icon('bell', 'w-5 h-5') +
          '<span id="notif-badge" class="absolute right-0.5 top-0.5 hidden min-w-[1.15rem] rounded-full bg-coral-text px-1 text-center text-[11px] font-bold leading-[1.15rem] text-white" aria-hidden="true">0</span>' +
        '</button>' +
        '<div class="relative" data-dropdown>' +
          '<button type="button" class="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-brand-50" aria-expanded="false" aria-controls="profile-menu" data-dropdown-toggle>' +
            '<span class="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white" aria-hidden="true">' + Ui.escape(initials(user.full_name)) + '</span>' +
            '<span class="hidden max-w-[8rem] truncate text-sm font-medium sm:block">' + Ui.escape((user.full_name || 'Account').split(' ')[0]) + '</span>' +
            '<span class="sr-only">Account menu for ' + Ui.escape(user.full_name || 'your account') + '</span>' +
          '</button>' +
          '<div id="profile-menu" class="absolute right-0 z-50 mt-2 hidden w-64 rounded-lg border border-line bg-white p-1 shadow-lg">' +
            '<div class="border-b border-line px-3 py-2">' +
              '<p class="truncate font-semibold">' + Ui.escape(user.full_name || '') + '</p>' +
              '<p class="truncate text-xs text-muted">' + Ui.escape(user.email || '') + '</p>' +
              '<span class="badge mt-1 ' + (user.role === 'admin' ? 'badge-announcement' : 'badge-event') + '">' + Ui.escape(user.role || 'user') + '</span>' +
            '</div>' +
            '<a href="' + ROOT + 'pages/profile.html" class="block rounded-md px-3 py-2 text-sm hover:bg-brand-50">My profile</a>' +
            // ROLE GUARD (UX only): personal dashboard, registrations and feedback are normal-user features.
            '<a data-role="user" href="' + ROOT + 'pages/dashboard.html" class="block rounded-md px-3 py-2 text-sm hover:bg-brand-50">My dashboard</a>' +
            '<a data-role="user" href="' + ROOT + 'pages/my-registrations.html" class="block rounded-md px-3 py-2 text-sm hover:bg-brand-50">My registrations</a>' +
            '<a data-role="user" href="' + ROOT + 'pages/my-feedback.html" class="block rounded-md px-3 py-2 text-sm hover:bg-brand-50">My feedback</a>' +
            '<a href="' + ROOT + 'pages/notifications.html" class="block rounded-md px-3 py-2 text-sm hover:bg-brand-50">All notifications</a>' +
            // ROLE GUARD (UX only): admin shortcuts, removed from the DOM for normal users by GUARD 3.
            '<div data-role="admin" class="my-1 border-t border-line pt-1">' +
              '<a href="' + ROOT + 'admin/dashboard.html" class="block rounded-md px-3 py-2 text-sm hover:bg-brand-50">Admin dashboard</a>' +
              '<a href="' + ROOT + 'admin/users.html" class="block rounded-md px-3 py-2 text-sm hover:bg-brand-50">Manage users</a>' +
              '<a href="' + ROOT + 'admin/notifications.html" class="block rounded-md px-3 py-2 text-sm hover:bg-brand-50">Manage notifications</a>' +
            '</div>' +
            '<div class="my-1 border-t border-line"></div>' +
            '<button type="button" id="logout-btn" class="block w-full rounded-md px-3 py-2 text-left text-sm text-red-800 hover:bg-red-50">Log out</button>' +
          '</div>' +
        '</div>'
      : '<a class="btn btn-ghost btn-sm hidden sm:inline-flex" href="' + ROOT + 'login.html">Log in</a>' +
        '<a class="btn btn-primary btn-sm" href="' + ROOT + 'signup.html">Sign up</a>';

    var mobileExplore =
      '<button type="button" id="m-explore-toggle" class="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-base font-medium ' + (current === 'explore' ? 'bg-brand-50 text-brand-800' : 'text-ink hover:bg-brand-50') + '" aria-expanded="false" aria-controls="m-explore-list">Explore events ' + Ui.icon('chevron', 'nav-chevron w-4 h-4') + '</button>' +
      '<div id="m-explore-list" class="ml-3 border-l border-line pl-2" hidden>' +
        communities().map(function (c) { return mobileLink(ROOT + c.href, '<span class="inline-flex items-center gap-2">' + Ui.icon(c.icon, 'w-4 h-4 text-muted') + Ui.escape(c.title) + '</span>'); }).join('') +
        mobileLink(ROOT + 'pages/events.html', 'All events') +
      '</div>';

    var html =
      '<a href="#main" class="skip-link">Skip to main content</a>' +
      '<header class="site-header sticky top-0 z-40 border-b border-line bg-white">' +
        '<div class="mx-auto flex h-16 max-w-7xl items-stretch gap-2 px-4">' +
          // The logo always returns to the home page (index.html), signed in or not.
          '<a href="' + ROOT + 'index.html" class="flex shrink-0 items-center gap-2" aria-label="CivicEvents home">' + LOGO +
            '<span class="text-lg font-bold tracking-tight text-ink">CivicEvents</span></a>' +
          // Primary navigation, centred between the logo and the account actions.
          '<nav aria-label="Primary" class="mx-auto hidden items-stretch gap-0.5 lg:flex">' +
            navFor(signedIn).map(function (i) { return navItem(i, current); }).join('') +
          '</nav>' +

          '<div class="ml-auto flex items-center lg:ml-0 ' + (signedIn ? 'gap-2' : 'gap-1') + '">' + right +
            '<button type="button" id="mobile-toggle" class="rounded-full p-2.5 hover:bg-brand-50 lg:hidden" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">' + Ui.icon('menu', 'w-5 h-5') + '</button>' +
          '</div>' +
        '</div>' +
        explorePanel() +
        '<div id="mobile-nav" class="hidden max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-line bg-white px-4 pb-4 pt-2 lg:hidden">' +
          (signedIn
            ? '<form role="search" action="' + ROOT + 'pages/search.html" method="get" class="mb-2 md:hidden">' +
                '<label for="global-search-m" class="sr-only">Search events, announcements and promos</label>' +
                '<input id="global-search-m" name="q" type="search" placeholder="Search…" class="input" autocomplete="off"></form>'
            : '') +
          '<nav aria-label="Mobile primary">' +
            navFor(signedIn).map(function (i) { return i.explore ? mobileExplore : mobileLink(i.href, i.label, current === i.key); }).join('') +
            (signedIn ? '' : '<div class="mt-3 flex gap-2 border-t border-line pt-3"><a class="btn btn-secondary flex-1" href="' + ROOT + 'login.html">Log in</a><a class="btn btn-primary flex-1" href="' + ROOT + 'signup.html">Sign up</a></div>') +
          '</nav>' +
        '</div>' +
      '</header>';

    $('#app-header').html(html);
  }


  /* ---------- Admin shell ----------
   * Admin pages get their own workspace instead of the public header: a left sidebar
   * with every admin tool (grouped), and a slim top bar (menu button on small screens,
   * "View site", notifications). ROLE GUARD: only rendered when the page is in admin/
   * AND the signed-in user is an admin (Layout.init); normal users get the public header
   * and the "no access" screen instead. */
  // Sidebar groups, separated by thin dividers (no group headings), as in the admin mock-up.
  var ADMIN_GROUPS = [
    ['dashboard', 'admin-events', 'registrations'],
    ['admin-announcements', 'admin-promos'],
    ['users', 'admin-notifications']
  ];
  function renderAdminShell(pageKey) {
    var user = Auth.getUser() || {};
    var byKey = {}; ADMIN_SECTIONS.forEach(function (m) { byKey[m.key] = m; });
    var nav = ADMIN_GROUPS.map(function (keys) {
      return '<div class="side-section">' + keys.map(function (k) {
        var m = byKey[k], on = m.key === pageKey || (m.also || []).indexOf(pageKey) !== -1;
        var label = k === 'dashboard' ? 'Overview' : m.label;
        // Notifications shows the unread count (kept in sync by js/shared/notifications.js).
        var count = k === 'admin-notifications' ? '<span class="side-count" data-unread-count hidden></span>' : '';
        return '<a class="side-link' + (on ? ' is-current' : '') + '" href="' + m.href + '"' + (on ? ' aria-current="page"' : '') + '>' + Ui.icon(m.icon, 'w-[18px] h-[18px]') + '<span>' + label + '</span>' + count + '</a>';
      }).join('') + '</div>';
    }).join('');
    var html =
      '<a href="#main" class="skip-link">Skip to main content</a>' +
      '<aside id="admin-sidebar" class="admin-sidebar" aria-label="Admin">' +
        '<a href="' + ROOT + 'admin/dashboard.html" class="side-brand" aria-label="CivicEvents admin dashboard">' + LOGO + '<span>CivicEvents</span><span class="side-badge">Admin</span></a>' +
        '<nav class="side-nav" aria-label="Admin tools">' + nav + '</nav>' +
        '<div class="side-foot">' +
          '<a class="side-link" href="' + ROOT + 'index.html">' + Ui.icon('external', 'w-[18px] h-[18px]') + '<span>View public site</span></a>' +
          '<div class="side-user"><span class="side-avatar" aria-hidden="true">' + Ui.escape(initials(user.full_name)) + '</span>' +
            '<span class="min-w-0 flex-1"><span class="block truncate text-sm font-semibold">' + Ui.escape(user.full_name || 'Admin') + '</span>' +
            '<a class="text-xs text-muted hover:underline" href="' + ROOT + 'pages/profile.html">My profile</a></span>' +
            '<button type="button" id="logout-btn" class="side-logout" aria-label="Log out">' + Ui.icon('logout', 'w-[18px] h-[18px]') + '</button></div>' +
        '</div>' +
      '</aside>' +
      '<div id="admin-scrim" class="admin-scrim" hidden></div>' +
      // Top bar on every screen size: menu button (small screens), search, "View site" and the
      // notification bell (same drawer and unread badge as the public header).
      '<header class="admin-topbar">' +
        '<button type="button" id="admin-menu-toggle" class="rounded-md p-2 text-ink hover:bg-brand-50 lg:hidden" aria-label="Open admin menu" aria-expanded="false" aria-controls="admin-sidebar">' + Ui.icon('menu', 'w-5 h-5') + '</button>' +
        '<span class="ml-2 font-semibold lg:hidden">CivicEvents admin</span>' +
        '<div class="admin-topbar-actions">' +
          '<form role="search" action="' + ROOT + 'pages/search.html" method="get" class="header-search hidden md:flex">' +
            '<label for="global-search" class="sr-only">Search events, announcements and promos</label>' + Ui.icon('search', 'w-4 h-4') +
            '<input id="global-search" name="q" type="search" class="input" placeholder="Search…" autocomplete="off"></form>' +
          '<a class="btn btn-ghost btn-sm hidden sm:inline-flex" href="' + ROOT + 'index.html">View site</a>' +
          '<button type="button" id="notif-bell" class="relative rounded-full p-2 text-ink hover:bg-brand-50" aria-label="Notifications" aria-haspopup="dialog" aria-expanded="false">' +
            Ui.icon('bell', 'w-5 h-5') +
            '<span id="notif-badge" class="absolute right-0.5 top-0.5 hidden min-w-[1.15rem] rounded-full bg-coral-text px-1 text-center text-[11px] font-bold leading-[1.15rem] text-white" aria-hidden="true">0</span>' +
          '</button>' +
        '</div>' +
      '</header>';
    $('body').addClass('admin-app');
    $('#app-header').html(html);
  }
  function bindAdminShell() {
    function setMenu(open) {
      $('#admin-sidebar').toggleClass('is-open', open);
      $('#admin-scrim').prop('hidden', !open);
      $('#admin-menu-toggle').attr({ 'aria-expanded': String(open), 'aria-label': open ? 'Close admin menu' : 'Open admin menu' });
      if (open) $('#admin-sidebar .side-link').first().trigger('focus');
    }
    $('#admin-menu-toggle').on('click', function () { setMenu(!$('#admin-sidebar').hasClass('is-open')); });
    $('#admin-scrim').on('click', function () { setMenu(false); });
    $(document).on('keydown', function (e) {
      if (e.key === 'Escape' && $('#admin-sidebar').hasClass('is-open')) { setMenu(false); $('#admin-menu-toggle').trigger('focus'); }
    });
    $('#logout-btn').on('click', function () { Auth.logout('You have been logged out.', 'success'); });
  }

  /** Light one-line footer (matches the mock-ups): copyright + tagline, then the key links. */
  function renderFooter() {
    var year = new Date().getFullYear();
    var links = communities().map(function (c) { return [ROOT + c.href, c.title]; })
      .concat([[ROOT + 'pages/announcements.html', 'Announcements'], [ROOT + 'pages/promos.html', 'Promos'], ['mailto:' + CONFIG.SUPPORT_EMAIL, CONFIG.SUPPORT_EMAIL]]);
    $('#app-footer').html(
      '<footer class="site-footer mt-16 border-t border-line bg-[#F8FAFC]">' +
        '<div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted md:flex-row md:items-center md:justify-between">' +
          '<p>© ' + year + ' CivicEvents · Civic, campus and community events in Rwanda</p>' +
          '<nav aria-label="Footer"><ul class="flex flex-wrap gap-x-5 gap-y-2">' +
            links.map(function (l) { return '<li><a class="hover:text-ink hover:underline" href="' + Ui.escape(l[0]) + '">' + Ui.escape(l[1]) + '</a></li>'; }).join('') +
          '</ul></nav>' +
        '</div>' +
      '</footer>'
    );
  }

  /* ---------- Dropdowns (profile/admin) ---------- */
  function closeDropdowns(except) {
    $('[data-dropdown]').each(function () {
      if (except && this === except) return;
      $(this).find('[data-dropdown-toggle]').attr('aria-expanded', 'false');
      $(this).children('div').addClass('hidden');
    });
  }

  /* ---------- Explore menu (disclosure pattern, JetBlue-style panel) ----------
   * Button with aria-expanded controls a panel of links.
   *  - Click / Enter / Space toggles. Opening from the keyboard moves focus to the first link.
   *  - ArrowDown on the button opens it; arrow keys / Home / End move between panel links.
   *  - Escape closes and returns focus to the button; Tab out, or a click outside, closes it. */
  function exploreOpen() { return $('#explore-toggle').attr('aria-expanded') === 'true'; }
  function setExplore(open, focusFirst) {
    $('#explore-toggle').attr('aria-expanded', String(open)).toggleClass('is-open', open);
    $('#explore-panel').prop('hidden', !open);
    if (open) { closeDropdowns(); if (focusFirst) $('#explore-panel [data-explore-link]').first().trigger('focus'); }
  }
  function bindExplore() {
    var $toggle = $('#explore-toggle'), $panel = $('#explore-panel');
    $toggle.on('click', function (e) { setExplore(!exploreOpen(), e.detail === 0); }); // detail 0 = keyboard activation
    $toggle.on('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setExplore(true, true); }
    });
    $panel.on('keydown', function (e) {
      var $links = $panel.find('[data-explore-link]'), i = $links.index(document.activeElement);
      var next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: $links.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      $links.eq((next + $links.length) % $links.length).trigger('focus');
    });
    // Close when focus leaves both the button and the panel (e.g. Tab past the last link).
    $toggle.add($panel).on('focusout', function (e) {
      var to = e.relatedTarget;
      if (to && ($toggle[0] === to || $panel[0].contains(to))) return;
      if (to) setExplore(false);
    });
    $(document).on('click', function (e) {
      if (exploreOpen() && !$(e.target).closest('#explore-toggle, #explore-panel').length) setExplore(false);
    });
  }

  function bindHeader() {
    $(document).on('click', '[data-dropdown-toggle]', function (e) {
      e.stopPropagation();
      var $dd = $(this).closest('[data-dropdown]');
      var open = $(this).attr('aria-expanded') === 'true';
      closeDropdowns($dd[0]);
      if (!open) setExplore(false);
      $(this).attr('aria-expanded', String(!open));
      $dd.children('div').toggleClass('hidden', open);
    });
    $(document).on('click', function (e) {
      if (!$(e.target).closest('[data-dropdown]').length) closeDropdowns();
    });
    $(document).on('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (exploreOpen()) { setExplore(false); $('#explore-toggle').trigger('focus'); return; }
      var $open = $('[data-dropdown-toggle][aria-expanded="true"]');
      if ($open.length) { closeDropdowns(); $open.first().trigger('focus'); }
    });
    bindExplore();

    $('#mobile-toggle').on('click', function () {
      var open = $(this).attr('aria-expanded') === 'true';
      $(this).attr({ 'aria-expanded': String(!open), 'aria-label': open ? 'Open menu' : 'Close menu' });
      $('#mobile-nav').toggleClass('hidden', open);
    });
    $('#m-explore-toggle').on('click', function () {
      var open = $(this).attr('aria-expanded') === 'true';
      $(this).attr('aria-expanded', String(!open));
      $('#m-explore-list').prop('hidden', open);
    });

    $('#logout-btn').on('click', function () {
      Auth.logout('You have been logged out.', 'success');
    });
  }

  function mountShell() {
    // Mount points for the shared header/footer; created if the page doesn't declare them.
    if (!$('#app-header').length) $('body').prepend('<div id="app-header"></div>');
    if (!$('#app-footer').length) $('body').append('<div id="app-footer"></div>');
  }

  /**
   * The backend accepts tokens of disabled accounts until they expire, so every signed-in page
   * re-checks is_active (cached for a minute to avoid a request per click). A disabled account
   * is signed out with an explanation. Network failures are ignored: the page keeps working.
   */
  function verifyActive() {
    Api.get('/users/profile/me', null, { cache: 60000, silent: true }).done(function (r) {
      if (r && r.data && r.data.is_active === false) {
        Auth.logout('This account has been disabled. Please contact an administrator.', 'error');
      }
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

    var signedIn = Auth.isLoggedIn();
    if (access === 'public') {
      // Home page: no guard. Signed-in visitors get the full header, guests get Log in / Sign up.
      mountShell();
      renderHeader(opts.active, signedIn, false);
      renderFooter();
      Auth.applyRoleVisibility($('#app-header'));
      bindHeader();
      if (signedIn) { Notifications.init(); verifyActive(); }
      return true;
    }

    // GUARD 1 — must be logged in (redirects to login.html otherwise)
    if (!Auth.requireAuth()) return false;

    mountShell();
    if (access === 'admin' && Auth.isAdmin()) {
      // Admin workspace: sidebar + slim top bar, no public navigation or footer.
      renderAdminShell(String($('body').data('page') || opts.active));
      bindAdminShell();
      Notifications.init();
      verifyActive();
      return true;
    }
    renderHeader(opts.active, true, false);
    renderFooter();
    $('body').addClass('app-canvas'); // signed-in app pages use the light grey canvas
    // GUARD 3 — strip data-role="admin"/"user" elements that don't match the current role
    Auth.applyRoleVisibility($('#app-header'));
    bindHeader();
    Notifications.init();
    verifyActive();

    // GUARD 2 — admin-only pages show the "no access" screen to normal users
    if (access === 'admin' && !Auth.requireAdmin()) return false;

    return true;
  };

  window.Layout = Layout;
})(window, jQuery);
