# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Recovery Dashboard
**Generated:** 2026-06-09
**Category:** Personal Operating System / Health Dashboard
**Style Philosophy:** Notion × Linear × Obsidian — clean, calm, structured, dark mode only

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | Description |
|------|-----|--------------|-------------|
| Primary Background | `#09090b` | `--color-bg-primary` | Matte zinc-black viewport background |
| Cards & Containers | `#121215` | `--color-bg-card` | Flat matte obsidian container backing |
| Hover Elements | `#18181c` | `--color-bg-card-hover` | Subtle background elevation shifts |
| Separators / Borders| `#222227` | `--color-border` | Thin, sharp Obsidian-like lines |
| Interactive Borders | `#3f3f46` | `--color-border-focus` | Keyboard focus or card hover highlights |
| Primary Text | `#f4f4f5` | `--color-text-primary` | High contrast readable zinc-100 |
| Secondary Text | `#a1a1aa` | `--color-text-secondary` | Muted descriptions zinc-400 |
| Tertiary Text | `#52525b` | `--color-text-tertiary` | Out-of-focus labels zinc-600 |

### Accent Colors (Muted, Sophisticated)

| Accent | Hex | CSS Variable | Usage |
|--------|-----|--------------|-------|
| Blue | `#38bdf8` | `--color-accent-blue` | Neutral activity (e.g. Walking, Sitting Breaks) |
| Green | `#34d399` | `--color-accent-green` | Positive trends (e.g. Compliance, Strength) |
| Red | `#f87171` | `--color-accent-red` | Pain levels / negative warnings |
| Amber | `#fbbf24` | `--color-accent-amber` | Medium concerns / secondary metrics (e.g. Reflux) |
| Purple | `#818cf8` | `--color-accent-purple` | Special composites / tracking details (e.g. Sleep, Day counters) |

### Typography

- **Heading Font:** Inter
- **Body Font:** Inter
- **Data / Metrics Font:** JetBrains Mono (For numbers, compliance ratings, lists)
- **Mood:** professional, technical, precise, clean, calm
- **Google Fonts:** [Inter + JetBrains Mono](https://fonts.google.com/share?selection.family=Inter:wght@400;500;600;700%7CJetBrains+Mono:wght@400;500;600;700)

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps between details |
| `--space-sm` | `8px` / `0.5rem` | Inner element padding, list spacing |
| `--space-md` | `16px` / `1rem` | Standard grid gutters |
| `--space-lg` | `24px` / `1.5rem` | Page margins, card padding |
| `--space-xl` | `32px` / `2rem` | Section offsets |

### Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Inline buttons, small input fields |
| `--radius-md` | `10px` | Segmented controls, form frames |
| `--radius-lg` | `12px` | Primary cards, charts, sidebars |

---

## Component Specs

### Cards (`.linear-card`)

```css
.linear-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.01);
  transition: border-color 200ms ease;
}

.linear-card:hover {
  border-color: var(--color-border-focus);
}
```

### Segmented Controls

```css
.segmented-control {
  background: var(--color-bg-card);
  border: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  padding: 3px;
}

.segmented-control-active {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
```

---

## Style Guidelines

**Background Ambient Edge-Glow:**
Inject a subtle background image radial gradient on the viewports to give it depth and offset flat card grids.
```css
radial-gradient(at 0% 0%, rgba(129, 140, 248, 0.02) 0px, transparent 50%),
radial-gradient(at 50% 0%, rgba(56, 189, 248, 0.01) 0px, transparent 50%),
radial-gradient(at 100% 0%, rgba(167, 139, 250, 0.02) 0px, transparent 50%)
```

---

## Anti-Patterns (Do NOT Use)

- ❌ **Neon glows on status dots** — Keep indicators solid, small, and simple to prevent a flashy "crypto-dashboard" aesthetic.
- ❌ **Backdrop-filter blur in static cards** — Do not use GPU-heavy blurs unless content is dynamically scrolling behind the card layer.
- ❌ **Emojis as icons** — Use SVG icons (Lucide-react icons) exclusively.
- ❌ **Layout-shifting hover elevation** — Avoid scale transitions that shift adjacent content.
- ❌ **Instant hover transitions** — Smooth color and borders must use `200ms` eases.

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] No glowing drop-shadows on status dots
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] JetBrains Mono used for numbers and metrics
