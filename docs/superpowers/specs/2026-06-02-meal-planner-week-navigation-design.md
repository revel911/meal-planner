# Meal Planner — Week Navigation with Dates

**Date:** 2026-06-02
**Status:** Approved (design)
**Author:** Tommy + Claude

## Background

The week strip shows the meal name + category per day, which duplicates the cards and is too tall. The user wants the strip **smaller** (just weekday + date number), the header to show the **month/date** of the week and highlight **today**, and the ability to **page back/forward a week** to view previous weeks.

Constraint from the current data model: the app stores one **current plan** (full detail, no date) plus a rolling **history of the last 3 weeks**, where each history entry is just the 7 day-ordered **meal names** (`string[][]`, most-recent-first; pushed on each generate). There are no stored dates.

## Decisions (from brainstorming)

| Topic | Decision |
| --- | --- |
| History depth | **Last 3 weeks, read-only** — reuse the existing rolling history. |
| Future weeks | **No future planning** — forward only walks back toward the current week and stops. |
| Strip content | **Weekday + date number only** (drop meal name & category); smaller chips; highlight today. |
| Dates | **Computed from today**, not stored. Current plan = this calendar week (Mon–Sun containing today); week *k*-back = `thisMonday − 7k`. |

## A. Dates module — new `src/dates.js` (pure, tested)

Week starts **Monday**. Functions:
- `mondayOf(d = new Date())` → a `Date` at local midnight of that week's Monday. (`offset = (getDay()+6)%7`.)
- `addDays(d, n)` → new `Date` n days offset.
- `weekDates(monday)` → `Date[7]` (Mon…Sun).
- `formatRange(dates)` → `"Jun 1 – 7"`; cross-month → `"Jun 29 – Jul 5"` (short month names, no year).
- `todayIndex(dates, today = new Date())` → 0–6 if today (y/m/d) is in `dates`, else `-1`.
- `relativeLabel(offset)` → `'This week'` (0), `'Last week'` (1), `'${offset} weeks ago'` (≥2).

## B. Week navigation — `app.js` state + header

- `state.weekOffset` (0 = current, 1…`history.length`, max 3).
- `viewedPlan()`: offset 0 → `state.plan`; else `planFromNames(state.history[offset-1])`.
- `planFromNames(names)` → `{ days: names.map((n,i)=>({ day: DAYS[i], meal: lookupMeal(n), mode: <eatout if where==='Eat Out' else cook>, locked:false })), relaxations: [], healthyCount: <count> }`.
- `lookupMeal(name)` → `state.meals.find(m => m.meal === name)` or a fallback `{ meal:name, category:'', where:'', healthy:false, speed:'', cost:'', special:'', ingredients:[] }` (covers meals later removed from the sheet).
- `viewedDates()` → `weekDates(addDays(mondayOf(new Date()), -7*state.weekOffset))`.
- Generating or reshuffling resets `state.weekOffset = 0`.

The Plan header (`.plan-head`) **replaces the "This Week" title** with a week-nav block:

```html
<div class="plan-head">
  <div class="week-nav">
    <button class="nav-arrow" id="btn-week-back" aria-label="Older week">‹</button>
    <div class="week-when">
      <span class="week-rel" id="week-rel">This week</span>
      <span class="week-range" id="week-range"></span>
    </div>
    <button class="nav-arrow" id="btn-week-fwd" aria-label="Newer week">›</button>
  </div>
  <span class="healthy-meter" id="healthy-meter"></span>
</div>
```

`renderPlan` sets `#week-rel` = `relativeLabel(offset)`, `#week-range` = `formatRange(viewedDates())`, and the arrows' `disabled`: back disabled when `offset >= history.length`, forward disabled when `offset === 0`. Handlers: back → `offset = min(offset+1, history.length)`; forward → `offset = max(offset-1, 0)`; both re-render.

```
‹  This week        ›    Healthy 3/3
   JUN 1 – 7
```

## C. Strip — `render.js` `weekStripHTML(plan, opts)`

New signature `weekStripHTML(plan, opts = {})` with `opts = { dayNums: number[], todayIndex: number }`. Each chip: weekday abbrev + date number; `is-today` class on `opts.todayIndex`; **no meal name / category**. Empty/no plan → `''`. Tap still emits `data-action="goto-day"` / `data-day`.

```html
<button class="ws-chip is-today" data-action="goto-day" data-day="2">
  <span class="ws-day">WED</span><span class="ws-date">4</span>
</button>
```

`app.js` passes `dayNums = viewedDates().map(d => d.getDate())` and `todayIndex = (offset===0 ? todayIndex(viewedDates()) : -1)` (today only highlighted on the current week).

## D. Read-only past weeks

`dayCardHTML(day, dayIndex, opts = {})` gains `opts.readOnly`. When true: omit the `.card-actions` block and the `.override-warn` line (keep badge, day label, meal name, pills). When `state.weekOffset > 0`, `renderPlan`:
- renders cards with `{ readOnly: true }`,
- hides `#btn-generate` and `#btn-reroll`,
- hides the relaxation banner (`#plan-banner` emptied).

Shopping and Meals tabs stay tied to the **current** week (`state.plan`) regardless of `weekOffset` — you shop for now, not the past.

## E. Files / service worker
- New `src/dates.js` (+ `tests/dates.test.js`). **Add `'src/dates.js'` to the `SHELL` precache list in `sw.js`** and bump `CACHE` `dinner-v6 → v7`.
- `render.js` (+ `tests/render.test.js`): strip restyle, `dayCardHTML` readOnly.
- `app.js`: offset state, nav handlers, viewed-week rendering, `planFromNames`/`lookupMeal`.
- `index.html`: week-nav markup; CSS for `.week-nav`/`.nav-arrow`/`.week-when`/`.week-rel`/`.week-range`, the smaller `.ws-chip` + `.ws-date` + `.ws-chip.is-today`. Remove now-unused `.ws-meal`/`.ws-cat` rules.

## F. Tests
- `dates`: `mondayOf` (Thu Jun 4 2026 → Mon Jun 1), `weekDates` length/first/last, `formatRange` same-month (`"Jun 1 – 7"`) and cross-month (Mon Jun 29 → `"Jun 29 – Jul 5"`), `todayIndex` in-week (Jun 4 → 3) and out (`-1`), `relativeLabel` 0/1/2.
- `render`: strip shows date numbers + `is-today`, contains no meal name; `dayCardHTML({readOnly:true})` omits `card-actions`/`data-action="swap"`, normal call still has them.

## Invariants
1. Past weeks are never editable (no actions, no generate/reshuffle while `weekOffset > 0`).
2. `weekOffset` is clamped to `[0, history.length]` and reset to 0 on generate/reshuffle.
3. Today is highlighted only when viewing the current week.
4. Shopping/Meals always reflect the current plan.

## Out of scope
- Storing real dates per plan (dates are derived from today).
- Editing or re-generating past weeks; future-week planning.
- More than 3 weeks of history.
