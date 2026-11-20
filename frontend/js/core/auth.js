/**
 * auth.js
 * ---------------------------------------------------------------
 * Global auth context + ROLE-BASED ACCESS GUARDS.
 *
 * Holds the logged-in user { id, full_name, email, role } and the JWT.
 *
 * Token storage (security trade-off, see README):
 *   - "Keep me signed in" UNCHECKED -> sessionStorage (cleared when the tab closes)
 *   - "Keep me signed in" CHECKED   -> localStorage   (survives restarts, but any
 *     XSS bug could read it, so only use it on a device you trust)
 *
 * ROLE GUARDS (where access is restricted) — read this section for the docs requirement:
 *
 *   GUARD 1 - Page guard:   Auth.requireAuth()   -> any logged-in user
 *   GUARD 2 - Admin guard:  Auth.requireAdmin()  -> admins only; others see a
 *                           "no access" screen (Ui.showForbidden)
 *   GUARD 3 - Element guard: Auth.applyRoleVisibility() removes DOM nodes marked
 *                           data-role="admin" for normal users (and data-role="user"
 *                           for admins), e.g. Edit/Delete buttons, Register buttons.
 *   Pages call these through Layout.init({ access: 'user' | 'admin' | 'guest' }).
 *
 * IMPORTANT: these guards are UX only. The backend is the real security
 * boundary (it returns 401/403 for anything the role is not allowed to do).
 */
(function (window, $) {
  'use strict';

  var TOKEN_KEY = 'ce_token';
  var USER_KEY = 'ce_user';

  var Auth = {};

  /* ---------- Storage helpers ---------- */
  function activeStore() {
    // The store that currently holds a token (session first, then local)
    if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
    if (localStorage.getItem(TOKEN_KEY)) return localStorage;
    return null;
  }

  /** Save the session after login. The frontend uses sessionStorage because the backend JWT expires after one hour. */
  Auth.save = function (token, user, remember) {
    Auth.clear();
    var store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  };

  Auth.clear = function () {
    [sessionStorage, localStorage].forEach(function (s) {
      s.removeItem(TOKEN_KEY);
      s.removeItem(USER_KEY);
    });
  };

  Auth.getToken = function () {
    var s = activeStore();
    return s ? s.getItem(TOKEN_KEY) : null;
  };

  Auth.getUser = function () {
    var s = activeStore();
    if (!s) return null;
    try { return JSON.parse(s.getItem(USER_KEY)); } catch (e) { return null; }
  };

  /** Update stored user (e.g. after editing the profile) without touching the token. */
  Auth.setUser = function (user) {
    var s = activeStore();
    if (s) s.setItem(USER_KEY, JSON.stringify(user));
  };

  /* ---------- Token expiry ---------- */
  function decodePayload(token) {
    try {
      var part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(part).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')));
    } catch (e) { return null; }
  }

  /** The backend issues 1h JWTs. We read `exp` so we can sign out before a 401 happens. */
  Auth.isTokenExpired = function () {
    var token = Auth.getToken();
    if (!token) return true;
    var payload = decodePayload(token);
    if (!payload || !payload.exp) return false; // can't tell -> let the backend decide
    return payload.exp * 1000 <= Date.now();
  };

  Auth.isLoggedIn = function () {
    return !!Auth.getToken() && !Auth.isTokenExpired();
  };

  /* ---------- Role checks ---------- */
  Auth.isAdmin = function () {
    var u = Auth.getUser();
    return !!u && u.role === 'admin';
  };

  /** Where a user lands after login. */
  // ROLE GUARD (UX only): admins land on the admin dashboard, everyone else on their personal one.
  Auth.homeFor = function (user) {
    return user && user.role === 'admin' ? 'admin/dashboard.html' : 'pages/dashboard.html';
  };

  /* ---------- Logout ---------- */
  /** Clear the session, queue a message, and go to the login page. */
  Auth.logout = function (message, type) {
    Auth.clear();
    if (message) Ui.flash(message, type || 'info');
    var nested = /\/(pages|admin)\//.test(window.location.pathname);
    window.location.href = nested ? '../login.html' : 'login.html';
  };

  /* ================================================================
   * GUARD 1 — requireAuth()
   * Any page that needs a signed-in user calls this first.
   * Not logged in / token expired  -> redirect to login with a message.
   * ================================================================ */
  Auth.requireAuth = function () {
    if (Auth.isLoggedIn()) return true;
    var hadToken = !!Auth.getToken(); // token present but expired
    Auth.logout(
      hadToken ? 'Your session has expired. Please log in again.' : 'Please log in to continue.',
      hadToken ? 'warning' : 'info'
    );
    return false;
  };

  /* ================================================================
   * GUARD 2 — requireAdmin()
   * Admin-only pages (dashboard, user management, create/edit forms).
   * A normal user is NOT redirected silently: they get a clear
   * "no access" screen with a way to contact an admin (client-side 403).
   * ================================================================ */
  Auth.requireAdmin = function () {
    if (!Auth.requireAuth()) return false;
    if (Auth.isAdmin()) return true;
    Ui.showForbidden();
    return false;
  };

  /* ================================================================
   * GUARD 3 — applyRoleVisibility(root)
   * Elements are REMOVED from the DOM (not just hidden) so they are
   * unreachable by keyboard or screen readers:
   *   data-role="admin"  -> only admins keep it   (Edit, Delete, Create, Admin menu…)
   *   data-role="user"   -> only normal users keep it (Register, Add feedback…)
   * Call again after rendering dynamic HTML, e.g. Auth.applyRoleVisibility($('#list')).
   * ================================================================ */
  Auth.applyRoleVisibility = function (root) {
    var $root = $(root || document);
    var admin = Auth.isAdmin();
    var selector = admin ? '[data-role="user"]' : '[data-role="admin"]';
    $root.find(selector).addBack(selector).remove();
  };

  window.Auth = Auth;
})(window, jQuery);
