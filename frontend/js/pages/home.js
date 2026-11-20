(function (window, $) {
  'use strict';

  Components.publicHeader($('#public-header'), 'home');
  Components.publicFooter($('#public-footer'));

  function loginPrompt(container) {
    container.html(
      '<div class="public-empty"><strong>Community content needs a signed-in session.</strong>' +
      '<p>Log in to browse content returned by the CivicEvents+ backend.</p>' +
      '<a class="btn btn-primary btn-small" href="login.html">Log in</a></div>'
    );
  }

  function loadEvents() {
    var $target = $('#featured-events');
    if (!Auth.isLoggedIn()) {
      loginPrompt($target);
      return;
    }
    Api.get('/events', null, { cache: true, silent: true }).done(function (res) {
      var items = (res.data || []).filter(function (event) { return event.published !== false; });
      items.sort(function (a, b) { return new Date(a.starts_at || 0) - new Date(b.starts_at || 0); });
      items = items.slice(0, 3);
      if (!items.length) {
        $target.html('<div class="public-empty"><strong>No published events are available.</strong><p>New events will appear here when an administrator publishes them.</p></div>');
        return;
      }
      $target.html(items.map(function (event) {
        var image = event.metadata && event.metadata.image_url;
        return '<article class="featured-card">' +
          '<div class="featured-card-media">' + (image ? '<img src="' + Ui.escape(image) + '" alt="" loading="lazy">' : '<span>Community event</span>') + '</div>' +
          '<div class="featured-card-body"><p class="card-kicker">COMMUNITY EVENT</p>' +
          '<h3>' + Ui.escape(event.title) + '</h3>' +
          '<p class="featured-meta">' + Ui.escape(Ui.formatDateTime(event.starts_at) || 'Date to be announced') + '</p>' +
          '<p class="featured-meta">' + Ui.escape(event.location || 'Location to be announced') + '</p>' +
          '<a class="text-link" href="pages/event-details.html?id=' + encodeURIComponent(event.id) + '">View details <span aria-hidden="true">→</span></a></div></article>';
      }).join(''));
    }).fail(function (err) {
      $target.html('<div class="public-empty"><strong>Events could not be loaded.</strong><p>' + Ui.escape(err.message) + '</p></div>');
    });
  }

  function loadAnnouncements() {
    var $target = $('#featured-announcements');
    if (!Auth.isLoggedIn()) { loginPrompt($target); return; }
    Api.get('/announcements', null, { cache: true, silent: true }).done(function (res) {
      var items = (res.data || []).filter(function (item) { return item.published !== false; }).slice(0, 3);
      if (!items.length) {
        $target.html('<div class="public-empty compact"><strong>No published announcements.</strong></div>');
        return;
      }
      $target.html('<div class="announcement-strip">' + items.map(function (item) {
        return '<article class="announcement-row"><div><p class="card-kicker">ANNOUNCEMENT</p><h3>' + Ui.escape(item.title) + '</h3><p class="featured-meta">' + Ui.escape(Ui.formatDate(item.created_at)) + '</p></div><audio controls preload="metadata" src="' + Ui.escape(item.audio_url) + '"></audio></article>';
      }).join('') + '</div>');
    }).fail(function (err) {
      $target.html('<div class="public-empty compact"><strong>Announcements could not be loaded.</strong><p>' + Ui.escape(err.message) + '</p></div>');
    });
  }

  function loadPromos() {
    var $target = $('#featured-promos');
    if (!Auth.isLoggedIn()) { loginPrompt($target); return; }
    Api.get('/promos', null, { cache: true, silent: true }).done(function (res) {
      var payload = res.data || [];
      var items = payload.filter(function (item) { return item.published !== false; }).slice(0, 3);
      if (!items.length) {
        $target.html('<div class="public-empty compact"><strong>No published promotions.</strong></div>');
        return;
      }
      $target.html('<div class="promo-grid">' + items.map(function (item) {
        return '<article class="promo-card"><video controls preload="metadata" src="' + Ui.escape(item.video_url) + '"></video><div><p class="card-kicker">PROMOTION</p><h3>' + Ui.escape(item.title) + '</h3><p>' + Ui.escape(item.description || '') + '</p><details class="caption-panel"><summary>Read captions</summary><p>' + Ui.escape(item.caption_text || 'No caption text was supplied.') + '</p></details></div></article>';
      }).join('') + '</div>');
    }).fail(function (err) {
      $target.html('<div class="public-empty compact"><strong>Promotions could not be loaded.</strong><p>' + Ui.escape(err.message) + '</p></div>');
    });
  }

  loadEvents();
  loadAnnouncements();
  loadPromos();
})(window, jQuery);
