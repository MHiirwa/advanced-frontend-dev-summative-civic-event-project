/**
 * features/notifications.js — full notifications page (pages/ and admin/).
 * The bell + drawer live in js/shared/notifications.js.
 * ROLE GUARD: the Delete button is only rendered when `admin` is true (admin/notifications.html),
 * because DELETE /notifications/:id is admin-only. Users can only read.
 */
(function (window, $) {
  'use strict';
  // Shared helpers from js/shared/app.js. `admin` is true on pages inside admin/
  // (<body data-access="admin">), i.e. pages that only administrators can open.
  var App = window.App, C = App.C, page = App.page, admin = App.adminArea;
  var boot = App.boot, put = App.put, fail = App.fail;
  function notifications() {
    if (!boot('Notifications', 'Updates from the CivicEvents+ community.', 'notifications')) return;
    put(C.loading());
    Api.get('/notifications').done(function (r) {
      var rows = r.data || [];
      // ROLE GUARD (UX only): the Delete button is rendered only when `admin` is true (admin/notifications.html,
      // admins only) because DELETE /notifications/:id is admin-only. Users can only read.
      put(rows.length ? '<div class="stack-list">' + rows.map(function (n) {
        return '<article class="card list-row"><div><span class="badge badge-' + Ui.escape(n.type || 'system') + '">' + Ui.escape(n.type || 'notification') + '</span><h2>' + Ui.escape(n.title) + '</h2><p>' + Ui.escape(n.message) + '</p><p class="muted">' + Ui.escape(Ui.formatDateTime(n.created_at)) + '</p></div>' + (admin ? '<button class="btn btn-danger btn-small delete-notification" data-id="' + n.id + '">Delete</button>' : '') + '</article>';
      }).join('') + '</div>' : C.empty('You are all caught up', 'New event, promo and announcement updates will appear here.'));
      $('.delete-notification').on('click', function () {
        var id = $(this).data('id');
        if (!window.confirm('Delete this notification?')) return;
        Api.del('/notifications/' + id).done(function () { Ui.toast('Notification deleted.', 'success'); notifications(); }).fail(Api.toastError);
      });
    }).fail(fail);
  }

  App.register({
    'notifications': notifications,
    'admin-notifications': notifications
  });
})(window, jQuery);
