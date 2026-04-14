# Design System: Editorial Sophistication for Tazelenme Üniversitesi

## 1. Overview & Creative North Star
**The Creative North Star: "The Academic Curator"**

This design system rejects the "SaaS-dashboard" aesthetic in favor of a high-end editorial experience. We are not building a generic admin tool; we are crafting a digital workspace that feels like a prestigious academic journal or a bespoke gallery archive. 

To break the "template" look, we employ **Intentional Asymmetry** and **Negative Space as Structure**. By utilizing large, serif-driven typography and a sophisticated "Deep Forest" palette, the UI commands authority while remaining breathable. The interface should feel "collected" rather than "programmed," using tonal layering and generous padding to guide the eye without the need for rigid, suffocating grids.

---

## 2. Colors & Surface Philosophy
The palette is rooted in nature and prestige. We avoid stark blacks and clinical grays in favor of "Surface White" and "Deep Forest."

### Tonal Hierarchy
- **Primary (`#00694c` / Taze Yeşil):** Reserved for high-intent actions and active states.
- **Secondary (`#3b6756` / Deep Forest):** Used for the sidebar and primary headings to provide an authoritative anchor.
- **Surface (`#fbf9f2` / Surface White):** The canvas. This is a warm, paper-like white that reduces eye strain and feels premium.
- **Tertiary (`#755700` / Amber):** Strictly for alerts, notifications, and high-priority status indicators.

### The "No-Line" Rule
Traditional 1px borders are prohibited for sectioning. We define space through **Background Color Shifts**. 
- A card (`surface_container_low`) does not need an outline when placed on a `surface` background. 
- Use the shift from `surface` to `surface_container` to indicate a change in context.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper:
1.  **Base Layer:** `surface` (#fbf9f2) - The main background.
2.  **Section Layer:** `surface_container_low` (#f6f4ec) - For grouping related content areas.
3.  **Component Layer:** `surface_container_lowest` (#ffffff) - For primary cards and white-space-heavy data.

### Signature Textures
Apply a subtle linear gradient to main action buttons: from `primary` (#00694c) to `primary_container` (#008560). This adds a "weighted" feel to the interaction that flat fills lack.

---

## 3. Typography: The Editorial Voice
We use a high-contrast pairing to distinguish between "Content" (Serif) and "Function" (Sans).

*Note: While the tokens utilize Newsreader/Manrope per the system scale, they are mapped to the brand's Playfair Display and DM Sans requirements.*

- **Display & Headlines (Playfair Display):** These are the "Editor's Voice." Use `display-lg` and `headline-md` for page titles and KPI numbers. High tracking (letter-spacing) should be avoided to keep the serif's elegance intact.
- **UI & Body (DM Sans):** The "Functional Voice." Use `title-md` for navigation and `body-md` for data entry. DM Sans provides the modern, clean legibility required for dense admin tasks.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural shadows.

- **The Layering Principle:** Place a white card (`surface_container_lowest`) on a cream background (`surface_container_low`). The contrast is enough to create "lift" without visual clutter.
- **Ambient Shadows:** Only use shadows for floating elements like Modals or Dropdowns. Use a `12%` opacity of the `on_surface` color with a `24px` blur. Shadows should feel like ambient light hitting paper, not a glow.
- **The "Ghost Border" Fallback:** For tables and inputs, use the `outline_variant` at **15% opacity**. This creates a "suggestion" of a boundary that disappears into the editorial layout.
- **Glassmorphism:** Use `backdrop-filter: blur(12px)` on the header bar to allow the rich "Deep Forest" sidebar or page content to peek through, creating a sense of continuity.

---

## 5. Components

### The Sidebar (Deep Forest)
The sidebar uses the `secondary` (#3b6756) base. 
- **Active State:** Instead of a highlight box, use a vertical "Taze Yeşil" bar on the left and transition the text color to `primary_fixed` (#86f8c9).

### KPI Cards
- **Structure:** Large `display-md` numbers in `secondary`. 
- **Style:** No borders. Use `surface_container_highest` for the card surface.
- **Context:** Place a small `label-sm` indicator below the number for the metric name.

### Tables (The Editorial Grid)
- **Rows:** Extra-wide padding (`24px` vertical). 
- **Borders:** Horizontal lines only, using the "Ghost Border" (15% opacity `outline_variant`). 
- **No Zebra Stripping:** Separation is achieved through white space and subtle hover states (`surface_container_high`).

### Buttons
- **Primary:** Gradient fill (`primary` to `primary_container`), `xl` roundedness (0.75rem).
- **Secondary:** Transparent with a "Ghost Border" and `secondary` text.
- **Tertiary:** Text only, with a `2px` underline on hover.

### Input Fields
- Avoid "box" inputs. Use a "Soft Tray" approach: `surface_container_low` background with a bottom-only border that thickens to `primary` on focus.

---

## 6. Do's and Don'ts

### Do
- **Do** use generous white space. If a section feels crowded, double the padding.
- **Do** use `Playfair Display` for any number that represents a "Result" (KPIs, Totals).
- **Do** rely on font-weight and color shifts (Deep Forest to Taze Yeşil) to show hierarchy before reaching for a new box or line.

### Don't
- **Don't** use pure black (#000000). Use `on_surface` (#1b1c18) for text.
- **Don't** use standard "Success Green." Use the brand's `Taze Yeşil` to maintain the sophisticated palette.
- **Don't** use zebra-striping in tables. It breaks the editorial flow; use horizontal "Ghost Borders" instead.
- **Don't** use sharp corners. Stick to the `xl` (0.75rem) and `lg` (0.5rem) scale to keep the interface feeling organic and approachable.