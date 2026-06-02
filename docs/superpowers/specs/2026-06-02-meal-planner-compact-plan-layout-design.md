# Meal Planner — Compact Plan Layout (denser cards + slim header)

**Date:** 2026-06-02
**Status:** Approved (design)
**Author:** Tommy + Claude

## Background

On a phone the Plan screen wastes vertical space two ways:
1. The top hero — `YOUR WEEK` kicker + a 2rem serif **This Week** + an uppercase `MONDAY–SUNDAY DINNERS` subtitle — burns ~150px before any content.
2. Each day card is ~130px (badge + day label + serif meal name + pill row + a separate "Change" footer with two buttons + a warning line). Seven of them is a full extra screen of scrolling, and they partly duplicate the week strip added earlier.

## Decisions (from brainstorming)

| Topic | Decision |
| --- | --- |
| Day cards | **Compact rows.** Flatten each card to two rows: a header row (badge + inline day-label + meal name + shuffle/pick icons on the right) and a meta pill row. Drop the "Change" footer/label. ~130px → ~64px. |
| Day label | **Inline** with the meal name (`MON · BOUGHT  Roots`), not stacked. |
| Top header | **Slim header.** Remove the kicker and the uppercase subtitle; shrink the serif title; put the Healthy meter inline beside it; compact action row beneath. |
| Scope | Plan screen only. Shopping/Meals headers unchanged (kept consistent via the shared `.screen-title`, which is *not* globally resized). |

## Component changes

### `index.html` — Plan header markup
Replace the current Plan header block:

```html
      <p class="kicker">Your Week</p>
      <h1 class="screen-title">This <em>Week</em></h1>
      <p class="sub" id="plan-sub">Monday–Sunday dinners</p>
      <div id="plan-banner"></div>
      <div class="action-row">
        <button class="btn-primary" id="btn-generate">Generate week</button>
        <button class="btn-soft" id="btn-reroll" hidden>Reshuffle week</button>
        <span class="healthy-meter" id="healthy-meter"></span>
      </div>
```

with a slim version:

```html
      <div class="plan-head">
        <h1 class="screen-title plan-title">This <em>Week</em></h1>
        <span class="healthy-meter" id="healthy-meter"></span>
      </div>
      <div id="plan-banner"></div>
      <div class="action-row">
        <button class="btn-primary" id="btn-generate">Generate week</button>
        <button class="btn-soft" id="btn-reroll" hidden>Reshuffle week</button>
      </div>
```

The kicker `<p>` and the `#plan-sub` subtitle are removed. `#healthy-meter` keeps its id (set by `app.js`), now living in a `.plan-head` flex row with the title. `#btn-generate`, `#btn-reroll`, `#plan-banner`, `#week-strip`, `#plan-cards` are unchanged.

### `index.html` — CSS
- Add: `.plan-head{display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin:6px 0 8px}` and `.plan-title{font-size:1.4rem; margin:0}` (shrinks the 2rem `.screen-title` for the Plan screen only).
- Rework the card rules for the compact two-row layout: `.card` becomes `display:flex; flex-direction:column; gap:8px; padding:10px 12px`; badge becomes static (in flow), 28px; new `.card-head` (flex row: badge + title + actions), `.card-title` (flex, baseline, wraps), `.card-actions` (flex, right). Drop the absolute badge positioning and the `46px` left indents on `.day-label`/`.meal-name`; shrink the meal name to ~0.95rem.
- Add `.override-warn:empty{display:none}` so the warning line reserves no space when empty.
- Remove the now-unused `.card-footer` and `.change-label` rules.

### `src/render.js` — `dayCardHTML`
Restructure the returned markup to the compact two-row form (keeping the same data and the three-way badge):

```js
  return `
    <article class="card ${isEat ? 'eatout' : 'cook'}" data-day="${dayIndex}">
      <div class="card-head">
        ${badge}
        <div class="card-title">
          <span class="day-label">${esc(label)}</span>
          <h3 class="meal-name">${esc(m.meal)}</h3>
        </div>
        <div class="card-actions">
          <button class="btn-icon" data-action="swap" data-day="${dayIndex}" aria-label="Shuffle ${esc(m.meal)}">${ICONS.refresh}</button>
          <button class="btn-icon" data-action="pick" data-day="${dayIndex}" aria-label="Pick a meal for ${esc(day.day)}">${ICONS.list}</button>
        </div>
      </div>
      <div class="pill-row">${pills}</div>
      <p class="override-warn" data-warn="${dayIndex}"></p>
    </article>`;
```

`m`, `isEat`, `label` (still `DAY · BOUGHT` for bought days), `pills`, and the badge logic are unchanged. The standalone "Change" footer and `.change-label` are gone; the two action buttons (same `data-action="swap"`/`"pick"`, same aria-labels) move into `.card-actions`.

### `sw.js`
Bump `CACHE` `dinner-v5` → `dinner-v6` so the new layout ships to installed clients.

## Unchanged
`app.js` (still calls `dayCardHTML(d, i)`; still sets `#healthy-meter`, `#plan-banner`, `#week-strip`, `#plan-cards`; strip tap-to-jump still resolves `.card[data-day]`), the generator, the model, the Shopping/Meals screens.

## Testing
- Existing `render.test.js` assertions remain valid (day label `MONDAY`, meal name, category/speed/cost/special/healthy pills, `data-action="swap"`/`"pick"`, no `<select>`/lock, badge classes, `· BOUGHT`).
- Add a test asserting the compact structure: the card contains `.card-head` and `.card-actions` and no `card-footer`/`change-label`.

## Out of scope
- Restyling the Shopping/Meals screen headers (Plan only for now).
- The dense-list and two-column-grid alternatives (rejected in favor of compact rows).
- Any generator/model/data change.
