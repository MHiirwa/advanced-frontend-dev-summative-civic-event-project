/**
 * login.js - Login page
 * POST /api/auth/login  { email, password }  ->  { data: { token, user } }
 */
$(function () {
  'use strict';

  // 'guest' page: already-logged-in users are sent to their home page
  if (!Layout.init({ access: 'guest' })) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var $form = $('#login-form');
  var $email = $('#email');
  var $password = $('#password');
  var $btn = $('#submit-btn');
  var $alert = $('#form-alert');

  // Show/hide password toggle
  var $toggle = $('#toggle-password').html(Ui.icon('eye', 'w-5 h-5'));
  $toggle.on('click', function () {
    var show = $password.attr('type') === 'password';
    $password.attr('type', show ? 'text' : 'password');
    $toggle.html(Ui.icon(show ? 'eyeoff' : 'eye', 'w-5 h-5')).attr({ 'aria-pressed': String(show), 'aria-label': show ? 'Hide password' : 'Show password' });
  });

  function validate() {
    var ok = true;
    var email = $.trim($email.val());
    if (!email) { Ui.setFieldError($email, 'Enter your email address.'); ok = false; }
    else if (!EMAIL_RE.test(email)) { Ui.setFieldError($email, 'Enter a valid email address.'); ok = false; }
    else Ui.setFieldError($email, '');

    if (!$password.val()) { Ui.setFieldError($password, 'Enter your password.'); ok = false; }
    else Ui.setFieldError($password, '');
    return ok;
  }

  function fail(message) {
    Ui.setLoading($btn, false);
    Ui.formAlert($alert, message, 'error');
  }

  function finish(user) {
    Ui.flash('Welcome back, ' + user.full_name.split(' ')[0] + '!', 'success');
    window.location.href = Auth.homeFor(user);
  }

  $form.on('submit', function (e) {
    e.preventDefault();
    Ui.formAlert($alert, '');
    if (!validate()) { $form.find('.input-error').first().trigger('focus'); return; }

    Ui.setLoading($btn, true, 'Logging in…');

    // auth:false -> no Authorization header, and a 401 here means "wrong credentials"
    // (not "session expired"), so we show the message instead of redirecting.
    Api.post('/auth/login', { email: $.trim($email.val()), password: $password.val() }, { auth: false })
      .done(function (res) {
        var token = res.data.token;
        var user = res.data.user;
        Auth.save(token, user, false);

        // The backend's auth middleware does not reject disabled accounts, so we check
        // is_active ourselves via the profile endpoint and block them here.
        Api.get('/users/profile/me')
          .done(function (p) {
            var profile = p.data || {};
            if (profile.is_active === false) {
              Auth.clear();
              fail('This account has been disabled. Please contact an administrator.');
              return;
            }
            Auth.setUser($.extend({}, user, { is_active: profile.is_active }));
            finish(user);
          })
          .fail(function (err) {
            if (err.status === 401) return; // Api already signed us out
            finish(user); // couldn't verify, but the login itself succeeded
          });
      })
      .fail(function (err) {
        // Put validation messages next to the right field when the backend names them
        if (err.fieldErrors && err.fieldErrors.email) Ui.setFieldError($email, err.fieldErrors.email);
        if (err.fieldErrors && err.fieldErrors.password) Ui.setFieldError($password, err.fieldErrors.password);
        fail(err.status === 401 ? 'Incorrect email or password.' : err.message);
      });
  });
});
