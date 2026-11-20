/**
 * api.js
 * ---------------------------------------------------------------
 * One place that talks to the backend.
 *
 *   Api.get('/events')                      -> Promise-like (jQuery Deferred)
 *   Api.post('/auth/login', {email, ...}, { auth: false })
 *   Api.upload('POST', '/events', formData, { onProgress: fn })
 *
 * Every call resolves with the backend's full JSON body ({ status, message, data, ... })
 * and rejects with a normalised error:
 *   { status, message, errors: [{field, message}], fieldErrors: {field: msg}, isNetwork }
 *
 * Built-in behaviour:
 *   - Adds  Authorization: Bearer <token>  to protected requests
 *   - 401 on a protected request -> sign out + "session expired" message + redirect
 *   - 403 -> toast telling the user they lack permission (backend enforces roles)
 *   - Network failure -> friendly message (status 0, isNetwork = true)
 *   - Optional GET caching (sessionStorage, short TTL) invalidated automatically on writes
 */
(function (window, $) {
  'use strict';

  var CACHE_PREFIX = 'ce_cache:';

  var DEFAULT_MESSAGES = {
    0: 'Can\'t reach the server. Check your connection and make sure the backend is running at ' + CONFIG.API_BASE_URL + '.',
    400: 'The request was not valid. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    403: 'You don\'t have permission to do that. Contact an administrator if you need access.',
    404: 'We couldn\'t find what you were looking for.',
    409: 'That conflicts with existing data.',
    413: 'That file is too large.',
    500: 'Something went wrong on the server. Please try again.'
  };

  function url(path) {
    return CONFIG.API_BASE_URL + CONFIG.API_PREFIX + path;
  }

  /** Turn a failed jqXHR into a predictable error object. */
  function normalizeError(xhr, textStatus) {
    var status = xhr.status || 0;
    var body = xhr.responseJSON || null;
    var message = (body && body.message) || null;
    var errors = (body && $.isArray(body.errors)) ? body.errors : [];
    var fieldErrors = {};

    errors.forEach(function (e) {
      // express-validator may give `field`, `path` or `param` depending on version
      var f = e.field || e.path || e.param;
      if (f && !fieldErrors[f]) fieldErrors[f] = e.message || e.msg;
    });

    // If validation failed, build a readable sentence from the individual errors
    if (errors.length) {
      var parts = errors.map(function (e) { return e.message || e.msg; }).filter(Boolean);
      if (parts.length) message = parts.join(' ');
    }

    if (!message) {
      message = DEFAULT_MESSAGES[status] ||
        (status >= 500 ? DEFAULT_MESSAGES[500] : 'Something went wrong. Please try again.');
      if (textStatus === 'timeout') message = 'The request took too long. Please try again.';
    }

    return { status: status, message: message, errors: errors, fieldErrors: fieldErrors, isNetwork: status === 0, raw: body };
  }

  /* ---------- Cache (sessionStorage) ---------- */
  function cacheKey(path, params) {
    var u = Auth.getUser();
    return CACHE_PREFIX + (u ? u.id : 'anon') + ':' + path + '?' + $.param(params || {});
  }
  function cacheRead(key) {
    try {
      var raw = sessionStorage.getItem(key);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (entry.exp < Date.now()) { sessionStorage.removeItem(key); return null; }
      return entry.body;
    } catch (e) { return null; }
  }
  function cacheWrite(key, body, ttl) {
    try { sessionStorage.setItem(key, JSON.stringify({ exp: Date.now() + ttl, body: body })); } catch (e) { /* quota */ }
  }

  /**
   * Drop cached GETs. Api.invalidate('/promos') clears every cached /promos... entry.
   * Called automatically after POST/PUT/PATCH/DELETE for that resource.
   */
  function invalidate(pathPrefix) {
    var marker = ':' + (pathPrefix || '');
    Object.keys(sessionStorage).forEach(function (k) {
      if (k.indexOf(CACHE_PREFIX) === 0 && (!pathPrefix || k.indexOf(marker) !== -1)) sessionStorage.removeItem(k);
    });
  }

  /* ---------- Core request ---------- */
  function request(method, path, opts) {
    opts = opts || {};
    var d = $.Deferred();
    var protectedCall = opts.auth !== false;

    // Don't even send a request with a dead token
    if (protectedCall && Auth.getToken() && Auth.isTokenExpired()) {
      Auth.logout('Your session has expired. Please log in again.', 'warning');
      return d.reject({ status: 401, message: DEFAULT_MESSAGES[401], errors: [], fieldErrors: {} }).promise();
    }

    // Cached GET?
    var key = null;
    if (method === 'GET' && opts.cache) {
      key = cacheKey(path, opts.params);
      var hit = cacheRead(key);
      if (hit) return d.resolve(hit).promise();
    }

    var ajax = {
      url: url(path) + (opts.params ? '?' + $.param(opts.params) : ''),
      method: method,
      dataType: 'json',
      timeout: opts.timeout || 30000,
      headers: {}
    };

    if (protectedCall && Auth.getToken()) ajax.headers.Authorization = 'Bearer ' + Auth.getToken();

    if (opts.formData) {
      // multipart upload: let the browser set the boundary header
      ajax.data = opts.formData;
      ajax.processData = false;
      ajax.contentType = false;
      if (opts.onProgress) {
        ajax.xhr = function () {
          var xhr = $.ajaxSettings.xhr();
          if (xhr.upload) {
            xhr.upload.addEventListener('progress', function (e) {
              if (e.lengthComputable) opts.onProgress(Math.round((e.loaded / e.total) * 100));
            });
          }
          return xhr;
        };
      }
    } else if (opts.data !== undefined) {
      ajax.data = JSON.stringify(opts.data);
      ajax.contentType = 'application/json';
    }

    $.ajax(ajax)
      .done(function (body) {
        if (key) cacheWrite(key, body, opts.cache === true ? CONFIG.CACHE_TTL_MS : opts.cache);
        if (method !== 'GET') invalidate('/' + path.split('/')[1]);
        d.resolve(body);
      })
      .fail(function (xhr, textStatus) {
        var err = normalizeError(xhr, textStatus);

        if (err.status === 401 && protectedCall) {
          // Token rejected by the backend -> sign out and explain why
          Auth.logout('Your session has expired. Please log in again.', 'warning');
        } else if (err.status === 403 && !opts.silent) {
          Ui.toast(err.message, 'error');
        }
        d.reject(err);
      });

    return d.promise();
  }

  var Api = {
    request: request,
    invalidate: invalidate,
    get: function (path, params, opts) { return request('GET', path, $.extend({ params: params }, opts)); },
    post: function (path, data, opts) { return request('POST', path, $.extend({ data: data }, opts)); },
    put: function (path, data, opts) { return request('PUT', path, $.extend({ data: data }, opts)); },
    patch: function (path, data, opts) { return request('PATCH', path, $.extend({ data: data }, opts)); },
    del: function (path, opts) { return request('DELETE', path, opts); },
    /** Multipart upload. method is 'POST' or 'PUT'. */
    upload: function (method, path, formData, opts) { return request(method, path, $.extend({ formData: formData }, opts)); },
    /** Convenience: show an API error as a toast. */
    toastError: function (err) { Ui.toast(err && err.message ? err.message : 'Something went wrong.', 'error'); }
  };

  window.Api = Api;
})(window, jQuery);
