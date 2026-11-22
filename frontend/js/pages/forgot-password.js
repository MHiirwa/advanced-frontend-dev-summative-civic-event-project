/**
 * forgot-password.js - Forgot password page (guest only)
 *
 * BACKEND LIMITATION: the API has no password-reset endpoint (no reset code, no way to set a
 * new password without being logged in), and the backend must not be changed. So this page does
 * not reset anything itself: it checks the email and prepares a reset request to the support
 * address (CONFIG.SUPPORT_EMAIL), which the person sends from their own mail app.
 *
 * ROLE GUARD (UX only): intended for normal user accounts. Administrator passwords are handled
 * by the system owner, which the page says. The frontend can't look up an email's role without
 * logging in, so the request asks support to confirm it is a user account.
 */
$(function () {
  'use strict';

  // 'guest' page: anyone already logged in is sent to their home page.
  if (!Layout.init({ access: 'guest' })) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var SUPPORT = CONFIG.SUPPORT_EMAIL;
  var $form = $('#forgot-form'), $email = $('#email'), $done = $('#forgot-done');

  // Prefill from ?email= (e.g. coming from the login page).
  var pre = new URLSearchParams(location.search).get('email');
  if (pre) $email.val(pre);

  $form.on('submit', function (e) {
    e.preventDefault();
    var email = $.trim($email.val());
    if (!email) { Ui.setFieldError($email, 'Enter your email address.'); $email.trigger('focus'); return; }
    if (!EMAIL_RE.test(email)) { Ui.setFieldError($email, 'Enter a valid email address.'); $email.trigger('focus'); return; }
    Ui.setFieldError($email, '');

    var subject = 'Password reset request (user account)';
    var body = 'Hello CivicEvents support,\n\nI forgot the password for my CivicEvents user account and would like help resetting it.\n\n' +
      'Account email: ' + email + '\n\nThis is a normal user account, not an administrator account.\n\nThank you.';
    $('#mail-link').attr('href', 'mailto:' + SUPPORT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body));
    $('#support-email').text(SUPPORT);
    $('#done-email').text(email);
    $form.addClass('hidden');
    $done.removeClass('hidden').trigger('focus');
  });

  $('#copy-btn').on('click', function () {
    var ok = function () { Ui.toast('Support address copied.', 'success'); };
    if (navigator.clipboard) navigator.clipboard.writeText(SUPPORT).then(ok, function () { Ui.toast(SUPPORT, 'info'); });
    else Ui.toast(SUPPORT, 'info');
  });

  $('#restart-btn').on('click', function () {
    $done.addClass('hidden'); $form.removeClass('hidden'); $email.trigger('focus').select();
  });
});
