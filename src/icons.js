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
    <circle class="fill" cx="12" cy="12" r="8" fill="currentColor" opacity=".16"/>
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
