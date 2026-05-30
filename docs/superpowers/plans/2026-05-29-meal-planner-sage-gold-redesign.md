# Sage & Gold Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the light "Fresh Kitchen" theme with the approved dark **Sage & Gold** look (muted sage ground, antique gold, Playfair Display + Inter, refined duotone icons) without changing any behavior.

**Architecture:** All visual code lives in three places: `index.html` (`<style>` tokens + component CSS + markup), `src/icons.js` (inline SVGs), and `src/render.js` (card/row markup). Logic modules (generator, store, sheet, shopping, etc.) are untouched. Self-hosted woff2 fonts in `/fonts`, precached by `sw.js` for offline.

**Tech Stack:** Vanilla HTML/CSS/ES modules, no build step. `node:test` for unit tests. Self-hosted webfonts.

**Reference mockup:** `.superpowers/brainstorm/2482-1780104113/content/sage-gold-final.html` (the approved screen). Full token table in `docs/superpowers/specs/2026-05-29-meal-planner-sage-gold-redesign-design.md`.

---

## Task 1: Redesign the icon set (`icons.js`)

Rename `cart`→`bag`, refine `utensils` to fork+knife, add `pot` and `star`, retune every icon to duotone stroke 1.5 / fill-opacity .16. All keep `currentColor`.

**Files:**
- Modify: `src/icons.js` (full rewrite)
- Test: `tests/render.test.js:11-17`

- [ ] **Step 1: Update the failing icon test**

Replace the test at `tests/render.test.js:11-17` with:

```js
test('every core icon exists and is an svg using currentColor', () => {
  for (const name of ['calendar', 'bag', 'utensils', 'refresh', 'leaf', 'tag', 'pot', 'star', 'lock']) {
    assert.ok(ICONS[name], `missing icon: ${name}`);
    assert.match(ICONS[name], /^<svg[\s\S]*<\/svg>$/);
    assert.match(ICONS[name], /currentColor/);
  }
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — `missing icon: bag` (and `pot`/`star`), because `icons.js` still exports `cart` and lacks the new icons.

- [ ] **Step 3: Rewrite `src/icons.js`**

Replace the entire file with:

```js
// Soft-duotone inline SVGs. `.fill` = tinted shape (opacity .16), `.stroke` = outline.
// Both use currentColor so the icon recolors with the surrounding text color.
const svg = (paths) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">${paths}</svg>`;

export const ICONS = {
  calendar: svg(`
    <rect class="fill" x="3.5" y="5.5" width="17" height="15" rx="2.5" fill="currentColor" opacity=".16"/>
    <rect class="stroke" x="3.5" y="5.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path class="stroke" d="M3.5 9.5h17M8 3.5v3M16 3.5v3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
  bag: svg(`
    <path class="fill" d="M6 8h12l-1 11H7L6 8Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M6 8h12l-1 11H7L6 8Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path class="stroke" d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
  utensils: svg(`
    <path class="fill" d="M16 3.5c2 1.5 2 5 0 6.5Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M8 3.5v6m-2-6v4m4-4v4m-2 2v9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="stroke" d="M16 3.5c2 1.5 2 5 0 6.5v9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`),
  refresh: svg(`
    <path class="fill" d="M19.5 9A8 8 0 1 0 20 14L19.5 9Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M19.5 9A8 8 0 1 0 20 14M20 4.5V9h-4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`),
  leaf: svg(`
    <path class="fill" d="M19 5C11 5 6 9.5 6.5 16.5 13.5 17 19 12 19 5Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M19 5C11 5 6 9.5 6.5 16.5 13.5 17 19 12 19 5ZM8 18c2.5-4 5.5-7 9-9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`),
  tag: svg(`
    <path class="fill" d="M4 4h7l9 9-7 7-9-9V4Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M4 4h7l9 9-7 7-9-9V4Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <circle class="stroke" cx="8" cy="8" r="1.3" fill="none" stroke="currentColor" stroke-width="1.5"/>`),
  pot: svg(`
    <path class="fill" d="M5 9.5h14v4.5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9.5Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M5 9.5v4.5a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V9.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="stroke" d="M3.5 9.5h17M10.5 6.5h3M5 11.5H3.6M19 11.5h1.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
  star: svg(`
    <path class="fill" d="M12 4l2.5 5.2 5.5.6-4.1 3.7 1.2 5.4L12 16.8 6.9 19.6l1.2-5.4L4 10.4l5.5-.6L12 4Z" fill="currentColor" opacity=".16"/>
    <path class="stroke" d="M12 4l2.5 5.2 5.5.6-4.1 3.7 1.2 5.4L12 16.8 6.9 19.6l1.2-5.4L4 10.4l5.5-.6L12 4Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>`),
  lock: svg(`
    <rect class="fill" x="5" y="11" width="14" height="9" rx="2" fill="currentColor" opacity=".16"/>
    <rect class="stroke" x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path class="stroke" d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`),
};
```

- [ ] **Step 4: Run tests to confirm green**

Run: `npm test`
Expected: PASS — all 33 tests (icon test now finds bag/pot/star).

- [ ] **Step 5: Commit**

```bash
git add src/icons.js tests/render.test.js
git commit -m "feat(icons): bag/fork+knife/pot/star duotone set for Sage & Gold"
```

---

## Task 2: Self-host the fonts

Download woff2 subsets for Inter (400/500/600) and Playfair Display (700 + 700 italic) into `/fonts`, normalized to fixed filenames.

**Files:**
- Create: `fonts/inter-400.woff2`, `fonts/inter-500.woff2`, `fonts/inter-600.woff2`, `fonts/playfair-700.woff2`, `fonts/playfair-700italic.woff2`

- [ ] **Step 1: Download via google-webfonts-helper and normalize names**

Run (from repo root):

```bash
mkdir -p fonts && cd fonts
curl -L "https://gwfh.mranftl.com/api/fonts/inter?download=zip&subsets=latin&variants=regular,500,600&formats=woff2" -o inter.zip
curl -L "https://gwfh.mranftl.com/api/fonts/playfair-display?download=zip&subsets=latin&variants=700,700italic&formats=woff2" -o playfair.zip
unzip -o inter.zip && unzip -o playfair.zip
mv inter-*-latin-regular.woff2 inter-400.woff2
mv inter-*-latin-500.woff2 inter-500.woff2
mv inter-*-latin-600.woff2 inter-600.woff2
mv playfair-display-*-latin-700.woff2 playfair-700.woff2
mv playfair-display-*-latin-700italic.woff2 playfair-700italic.woff2
rm -f inter.zip playfair.zip
cd ..
```

Note: glob names from gwfh include a version (`-vNN-`); the wildcards handle it. If a `mv` reports "no match", run `ls fonts` and rename the actual file to the target name manually.

- [ ] **Step 2: Verify the five files exist**

Run: `ls fonts/*.woff2`
Expected: exactly `inter-400.woff2 inter-500.woff2 inter-600.woff2 playfair-700.woff2 playfair-700italic.woff2`

- [ ] **Step 3: Commit**

```bash
git add fonts/
git commit -m "chore(fonts): self-host Inter + Playfair Display woff2 subsets"
```

---

## Task 3: New color tokens, background & base typography (`index.html`)

Replace the `:root` block and base `body`/`.wrap`/title CSS, and add `@font-face`. After this task the app is dark with the new type even before components are restyled.

**Files:**
- Modify: `index.html:6` (`theme-color`), `index.html:9-26` (`<style>` head: tokens + base)

- [ ] **Step 1: Update the theme-color meta**

Change `index.html:6` from:
```html
  <meta name="theme-color" content="#1F6E54"/>
```
to:
```html
  <meta name="theme-color" content="#2F382F"/>
```

- [ ] **Step 2: Replace the top of the `<style>` block**

Replace lines from `:root{` through the `.sub{...}` rule (currently `index.html:10-26`) with:

```css
    @font-face{font-family:'Inter';font-style:normal;font-weight:400;font-display:swap;src:url('fonts/inter-400.woff2') format('woff2')}
    @font-face{font-family:'Inter';font-style:normal;font-weight:500;font-display:swap;src:url('fonts/inter-500.woff2') format('woff2')}
    @font-face{font-family:'Inter';font-style:normal;font-weight:600;font-display:swap;src:url('fonts/inter-600.woff2') format('woff2')}
    @font-face{font-family:'Playfair Display';font-style:normal;font-weight:700;font-display:swap;src:url('fonts/playfair-700.woff2') format('woff2')}
    @font-face{font-family:'Playfair Display';font-style:italic;font-weight:700;font-display:swap;src:url('fonts/playfair-700italic.woff2') format('woff2')}

    :root{
      --bg:#2F382F; --bg-2:#3B453D;
      --surface:rgba(255,255,255,.05); --surface-line:rgba(198,161,76,.15);
      --gold:#C6A14C; --gold-2:#B58C38; --gold-hi:#D9B863; --gold-soft:rgba(198,161,76,.16);
      --cream:#ECE7D9; --cream-muted:#9FA89B;
      --sage-leaf:#BDCB9E; --sage-leaf-bg:rgba(169,185,140,.18);
      --ink-on-gold:#2A2616; --line:rgba(236,231,217,.12);
      --serif:'Playfair Display',Georgia,'Times New Roman',serif;
      --sans:'Inter',system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
      --r-card:18px; --r-chip:14px;
      --shadow-rest:0 4px 14px rgba(0,0,0,.22);
      --shadow-raise:0 14px 36px rgba(0,0,0,.34);
    }
    *{box-sizing:border-box}
    html,body{margin:0}
    body{
      font-family:var(--sans);
      background:linear-gradient(160deg,var(--bg-2) 0%,var(--bg) 60%) fixed; color:var(--cream);
      min-height:100vh; padding-bottom:72px; /* room for fixed tab bar */
    }
    /* soft radial gold glow behind the header */
    body::before{content:""; position:fixed; top:-120px; right:-120px; width:320px; height:320px;
      background:radial-gradient(circle at 30% 30%, rgba(198,161,76,.13), rgba(255,255,255,0) 70%);
      pointer-events:none; z-index:0;}
    .wrap{max-width:840px; margin:0 auto; padding:16px; position:relative; z-index:1}
    .kicker{font-size:.56rem; font-weight:600; letter-spacing:.3em; text-transform:uppercase; color:var(--gold); margin:8px 0 0}
    .screen-title{font-family:var(--serif); font-size:2rem; font-weight:700; letter-spacing:0; color:var(--cream); margin:2px 0 6px}
    .screen-title em{color:var(--gold); font-style:italic}
    .sub{color:var(--cream-muted); font-size:.62rem; font-weight:600; letter-spacing:.16em; text-transform:uppercase; margin:0 0 16px}
    :focus-visible{outline:2px solid var(--gold); outline-offset:2px; border-radius:4px}
```

- [ ] **Step 3: Run tests + manual check**

Run: `npm test` → Expected: PASS (no logic touched).
Manual: `python -m http.server 8000`, open `http://localhost:8000` at phone width. Expected: dark sage background, cream serif "This Week" title, gold glow top-right. Components below still look half-styled — that's fixed in later tasks.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(theme): Sage & Gold tokens, dark gradient ground, web-font base type"
```

---

## Task 4: Day cards, pills, buttons & swap (`index.html` + `render.js`)

Replace the card/pill/button CSS, remove the left-edge pseudo-element, and add the badge to the card markup (pot for cook, star for eat-out).

**Files:**
- Modify: `index.html:39-74` (cards, pills, buttons CSS)
- Modify: `src/render.js:18-41` (`dayCardHTML`)
- Test: `tests/render.test.js`

- [ ] **Step 1: Add failing badge assertions**

In `tests/render.test.js`, inside the existing `'dayCardHTML renders meal...'` and `'...marks eat-out...'` tests, add after their existing asserts:

```js
// in the cook test:
assert.match(html, /badge-cook/);
// in the eat-out test:
assert.match(html, /badge-eatout/);
```

- [ ] **Step 2: Run to confirm fail**

Run: `npm test`
Expected: FAIL — `badge-cook`/`badge-eatout` not found.

- [ ] **Step 3: Add the badge to `dayCardHTML`**

In `src/render.js`, replace the `return \`...\`` block of `dayCardHTML` (lines 27-40) with:

```js
  const badge = isEat
    ? `<span class="badge badge-eatout" aria-hidden="true">${ICONS.star}</span>`
    : `<span class="badge badge-cook" aria-hidden="true">${ICONS.pot}</span>`;
  return `
    <article class="card ${isEat ? 'eatout' : 'cook'}${lockCls}" data-day="${dayIndex}">
      ${badge}
      <p class="day-label">${esc(label)}</p>
      <h3 class="meal-name">${esc(day.meal.meal)}</h3>
      <div class="pill-row">
        ${pills}
        <button class="btn-swap" data-action="swap" data-day="${dayIndex}" aria-label="Swap ${esc(day.meal.meal)}">${ICONS.refresh}</button>
        <button class="btn-lock${day.locked ? ' is-on' : ''}" data-action="lock" data-day="${dayIndex}" aria-label="Lock this day" aria-pressed="${day.locked}">${ICONS.lock}</button>
      </div>
      <div class="override">
        ${daySelectHTML(day, dayIndex, meals)}
        <p class="override-warn" data-warn="${dayIndex}"></p>
      </div>
    </article>`;
```

- [ ] **Step 4: Replace the card/pill/button CSS**

In `index.html`, replace the block from `/* day cards */` through the `.action-row{...}` rule (currently `index.html:39-74`) with:

```css
    /* day cards */
    .cards{display:grid; gap:12px}
    .card{
      position:relative; background:var(--surface); border:1px solid var(--surface-line);
      border-radius:var(--r-card); padding:14px 14px 12px 14px; overflow:hidden;
    }
    .card.eatout{background:var(--gold-soft); border-color:rgba(198,161,76,.3)}
    .card.is-locked{border-color:var(--gold); box-shadow:0 0 0 1px var(--gold) inset}
    .badge{position:absolute; top:14px; left:14px; width:34px; height:34px; border-radius:9px;
      display:grid; place-items:center}
    .badge svg{width:20px; height:20px}
    .badge-cook{border:1.5px solid rgba(198,161,76,.55); color:var(--gold)}
    .badge-eatout{background:linear-gradient(135deg,var(--gold),var(--gold-2)); color:var(--ink-on-gold)}
    .day-label{margin:0 0 4px 46px; font-size:.56rem; font-weight:600; letter-spacing:.14em;
      text-transform:uppercase; color:var(--cream-muted)}
    .card.eatout .day-label{color:var(--gold-hi)}
    .meal-name{margin:0 0 10px 46px; font-family:var(--serif); font-size:1rem; font-weight:700; color:var(--cream)}
    .pill-row{display:flex; flex-wrap:wrap; align-items:center; gap:6px}

    /* pills */
    .pill{display:inline-flex; align-items:center; gap:4px; border-radius:999px; padding:3px 9px;
      font-size:.6rem; font-weight:600; line-height:1.4}
    .pill svg{width:14px; height:14px}
    .pill-cat{background:var(--surface); color:var(--cream)}
    .pill-healthy{background:var(--sage-leaf-bg); color:var(--sage-leaf)}
    .pill-deal{background:var(--gold-soft); color:var(--gold-hi)}
    .pill-where{background:var(--surface); color:var(--cream)}
    .pill-staple{background:var(--gold-soft); color:var(--gold-hi)}

    /* buttons */
    .btn-swap{margin-left:auto; width:30px; height:30px; border-radius:999px; background:transparent;
      border:1.5px solid rgba(198,161,76,.45); color:var(--gold); display:grid; place-items:center; cursor:pointer}
    .btn-swap svg{width:16px; height:16px}
    .btn-lock{border:0; background:none; cursor:pointer; color:var(--cream-muted)}
    .btn-lock.is-on{color:var(--gold)}
    .btn-lock svg{width:18px; height:18px}
    .btn-primary{background:linear-gradient(135deg,var(--gold),var(--gold-2)); color:var(--ink-on-gold);
      border:0; border-radius:999px; padding:12px 22px; font-weight:700; letter-spacing:.04em; cursor:pointer;
      min-height:44px; box-shadow:0 8px 20px rgba(181,140,56,.3)}
    .btn-soft{background:transparent; color:var(--gold-hi); border:1.5px solid rgba(198,161,76,.45);
      border-radius:999px; padding:10px 16px; font-weight:700; cursor:pointer; min-height:44px}
    .action-row{display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin:14px 0}
```

- [ ] **Step 5: Run tests + manual check**

Run: `npm test` → Expected: PASS (35 assertions; badge tests green).
Manual: reload, Generate a week. Expected: translucent cards, gold-outline pot badge on cook nights, gold-gradient star badge on eat-out (gold-tinted card), gold-gradient "Generate week" button, gold-outline swap.

- [ ] **Step 6: Commit**

```bash
git add index.html src/render.js tests/render.test.js
git commit -m "feat(cards): badge-based day cards, gold pills & buttons"
```

---

## Task 5: Header markup + tab bar (`index.html` + `app.js`)

Add the gold kicker, wrap the Plan title's last word in `<em>`, restyle the tab bar, and switch the shopping tab icon to `bag`.

**Files:**
- Modify: `index.html:28-37` (tab CSS), `index.html:111` (plan title markup)
- Modify: `src/app.js:36-40` (`paintTabIcons`)

- [ ] **Step 1: Replace the tab CSS**

In `index.html`, replace the `/* tabs */` block (currently `index.html:28-37`) with:

```css
    /* tabs */
    .tabbar{
      position:fixed; left:0; right:0; bottom:0; display:flex; z-index:10;
      background:rgba(18,22,18,.72); backdrop-filter:blur(8px);
      border-top:1px solid rgba(198,161,76,.14); padding:6px 0 max(6px, env(safe-area-inset-bottom));
    }
    .tab{flex:1; background:none; border:0; color:var(--cream-muted); display:flex; flex-direction:column;
      align-items:center; gap:3px; font-size:.6rem; font-weight:600; cursor:pointer; min-height:44px}
    .tab[aria-selected="true"]{color:var(--gold)}
    .tab svg{display:block}
```

- [ ] **Step 2: Add the kicker + gold title word on the Plan screen**

In `index.html`, replace line 111 (`<h1 class="screen-title">This Week</h1>`) with:

```html
      <p class="kicker">Your Week</p>
      <h1 class="screen-title">This <em>Week</em></h1>
```

- [ ] **Step 3: Point the Shopping tab at the `bag` icon**

In `src/app.js`, replace `paintTabIcons` (lines 36-40) with:

```js
function paintTabIcons() {
  $('#tab-plan').innerHTML = `${ICONS.calendar}<span>Plan</span>`;
  $('#tab-shopping').innerHTML = `${ICONS.bag}<span>Shopping</span>`;
  $('#tab-meals').innerHTML = `${ICONS.utensils}<span>Meals</span>`;
}
```

- [ ] **Step 4: Run tests + manual check**

Run: `npm test` → Expected: PASS.
Manual: reload. Expected: "YOUR WEEK" gold kicker above a serif "This *Week*" (Week in gold italic); bottom tab bar is translucent dark with gold active tab; Shopping shows a bag, Meals shows fork+knife.

- [ ] **Step 5: Commit**

```bash
git add index.html src/app.js
git commit -m "feat(header,tabs): gold kicker + serif title, dark gold tab bar, bag icon"
```

---

## Task 6: Shopping, Meals, banners & override CSS (`index.html`)

Restyle the remaining surfaces for the dark theme.

**Files:**
- Modify: `index.html:76-98` (banners, shopping, meals, override CSS)

- [ ] **Step 1: Replace the banners-through-override CSS**

In `index.html`, replace the block from `/* banners / states */` through the `.override-warn{...}` rule (currently `index.html:76-98`) with:

```css
    /* banners / states */
    .banner{background:var(--sage-leaf-bg); color:var(--sage-leaf); border-radius:var(--r-chip);
      padding:10px 12px; font-size:.78rem; font-weight:600; margin:0 0 12px}
    .banner.warn{background:var(--gold-soft); color:var(--gold-hi)}
    .empty{color:var(--cream-muted); text-align:center; padding:40px 16px; font-weight:600}
    .healthy-meter{font-size:.78rem; font-weight:700; color:var(--gold-hi)}

    /* shopping */
    .aisle-h{font-size:.7rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
      color:var(--cream-muted); margin:16px 0 6px}
    .shop-row{display:flex; align-items:center; gap:10px; background:var(--surface); border:1px solid var(--surface-line);
      border-radius:12px; padding:10px 12px; margin-bottom:6px}
    .shop-row input{accent-color:var(--gold)}
    .shop-row.is-checked .shop-name{text-decoration:line-through; color:var(--cream-muted)}
    .shop-name{font-weight:600; font-size:.9rem; color:var(--cream)}
    .shop-meals{margin-left:auto; color:var(--cream-muted); font-size:.7rem; font-weight:600}
    .meal-row{background:var(--surface); border:1px solid var(--surface-line); border-radius:var(--r-card);
      padding:12px 14px; margin-bottom:10px}
    .meal-row .meal-name{margin-left:0}
    .meal-ings{color:var(--cream-muted); font-size:.75rem; font-weight:600; margin:8px 0 0}

    .override{margin-top:10px}
    .day-select{width:100%; padding:8px 10px; border:1px solid var(--surface-line); border-radius:var(--r-chip);
      background:rgba(0,0,0,.18); color:var(--cream); font-weight:600; min-height:44px}
    .override-warn{color:var(--gold-hi); font-size:.72rem; font-weight:700; margin:6px 0 0}
```

- [ ] **Step 2: Run tests + manual check**

Run: `npm test` → Expected: PASS.
Manual: open Shopping and Meals tabs. Expected: translucent rows on the sage ground, gold checkboxes, readable cream text, gold-tinted staple pills; banners (if shown) use sage/gold tints. Confirm the Meals tab meal names are not indented (the `.meal-row .meal-name{margin-left:0}` override).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(shopping,meals): dark Sage & Gold surfaces, banners, override"
```

---

## Task 7: PWA chrome — manifest, service worker, font precache (`manifest.webmanifest`, `sw.js`)

**Files:**
- Modify: `manifest.webmanifest`
- Modify: `sw.js`

- [ ] **Step 1: Update manifest colors**

In `manifest.webmanifest`, change line 6 from `"background_color": "#FAF8F3",` to `"background_color": "#2F382F",` and line 7 from `"theme_color": "#1F6E54",` to `"theme_color": "#2F382F",`.

- [ ] **Step 2: Bump the cache version in `sw.js`**

Change `sw.js:1` from:
```js
const CACHE = 'dinner-v1';
```
to:
```js
const CACHE = 'dinner-v2';
```

- [ ] **Step 3: Add the fonts to the precache `SHELL` array**

In `sw.js`, replace the `SHELL` array (lines 2-6) with (adds the five woff2 files, same no-leading-`./` style):

```js
const SHELL = [
  '.', 'index.html', 'manifest.webmanifest',
  'src/app.js', 'src/config.js', 'src/csv.js', 'src/model.js', 'src/generator.js',
  'src/deals.js', 'src/shopping.js', 'src/store.js', 'src/sheet.js', 'src/render.js', 'src/icons.js',
  'fonts/inter-400.woff2', 'fonts/inter-500.woff2', 'fonts/inter-600.woff2',
  'fonts/playfair-700.woff2', 'fonts/playfair-700italic.woff2',
];
```

- [ ] **Step 4: Run tests + manual offline check**

Run: `npm test` → Expected: PASS.
Manual: reload with DevTools open, confirm the new service worker activates (Application → Service Workers), then tick "Offline" and reload — the app shell still renders **with** the serif/sans fonts (fonts served from cache).

- [ ] **Step 5: Commit**

```bash
git add manifest.webmanifest sw.js
git commit -m "feat(pwa): sage theme-color, precache self-hosted fonts, bump cache"
```

---

## Task 8: Rewrite `DESIGN-SYSTEM.md`

Make the doc describe Sage & Gold as the current system (it currently documents Fresh Kitchen).

**Files:**
- Modify: `DESIGN-SYSTEM.md` (rewrite)

- [ ] **Step 1: Rewrite the doc**

Replace `DESIGN-SYSTEM.md` so its sections reflect the spec: Direction ("Sage & Gold — dark, premium, elegant bistro"); Color (the §2 token table); Typography (Playfair Display + Inter, self-hosted); Spacing/radius/elevation; Components (badge day card, pills, buttons, dark tab bar, shopping/meals); Iconography (refined duotone, bag/fork+knife/pot/star); Motion (unchanged); Responsive (unchanged); Accessibility (dark-theme contrast, color-not-sole-signal, gold focus ring). Pull values verbatim from `docs/superpowers/specs/2026-05-29-meal-planner-sage-gold-redesign-design.md`.

- [ ] **Step 2: Commit**

```bash
git add DESIGN-SYSTEM.md
git commit -m "docs: rewrite design system for Sage & Gold"
```

---

## Task 9: Final verification & push

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: PASS — all tests (33 + the 2 added badge asserts) green, 0 fail.

- [ ] **Step 2: Manual QA pass against the mockup**

Serve (`python -m http.server 8000`) and, at phone width, verify against `.superpowers/brainstorm/2482-1780104113/content/sage-gold-final.html`:
- Generate a week: cook vs eat-out badges, healthy sage pill, deal gold pill, swap/lock, re-roll, override select + warning.
- Shopping list groups, checkboxes, staples persist.
- Meals list readable.
- Tab switching; active tab gold.
- No leftover pine/coral/mint/paper colors anywhere (grep check below).

Run: `grep -nE "1F6E54|FF7A5C|6FD3A6|FAF8F3|--pine|--coral|--mint|--peach|--paper|--ink" index.html src/*.js manifest.webmanifest`
Expected: no matches (all old tokens/values removed).

- [ ] **Step 3: Push**

```bash
git push
```

Expected: branch `master` updated on `origin`. GitHub Pages (if enabled) redeploys automatically.

---

## Notes
- **Out of scope (do not add):** light/auto theme, food photography/illustrations, animated gradients, app-icon PNG regeneration (the gold-on-sage `icon-192/512.png` refresh is a separate follow-up), any logic/data/generator change.
- If `npm test` ever fails on a step it wasn't expected to, stop and diagnose before continuing — the logic modules must stay green throughout.
