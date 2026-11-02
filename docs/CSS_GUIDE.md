# IMS CSS guide (for developers)

Use this with `src/styles/index.css`. Do not invent a new palette or font for app screens.

Stack: **Tailwind CSS v4** + **Poppins** + shared **`.ims-*`** classes.

---

## 1. Rules of thumb

1. Prefer theme tokens (`bg-ims-primary`, `text-ims-ink`) over raw hex.
2. Prefer shared classes (`.ims-btn-primary`, `.ims-card`, `.ims-field`) for buttons, cards, fields.
3. Keep **light theme only** — no dark mode unless product asks for it.
4. Touch targets ≥ **44px** (`min-h-11` / `min-height: var(--ims-touch)`).
5. Mobile fields stay **16px** font (already enforced in `index.css`).
6. Reuse existing components when possible:
   - `StatCard`, `Dialog`, `DataTable`, `StatusBadge`, `PageHeader` / `CardHeader`
7. Avoid purple-on-white AI clichés that fight this brand; IMS is **navy → violet → plum**.

---

## 2. Brand tokens

| Token | Hex | Tailwind | Use |
|-------|-----|----------|-----|
| Primary | `#3350b3` | `bg-ims-primary` `text-ims-primary` | Links, accents, focus |
| Primary hover | `#2a4398` | `bg-ims-primary-hover` | Hover states |
| Violet | `#513ea7` | `text-ims-violet` | Button gradient end |
| Navy | `#013f88` | `bg-ims-navy` | Header start |
| Plum | `#651e3d` | `bg-ims-plum` | Header end |
| Header mid | `#332e62` | `bg-ims-header` | App bar |
| Page bg | `#f2f3ff` | `bg-ims-bg` | Body |
| Surface | `#fbfbff` | `bg-ims-surface` | Soft panels |
| Ink | `#1f2547` | `text-ims-ink` | Body text |
| Link | `#2857b8` | `text-ims-link` | Text links |
| Line | `#e3e6f5` | `border-ims-line` | Card / divider borders |
| Thead | `#e3e9f6` | `bg-ims-thead` | Table headers |
| Drawer | `#e7e2ff` | `bg-ims-drawer` | Dialog title bar |
| Field wash | `#f7f5fb` | `bg-ims-field` | Soft form wells |
| Field line | `#cbbeff` | `border-ims-field-line` | Soft form borders |
| Accent | `#3b9bff` | `text-ims-accent` | Charts / highlights |

### Gradients (CSS vars, not Tailwind)

```css
var(--ims-header-gradient)  /* navy → plum header band */
var(--ims-button-gradient)  /* primary → violet CTA */
```

Classes: `.ims-header-bg`, `.login-hero-bg`, `.ims-btn-primary`.

### KPI washes

| Tone | Class | Typical use |
|------|-------|-------------|
| Sky | `.ims-stat-sky` | Totals / properties |
| Gold | `.ims-stat-gold` | Pending review |
| Lilac | `.ims-stat-lilac` | Rework |
| Mint | `.ims-stat-mint` | Approved / complete |
| Rose | `.ims-stat-rose` | Rejected |
| Peach | `.ims-stat-peach` | SLA / warning soft |

Prefer `<StatCard tone="sky" />` over hand-rolling KPI cards.

---

## 3. Typography

| Role | Classes / size | Weight |
|------|----------------|--------|
| Page / card title | `text-[17px] font-semibold text-ims-ink` or `.ims-section-title` | 600 |
| Dialog title | `text-lg font-medium text-ims-ink` | 500 |
| Body | `text-sm text-slate-700` | 400 |
| Muted / hint | `text-xs text-slate-500` or `.ims-hint` | 400–500 |
| KPI value | `text-[26px] sm:text-[30px] font-semibold` | 600 |
| Table header | `text-[13px] font-semibold` | 600 |
| Link | `.ims-link` | 600 |

Font stack: **Poppins** (400 / 500 / 600 / 700 loaded in `main.tsx`).

---

## 4. Shared CSS classes

Defined in `src/styles/index.css`.

### Layout

| Class | Purpose |
|-------|---------|
| `.ims-page` | Centered page shell, max ~1280px, safe-area padding |
| `.ims-section` | Vertical stack with gap |
| `.ims-section-title` / `.ims-section-sub` | Section heading + subtitle |
| `.ims-grid-kpis` | 2→4 column KPI grid |
| `.ims-grid-2` | 1→2 column content grid |
| `.scroll-row` | Horizontal chip row, scrollbar hidden |

### Surfaces

| Class | Purpose |
|-------|---------|
| `.ims-card` | White card, 14px radius, soft shadow |
| `.ims-card-pad` | Standard 20px padding |
| `.ims-card-flush` | `overflow: hidden` for tables |
| `.ims-panel` | Lighter bordered panel |
| `.ims-divider` | Hairline rule |

### Buttons

| Class | Purpose |
|-------|---------|
| `.ims-btn-primary` | Gradient CTA |
| `.ims-btn-secondary` | White / blue outline |
| `.ims-btn-ghost` | Text-only |
| `.ims-btn-danger` | Destructive soft |
| `.ims-btn-sm` | Compact size modifier |

Example:

```tsx
<button type="submit" className="ims-btn-primary">Save</button>
<button type="button" className="ims-btn-secondary">Cancel</button>
```

### Forms

| Class | Purpose |
|-------|---------|
| `.ims-label` / `.ims-label-req` | Field label (+ required asterisk) |
| `.ims-field` | Input / select / textarea |
| `.ims-field-error` | Error border |
| `.ims-hint` / `.ims-error-text` | Help / error copy |
| `.login-field` | Auth-only taller fields |

### Status

| Class | Purpose |
|-------|---------|
| `.ims-badge` | Neutral chip |
| `.ims-badge-current` | In progress |
| `.ims-badge-done` | Success |
| `.ims-badge-danger` | Rejected / error |
| `.ims-badge-rework` | Rework |
| `.ims-chip` / `.ims-chip-active` | Filter tabs |

Prefer `<StatusBadge label={state} />` for workflow states.

### Tables / dialogs / feedback

| Class | Purpose |
|-------|---------|
| `.ims-table-wrap` + `.ims-table` | Desk-like data table |
| `.ims-dialog-scrim` / `.ims-dialog-panel` / `.ims-dialog-header` / `.ims-dialog-body` | Drawer dialog chrome |
| `.ims-empty` | Empty list copy |
| `.ims-toast` / `.ims-toast-ok` / `.ims-toast-err` | Toasts |

Prefer `<Dialog />` and `<DataTable />` over rebuilding chrome.

---

## 5. Tailwind recipes (copy-paste)

### Page card with header

```tsx
<section className="ims-card ims-card-flush">
  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
    <div>
      <h1 className="text-[17px] font-semibold text-ims-ink">Title</h1>
      <p className="mt-0.5 text-sm text-slate-500">Optional subtitle</p>
    </div>
    <button type="button" className="ims-btn-primary">Action</button>
  </div>
  <hr className="ims-divider" />
  <div className="p-5">{/* content */}</div>
</section>
```

Or use `<CardHeader title="…" subtitle="…" />`.

### Form row

```tsx
<label className="ims-label ims-label-req" htmlFor="fy">Financial year</label>
<select id="fy" className="ims-field">…</select>
<p className="ims-hint">Uses the active FY calendar.</p>
```

### Mobile sticky action bar (from DocumentForm)

```tsx
<div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 [&>button]:min-h-11 [&>button]:flex-1 md:[&>button]:flex-none">
  <button type="button" className="ims-btn-secondary">Cancel</button>
  <button type="submit" className="ims-btn-primary">Save</button>
</div>
```

### Filter chips

```tsx
<div className="scroll-row flex gap-2 overflow-x-auto">
  <button type="button" className="ims-chip ims-chip-active">All</button>
  <button type="button" className="ims-chip">Draft</button>
</div>
```

---

## 6. Spacing & radius

| Token | Value | Notes |
|-------|-------|-------|
| Page pad | `clamp(0.75rem, 2vw, 1.25rem)` | `.ims-page` |
| Card radius | `14px` | `.ims-card` |
| Control radius | `10px` | buttons / fields |
| Dialog top radius (mobile) | `24px` | bottom sheet |
| Card shadow | `0 6px 20px rgba(31,37,71,.06)` | |
| Focus ring | `0 0 0 3px rgba(51,80,179,.12)` | |

Gaps: `gap-3` (12px) inside cards, `gap-4` (16px) between sections.

---

## 7. Icons & imagery

- Icons: **lucide-react**, default `h-4 w-4` or `h-5 w-5`.
- KPI art: `src/assets/design/stat-*.webp` via `StatCard` `art` prop.
- Branch illustration: `BranchArt` from `features/dashboard/regionArt`.

---

## 8. Do / don’t

**Do**

- Match dashboard / MIS look: soft lilac page bg, white cards, gradient CTAs.
- Use `text-ims-ink` for titles, `text-slate-500` for meta.
- Keep one primary action per toolbar (gradient button).

**Don’t**

- Introduce Inter / Roboto / system-only as the display font.
- Flat single-color marketing heroes on app pages (app chrome already has `.ims-header-bg`).
- Nested “card in card” for no reason — one `.ims-card` per section.
- Hardcode `#3350b3` when `text-ims-primary` / `var(--ims-primary)` exists.
- Put DMS Bearer tokens or secrets in CSS/JS — see `deploy/FRAPPE_SITE_CONFIG.md`.

---

## 9. File map

| Path | Role |
|------|------|
| `src/styles/index.css` | Tokens + shared classes (this system) |
| `src/main.tsx` | Loads Poppins + CSS |
| `src/components/common/*` | Shared UI primitives |
| `docs/CSS_GUIDE.md` | This guide |

When you add a pattern used in **3+ screens**, promote it into `index.css` as an `.ims-*` class and document it here.
