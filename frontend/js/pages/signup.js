/**
 * signup.js - Sign up page
 * POST /api/auth/signup { full_name, email, password }
 *
 * We deliberately never send a `role`: the backend would accept it, but the UI
 * must only ever create normal users.
 *
 * Password policy mirrors the backend regex exactly:
 *   ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$
 */
$(function () {
  'use strict';

  if (!Layout.init({ access: 'guest' })) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var RULES = {
    length: { label: 'At least 8 characters', test: function (p) { return p.length >= 8; } },
    lower: { label: 'A lowercase letter', test: function (p) { return /[a-z]/.test(p); } },
    upper: { label: 'An uppercase letter', test: function (p) { return /[A-Z]/.test(p); } },
    number: { label: 'A number', test: function (p) { return /\d/.test(p); } },
    special: { label: 'A special character (e.g. ! @ # $)', test: function (p) { return /[\W_]/.test(p); } }
  };
  var LEVELS = [
    // Semantic palette only: danger red, warning amber (#B7791F = 3:1 UI colour), success green.
    { text: 'enter a password', color: '#E3E7EC', cls: 'text-muted' },
    { text: 'very weak', color: '#B42318', cls: 'text-red-700' },
    { text: 'weak', color: '#B42318', cls: 'text-red-700' },
    { text: 'fair', color: '#B7791F', cls: 'text-amber-700' },
    { text: 'good', color: '#1E7A46', cls: 'text-green-700' },
    { text: 'strong', color: '#1E7A46', cls: 'text-green-700' }
  ];

  var $form = $('#signup-form');
  var $name = $('#full_name'), $email = $('#email'), $pw = $('#password'), $confirm = $('#confirm_password');
  var $btn = $('#submit-btn'), $alert = $('#form-alert');

  function passwordScore(p) {
    var score = 0;
    $.each(RULES, function (_, r) { if (r.test(p)) score++; });
    return score;
  }
  function passwordValid(p) { return passwordScore(p) === 5; }

  /** Update the 5-segment bar, the label, and the rule checklist. */
  function renderStrength() {
    var p = $pw.val();
    var score = p ? passwordScore(p) : 0;
    var level = LEVELS[score];

    $('#strength-bar .strength-seg').each(function (i) {
      $(this).css('background-color', i < score ? level.color : '#E3E7EC');
    });
    $('#strength-text').text(level.text).attr('class', 'font-semibold ' + level.cls);

    $('#password-rules li').each(function () {
      var key = $(this).data('rule');
      var met = RULES[key].test(p);
      // Text says met/not met too, so meaning never depends on colour alone
      $(this).html(
        '<span class="inline-flex items-center gap-2 ' + (met ? 'text-green-800' : '') + '">' +
          Ui.icon(met ? 'check' : 'x', 'w-4 h-4 ' + (met ? 'text-green-700' : 'text-muted')) +
          RULES[key].label + '<span class="sr-only">' + (met ? ' (met)' : ' (not met)') + '</span></span>'
      );
    });
  }
  renderStrength();
  $pw.on('input', renderStrength);

  // Show/hide password toggle
  var $toggle = $('#toggle-password').html(Ui.icon('eye', 'w-5 h-5'));
  $toggle.on('click', function () {
    var show = $pw.attr('type') === 'password';
    $pw.attr('type', show ? 'text' : 'password');
    $toggle.html(Ui.icon(show ? 'eyeoff' : 'eye', 'w-5 h-5')).attr({ 'aria-pressed': String(show), 'aria-label': show ? 'Hide password' : 'Show password' });
  });

  function validate() {
    var ok = true;
    var name = $.trim($name.val()), email = $.trim($email.val()), pw = $pw.val();

    if (name.length < 2) { Ui.setFieldError($name, 'Enter your full name.'); ok = false; } else Ui.setFieldError($name, '');

    if (!email) { Ui.setFieldError($email, 'Enter your email address.'); ok = false; }
    else if (!EMAIL_RE.test(email)) { Ui.setFieldError($email, 'Enter a valid email address.'); ok = false; }
    else Ui.setFieldError($email, '');

    if (!pw) { Ui.setFieldError($pw, 'Create a password.'); ok = false; }
    else if (!passwordValid(pw)) { Ui.setFieldError($pw, 'Your password doesn\'t meet all the requirements below.'); ok = false; }
    else Ui.setFieldError($pw, '');

    if (!$confirm.val()) { Ui.setFieldError($confirm, 'Confirm your password.'); ok = false; }
    else if ($confirm.val() !== pw) { Ui.setFieldError($confirm, 'Passwords don\'t match.'); ok = false; }
    else Ui.setFieldError($confirm, '');

    return ok;
  }

  // Re-check confirm field live so the mismatch message clears as the user types
  $confirm.on('input', function () {
    if ($confirm.attr('aria-invalid') && $confirm.val() === $pw.val()) Ui.setFieldError($confirm, '');
  });

  $form.on('submit', function (e) {
    e.preventDefault();
    Ui.formAlert($alert, '');
    if (!validate()) { $form.find('.input-error').first().trigger('focus'); return; }

    Ui.setLoading($btn, true, 'Creating account…');

    Api.post('/auth/signup', {
      full_name: $.trim($name.val()),
      email: $.trim($email.val()),
      password: $pw.val()
    }, { auth: false })
      .done(function () {
        // Spec: redirect to login with a success toast (shown by Layout.init via Ui.flash)
        Ui.flash('Account created! You can now log in.', 'success');
        window.location.href = 'login.html';
      })
      .fail(function (err) {
        Ui.setLoading($btn, false);
        if (err.status === 409) { // duplicate email
          Ui.setFieldError($email, 'That email is already registered. Try logging in instead.');
          $email.trigger('focus');
          return;
        }
        // Attach backend validation messages to their fields when possible
        var map = { full_name: $name, email: $email, password: $pw };
        var placed = false;
        $.each(err.fieldErrors || {}, function (field, msg) {
          if (map[field]) { Ui.setFieldError(map[field], msg); placed = true; }
        });
        Ui.formAlert($alert, placed ? 'Please fix the highlighted fields.' : err.message, 'error');
      });
  });
});
