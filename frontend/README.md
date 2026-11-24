# CivicEvents+ frontend

CivicEvents+ is a community portal for local **events**, **audio announcements**,
**promo videos** and **in-app notifications**. This folder is the frontend: plain
HTML, Tailwind CSS (CDN), jQuery and Chart.js (CDN). It has no build step and no
framework. It talks to the provided Express + PostgreSQL API in [`../backend`](../backend).

There are two roles:

| Role | Can do |
|------|--------|
| **user** | Browse published events, announcements and promos; register for and cancel events; leave and edit one feedback entry per event; read notifications; edit their own name and email. |
| **admin** | Everything above, plus: create, edit and delete events, announcements and promos; publish or unpublish announcements and promos; see registrants and all feedback per event; enable or disable users; delete notifications; view the dashboard with charts. |

---

## 1. Run it locally

### 1.1 Start the backend first

Follow [`backend/README.md`](../backend/README.md). In short:

```bash
cd backend
npm install
# create the PostgreSQL database, then create your env file from the template:
cp .env.example .env   # fill in DB_USER, DB_PASS + DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, JWT_SECRET
                       # (.env is git-ignored; optional PORT, default 4000)
npm run db:setup     # creates the tables (migrations/001_create_tables.sql)
npm run dev          # API on http://localhost:4000/api, uploads on http://localhost:4000/uploads
```

### 1.2 Serve the frontend with VS Code Live Server

The frontend must be served over HTTP (not opened as `file://`), because it
loads scripts by relative path and calls the API with `fetch`/XHR.

1. Install the VS Code extension **Live Server** (Ritwick Dey).
2. In VS Code, open the **`frontend` folder** itself (**File → Open Folder… → frontend**),
   so Live Server serves `frontend/` as the site root.
3. Click **Go Live** in the status bar, or right-click `index.html` and
   choose **Open with Live Server**.
4. The browser opens the public home page (usually `http://127.0.0.1:5500/index.html`).
   Use **Log in** or **Sign up** from there.

Any static server works too, for example `cd frontend && python3 -m http.server 5500`.

### 1.3 Point the frontend at the backend (base URL)

The API address is set in one place, [`js/core/config.js`](js/core/config.js):

```js
window.CONFIG = {
  API_BASE_URL: 'http://localhost:4000', // where the backend runs
  API_PREFIX: '/api',                    // every request goes to API_BASE_URL + API_PREFIX
  ...
};
```

If your backend runs on another host or port (for example `PORT=5000` in
`backend/.env`), change `API_BASE_URL` only. There are no frontend environment
variables. The backend already enables CORS, so no proxy is needed.

### 1.4 Create an admin account

The sign-up page always creates a normal **user**. The backend's signup endpoint
also accepts a `role` field, so create an admin from Postman (or curl):

```http
POST http://localhost:4000/api/auth/signup
Content-Type: application/json

{
  "full_name": "Site Admin",
  "email": "admin@example.com",
  "password": "Admin#2026",
  "role": "admin"
}
```

Then log in with that email and password on `login.html`. Admins land on
`admin/dashboard.html`; users land on `pages/dashboard.html`.

The Postman collection is in `backend/CivicEvents+ API.postman_collection.json`.

---

## 2. Folder structure

```
frontend/
├── index.html, login.html, signup.html   public pages (no login needed)
├── forgot-password.html                   reset request to support (no reset API)
├── dashboard.html, events.html            tiny redirects to the real pages
├── pages/                                 signed-in pages, for any role
│   ├── dashboard.html                     personal dashboard
│   ├── events.html, event-details.html
│   ├── announcements.html, announcement-details.html
│   ├── promos.html, promo-details.html
│   ├── my-registrations.html, my-feedback.html
│   ├── notifications.html, profile.html, search.html
│   ├── rwanda-civic-life.html, alu-campus.html   community pages (keyword-matched events)
├── admin/                                 admin-only pages (<body data-access="admin">)
│   ├── dashboard.html                     stats + charts
│   ├── events.html, announcements.html, promos.html            manage lists
│   ├── create-event.html, create-announcement.html, create-promo.html   create/edit (?id=…)
│   ├── users.html, registrations.html, notifications.html
├── assets/images/                         logo (civicevents-logo.svg), PNG favicon, local photos
├── css/styles.css                         design tokens and shared component styles
└── js/
    ├── core/          loaded on every page
    │   ├── config.js            API base URL, upload limits, poll interval
    │   ├── tailwind-config.js   Tailwind theme (brand colours, fonts)
    │   ├── ui.js                escape(), toasts, skeletons, empty/error states, confirm dialog
    │   ├── civic.js             communities + keyword matching, event time status, next Umuganda date
    │   ├── auth.js              token storage, role helpers, GUARDS 1–3
    │   └── api.js               $.ajax wrapper: Bearer header, 401/403 handling, cache, upload progress
    ├── shared/        used by every signed-in page
    │   ├── layout.js            public/user header + footer; admin sidebar shell (admin/ pages)
    │   ├── notifications.js     bell badge, notification drawer, per-user read state
    │   ├── components.js        cards, tables, pagination, audio player, captions helper
    │   └── app.js               page setup (boot), error/retry, list helpers, page router
    ├── features/      one file per feature; each page loads only the one it needs
    │   ├── events.js            events list (filters + pagination) and event detail
    │   ├── announcements.js     announcements list and detail
    │   ├── promos.js            promos list and detail
    │   ├── registrations.js     my registrations, my feedback, admin registrations
    │   ├── notifications.js     notifications page (admin delete)
    │   ├── users.js             my profile, admin user management
    │   ├── dashboard.js         admin dashboard (Chart.js) and personal dashboard
    │   ├── admin-content.js     admin manage lists + create/edit form for all content
    │   └── search.js            global search results
    └── pages/         scripts for the public pages
        ├── home.js, login.js, signup.js
```

**How a signed-in page works.** Each HTML file is a thin shell, for example
`<body data-page="events">`, plus its scripts: `core/*` → `shared/*` →
`shared/app.js` → one `features/*.js`. The feature file registers its pages with
`App.register({ 'events': events, ... })`. On DOM ready, `app.js` runs the handler
whose name matches `data-page`. That handler calls `App.boot()`, which draws the
layout and runs the access guard, and then renders the content.

---

## 3. Where the role guards are

**The frontend guards are for user experience only. Real security is the backend,**
which checks the JWT and the role on every protected endpoint
(`authenticate` / `authorize(['admin'])`). Every guard in the code has a
`ROLE GUARD` or `GUARD n` comment saying who can access it and why.

| Guard | Where | What it does |
|-------|-------|--------------|
| **GUARD 1: signed in** | `Auth.requireAuth()` in [`js/core/auth.js`](js/core/auth.js), called by `Layout.init()` | No token or an expired token → redirect to `login.html` with a message. |
| **GUARD 2: admin page** | `Auth.requireAdmin()` in `auth.js`, called by `Layout.init({ access: 'admin' })` | Every page in `admin/` has `data-access="admin"`. `App.boot()` passes that to `Layout.init`, and normal users see a "You don't have access" screen with a "Contact an admin" link. |
| **GUARD 3: element visibility** | `Auth.applyRoleVisibility()` in `auth.js`, run on the header by `layout.js` | Removes `data-role="admin"` elements for users (Dashboard link, Admin menu) and `data-role="user"` elements for admins (My registrations, My feedback). |
| **Admin controls on cards** | `C.manageActions()` and the `admin` argument of `C.eventCard / announcementCard / promoCard` in [`js/shared/components.js`](js/shared/components.js) | Edit/Delete/Publish buttons only render on `admin/` pages. |
| **Published-only content** | `App.showList()` / `App.mediaDetail()` in [`js/shared/app.js`](js/shared/app.js), `events.js`, `search.js` | Users never see drafts (`published === false`); admins do. |
| **Event detail blocks** | `eventDetail()` in [`js/features/events.js`](js/features/events.js) | Users: Register/Cancel and their own feedback. Admins: registrants, all feedback, average rating. |
| **Notification delete** | [`js/features/notifications.js`](js/features/notifications.js) | Delete button only on `admin/notifications.html`. |
| **Profile** | `profile()` in [`js/features/users.js`](js/features/users.js) | Only `full_name` and `email` are editable; role and status are read-only. |
| **User management** | `adminUsers()` in `users.js` | Admins can enable or disable users; there is deliberately no role control. |
| **Landing page by role** | `Auth.homeFor()` in `auth.js` | Admins go to the admin dashboard, users to their personal dashboard. |

**Token handling** ([`js/core/auth.js`](js/core/auth.js), [`js/core/api.js`](js/core/api.js)):
the JWT and `{ id, full_name, email, role }` are kept in `sessionStorage` by
default, so the session ends when the tab closes. Ticking **Remember me** on the
login page stores them in `localStorage` instead (`Auth.save(token, user, true)`),
so the session survives closing the browser until the token expires (the backend
issues one-hour tokens). Every protected request sends
`Authorization: Bearer <token>`. An expired token or a 401 response signs the user
out and redirects to the login page with a message.

---

## 4. Backend limitations (and how the UI handles them)

The UI only uses endpoints that exist. Where the API is missing something, the
frontend works around it as follows:

| Limitation | What the frontend does |
|------------|------------------------|
| **No feedback list for normal users.** `GET /event-feedback/event/:id` is admin-only, so users cannot see other people's feedback or the average rating. | Users see and edit only **their own** feedback (from `GET /event-feedback/my-feedback`). Admins see the full list and an average rating **computed in the browser** (there is no average endpoint). A 409 on duplicate feedback shows a message and switches to edit mode. |
| **No mark-as-read endpoint for notifications.** | Read state is stored **in `localStorage`, per user id** (`ce_read_<userId>`). It drives the bell's unread count and the bold/unread styling. It does not sync across browsers or devices. |
| **Events have no `published` field in create/update** (the controller ignores it and there is no publish endpoint). | Event forms have **no published toggle**; they explain that events are visible as soon as they are saved. Announcements and promos do have a toggle (see below). |
| **Re-registering after cancelling returns 409.** Cancelling sets the registration's status to `cancelled`, and the unique `(user_id, event_id)` constraint blocks a new row. | Once a user has cancelled, the event page shows a note that re-registering is not available, instead of a Register button that would fail. A 409 on Register shows a toast and reloads the state. |
| No search, filter or pagination query parameters. | Search, date and location filters and pagination run client-side on the cached list. Filter state is kept in the URL. |
| The API returns drafts to everyone. | Normal users' lists, details and search results filter out `published === false`. |
| `POST /promos` ignores `published`; `PUT /announcements/:id` ignores a new audio file. | After saving a promo, the form calls `PATCH /promos/:id/unpublish` when the toggle was off. The announcement edit form doesn't offer a file input and explains why. |
| Announcements have no transcript or duration; promos store captions as plain text. | Audio length is read from the file's metadata. `caption_text` is turned into a WebVTT `<track>` (Blob URL) and also shown as a transcript. |
| **Events have no category field.** | The two community pages (Rwanda Civic Life, ALU Campus) list events whose title, description or location contain the community's keywords (`Civic.COMMUNITIES` in `js/core/civic.js`). The page says this on screen; an event can match both, or neither. The "Next Umuganda" date is the last-Saturday calendar rule, not an event. |
| **No user list total.** `GET /users` pages by 20 without a count. | Admin users list shows Previous/Next only, and Next is disabled when a page has fewer than 20 rows. |
| **No password reset endpoint.** | `forgot-password.html` (linked from login) checks the email and prepares a reset request email to `CONFIG.SUPPORT_EMAIL`; it does not change any password. It is meant for user accounts only and says that administrator passwords are reset by the system owner. |
| **Not in the API:** service requests, broadcast notifications, event drafts. | Not built; no UI pretends they exist. |
| Dashboard counts are strings (PostgreSQL `COUNT`). | Converted with `parseInt` before display and charting. User growth months with no sign-ups are filled in as 0 in the "New users per month" chart. |
| **No aggregate endpoints for registrations/feedback.** | The admin dashboard and registrations overview call the per-event endpoints through `Api.pool()` (at most 4 requests in flight). The dashboard refreshes itself every 60 s while the tab is visible and updates its two charts in place. |
| **Disabled accounts keep working with an existing token** (the auth middleware doesn't check `is_active`). | Login refuses disabled accounts, and every signed-in page re-checks `GET /users/profile/me` (cached 60 s); a disabled account is signed out with a message. |
| **Events with registrations can't be deleted** (`event_registrations` has no `ON DELETE CASCADE`, so the API returns a 500 with a database message). | The delete dialog says so up front, and the error is shown as a plain-language message. In general, 5xx bodies are never shown raw: `api.js` translates known ones (file too large, wrong file type, constraint errors) and uses a generic message otherwise. |

Upload limits are checked in the browser before sending, matching the backend's
upload middleware: images 2 MB (jpg, jpeg, png, gif), audio 5 MB (mp3, wav, m4a,
ogg), video 8 MB (mp4, mov, avi, mkv). They are set in `CONFIG.UPLOADS`.

---

## 5. UX details worth knowing

- **Navigation.** Users: Home · Explore events · My registrations · Announcements · Promos. Admins: Home · Explore events · Announcements · Promos · Dashboard · Admin, plus admin shortcuts in the profile menu. A search box sits in the header on wide screens (icon link below 1280 px, search field in the mobile menu). Admin pages have their own top bar with search, "View site" and the same notification bell and drawer.
- **Optimistic UI.** Registering (from a card or the event page) shows "Registered" immediately; if the API refuses, the button comes back with focus and the error is explained. Marking notifications read is client-side only, so there is nothing to revert.
- **Mobile-first.** Card and KPI grids start at one column and grow with `min-width` breakpoints. On phones the events filters are behind a "Search & filters" button that shows how many filters are active.
- **Images.** If an event image fails to load, the card shows its date panel instead of a broken-image icon.
- **Accessibility.** Field errors are added to a field's existing hints (`aria-describedby`) instead of replacing them. "My registrations" uses ARIA tabs with arrow-key navigation and a tab panel.

## 6. Design and images

The layout follows five mock-ups: centred login/sign-up cards, a split home hero,
a personal dashboard (stats strip, upcoming list, updates, discover cards) and an
admin overview with a grouped sidebar, KPI cards, a weekly registrations chart and
a "Needs attention" list. Signed-in user pages use a light grey canvas with white
cards; admin pages use the sidebar shell so they look clearly different from user pages.

Colours: ink `#172F43`, civic blue `#2463EB`, maize `#F2C14E` (backgrounds only),
sage `#E4ECE7`; font Inter. The tokens are in `css/styles.css` (`:root`) and
`js/core/tailwind-config.js`.

The logo (`assets/images/civicevents-logo.svg`) is a blue "C" ring with a yellow arc
and a navy dot; the PNG favicon is rendered from it. The photos in
`assets/images/` are local copies used for the home hero and the two community
tiles and pages. Event cards show an image only when the event has one uploaded,
never a stand-in photo. The Rwanda coat of arms and the ALU logo identify their
community in the Explore menu and on the community pages.
