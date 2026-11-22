/**
 * civic.js
 * ---------------------------------------------------------------
 * Rwanda civic-life helpers shared by every page:
 *  - The two community destinations (Rwanda Civic Life, ALU Campus).
 *  - Transparent keyword matching of REAL events to those destinations.
 *  - Event time status derived from real start/end times.
 *  - The general monthly Umuganda observance date (calendar rule only).
 *  - One shared event filter used by the events list and the community pages.
 *
 * Why keywords: the provided API stores no category for events (and this project
 * must not change the backend), so a community page shows the events whose title,
 * description or location mention its keywords — and says so on screen. An event
 * can match both communities or neither (it is always listed under "All events").
 * Nothing is relabelled, invented or inferred from dates.
 */
(function (window) {
  'use strict';

  var COMMUNITIES = {
    civic: {
      key: 'civic',
      title: 'Rwanda Civic Life',
      short: 'Umuganda, public dialogues and community initiatives',
      intro: 'Community work, public dialogues and local initiatives you can take part in across Rwanda.',
      icon: 'landmark',
      href: 'pages/rwanda-civic-life.html',
      image: 'assets/images/umuganda-community-work.jpg',
      alt: 'Neighbours clearing grass along a path during community work',
      logo: 'assets/images/rwanda-coat-of-arms.jpg',
      logoAlt: 'Coat of arms of the Republic of Rwanda',
      // `youth` initiatives are grouped here in the presentation layer.
      keywords: ['umuganda', 'kwibuka', 'commemoration', 'dialogue', 'town hall', 'community', 'civic', 'citizen',
        'district', 'sector', 'village', 'neighbourhood', 'neighborhood', 'volunteer', 'clean-up', 'cleanup',
        'tree planting', 'youth', 'public hearing', 'budget hearing']
    },
    campus: {
      key: 'campus',
      title: 'ALU Campus',
      short: 'Student activities, workshops and leadership forums',
      intro: 'Student-led activities, workshops, leadership forums and campus opportunities.',
      icon: 'campus',
      href: 'pages/alu-campus.html',
      image: 'assets/images/students-discussion-circle-1600.jpg',
      alt: 'Students in a discussion circle during a campus workshop',
      logo: 'assets/images/alu-logo.jpg',
      logoAlt: 'African Leadership University logo',
      // Wide wordmark: compact spots show only its left part (the "ALU" letters).
      logoCrop: 'left',
      keywords: ['alu', 'african leadership university', 'campus', 'student', 'students', 'workshop', 'leadership',
        'lecture', 'hackathon', 'career', 'mentorship', 'bootcamp', 'seminar', 'club', 'forum']
    }
  };

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // Whole-word, case-insensitive matchers built once per community.
  Object.keys(COMMUNITIES).forEach(function (k) {
    COMMUNITIES[k].matchers = COMMUNITIES[k].keywords.map(function (w) {
      return { word: w, re: new RegExp('(^|[^a-z0-9])' + escapeRe(w) + '($|[^a-z0-9])', 'i') };
    });
  });

  function eventText(e) { return [e.title, e.description, e.location].join(' \n '); }

  /** Keywords from a community that appear in the event's own text ([] = no match). */
  function matchedKeywords(e, communityKey) {
    var c = COMMUNITIES[communityKey]; if (!c || !e) return [];
    var text = eventText(e);
    return c.matchers.filter(function (m) { return m.re.test(text); }).map(function (m) { return m.word; });
  }
  function inCommunity(e, communityKey) { return matchedKeywords(e, communityKey).length > 0; }

  /** True only when the event's own text says "Umuganda" (never inferred from its date). */
  function mentionsUmuganda(e) { return /(^|[^a-z])umuganda($|[^a-z])/i.test(eventText(e || {})); }

  function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

  /**
   * Time status from the real start/end times:
   *  'live' (started, not ended) | 'today' (starts later today) | 'upcoming' | 'completed' | null (no date).
   */
  function status(e, now) {
    now = now || new Date();
    if (!e || !e.starts_at) return null;
    var start = new Date(e.starts_at), end = e.ends_at ? new Date(e.ends_at) : null;
    if (isNaN(start)) return null;
    if (end && end < now) return 'completed';
    if (!end && start < now && !sameDay(start, now)) return 'completed';
    if (start <= now) return 'live';
    if (sameDay(start, now)) return 'today';
    return 'upcoming';
  }

  var STATUS = {
    live: { label: 'Happening now', icon: 'clock', chip: 'chip-success' },
    today: { label: 'Today', icon: 'clock', chip: 'chip-coral' },
    upcoming: { label: 'Upcoming', icon: 'calendar', chip: 'chip-muted' },
    completed: { label: 'Completed', icon: 'check', chip: 'chip-muted' },
    registered: { label: 'Registered', icon: 'userCheck', chip: 'chip-blue' },
    cancelled: { label: 'Registration cancelled', icon: 'circleX', chip: 'chip-muted' }
  };

  /** Last Saturday of a month (month is 0-based). */
  function lastSaturday(year, month) {
    var d = new Date(year, month + 1, 0); // last day of the month
    d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); // step back to Saturday
    return d;
  }

  /**
   * Next general Umuganda observance (last Saturday of the month), counting today.
   * Calendar rule only — not a confirmed event, venue or time.
   */
  function nextUmuganda(from) {
    from = from || new Date();
    var today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    var d = lastSaturday(today.getFullYear(), today.getMonth());
    if (d < today) d = lastSaturday(today.getFullYear(), today.getMonth() + 1);
    return d;
  }

  function dayStart(v) { return v ? new Date(v + 'T00:00:00') : null; }
  function dayEnd(v) { return v ? new Date(v + 'T23:59:59.999') : null; }

  /**
   * Shared event filter (events list + community pages). All criteria optional:
   *  q (text in title/description/location), loc (location text), from/to ('YYYY-MM-DD'),
   *  community ('civic' | 'campus'), upcomingOnly (hide completed), sort ('date' | 'new').
   * Returns a new sorted array; `badRange` is true when to < from (range then ignored).
   */
  function filterEvents(items, o) {
    o = o || {};
    var q = (o.q || '').trim().toLowerCase(), loc = (o.loc || '').trim().toLowerCase();
    var from = dayStart(o.from), to = dayEnd(o.to), badRange = !!(from && to && to < from), now = new Date();
    var out = (items || []).filter(function (e) {
      var start = e.starts_at ? new Date(e.starts_at) : null, end = e.ends_at ? new Date(e.ends_at) : start;
      if (q && [e.title, e.description, e.location].join(' ').toLowerCase().indexOf(q) === -1) return false;
      if (loc && (e.location || '').toLowerCase().indexOf(loc) === -1) return false;
      if (o.community && !inCommunity(e, o.community)) return false;
      if (o.upcomingOnly && status(e, now) === 'completed') return false;
      if (!badRange && (from || to)) {
        if (!start) return false;               // undated events can't match a date range
        if (from && end < from) return false;   // finished before the range starts
        if (to && start > to) return false;     // starts after the range ends
      }
      return true;
    });
    out.sort(o.sort === 'new'
      ? function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); }
      : function (a, b) { return new Date(a.starts_at || 8.64e15) - new Date(b.starts_at || 8.64e15); });
    out.badRange = badRange;
    return out;
  }

  /** 'YYYY-MM-DD' for a Date in local time (for <input type="date"> and quick ranges). */
  function isoDay(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  window.Civic = {
    COMMUNITIES: COMMUNITIES, STATUS: STATUS,
    matchedKeywords: matchedKeywords, inCommunity: inCommunity, mentionsUmuganda: mentionsUmuganda,
    status: status, lastSaturday: lastSaturday, nextUmuganda: nextUmuganda,
    filterEvents: filterEvents, isoDay: isoDay
  };
})(window);
