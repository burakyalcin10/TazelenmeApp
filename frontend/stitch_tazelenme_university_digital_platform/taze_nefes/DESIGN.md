# Design System Document: The Resilient Sage

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Companion"**

This design system is built to honor the life experience of the 60+ demographic. We are moving away from "clinical" accessibility and toward "Empathetic Editorial." The goal is to create a digital environment that feels like a premium, large-print lifestyle magazine—spacious, authoritative, and warm. 

We break the standard "app template" look by utilizing **Intentional Asymmetry** and **Tonal Depth**. By avoiding rigid grids and harsh borders, we create a flow that feels organic and less intimidating. The interface doesn't just display information; it "hosts" the user in a high-contrast, tactile space where every element is designed for confidence and clarity.

---

## 2. Colors & Surface Architecture
Our palette balances the freshness of "Taze Yeşil" with the grounding stability of "Almost Black."

### Surface Hierarchy & The "No-Line" Rule
To achieve a premium, high-end feel, **1px solid borders are strictly prohibited for sectioning.** 
*   **The Rule:** Boundaries are defined exclusively through background shifts. 
*   **Layering:** Use `surface` (#fcf9f5) as your base. Place `surface-container-low` (#f6f3f0) for secondary content areas. Use `surface-container-lowest` (#ffffff) for the most prominent interactive cards to create a natural "pop."

### Color Tokens
*   **Primary (Taze Yeşil):** `#00694c` – Used for primary actions and brand presence.
*   **Secondary (Mint):** `#50625d` – For supporting elements and subtle accents.
*   **Tertiary (Warning Red):** `#af262a` – Reserved strictly for critical warnings and deletions.
*   **The "Glass" Rule:** For floating headers or bottom navigation, use `surface` at 85% opacity with a `24px backdrop-blur`. This ensures the content "belongs" to the page rather than floating disconnectedly above it.
*   **Signature Texture:** Main CTA buttons should use a subtle linear gradient from `primary` (#00694c) to `primary_container` (#008560) at a 135-degree angle to provide a "tactile" depth that flat colors lack.

---

## 3. Typography: Editorial Clarity
We use **Plus Jakarta Sans** (interpreting the warmth of Nunito with a more premium, modern execution). The focus is on a dramatic scale difference to guide the eye without overwhelming the user.

*   **Display-MD (2.75rem):** Used for welcome screens and major section headers. High-contrast (`on_surface`) is mandatory.
*   **Headline-SM (1.5rem):** The workhorse for page titles. Bold, confident, and always anchored to the top-left to establish a clear starting point.
*   **Title-MD (1.125rem):** Used for card titles.
*   **Body-LG (1rem / 16px):** This is our **minimum size**. No text on any screen shall be smaller than this to ensure effortless readability for the 60+ age group.
*   **Tracking:** Increase letter-spacing slightly (0.02em) for all body text to prevent characters from "blurring" together for users with visual impairments.

---

## 4. Elevation & Depth
We eschew traditional drop shadows in favor of **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. The slight shift in brightness creates a "soft lift" that is easier on the aging eye than high-contrast shadows.
*   **Ambient Shadows:** If a floating element (like a FAB) is required, use an extra-diffused shadow: `box-shadow: 0 12px 32px rgba(0, 105, 76, 0.08);`. Note the use of a tinted primary color rather than grey.
*   **The Ghost Border:** If a container requires a boundary (e.g., in high-glare environments), use the `outline_variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components

### Buttons (The "Confidence" Component)
*   **Height:** All primary buttons must be **64px** high to exceed the 56px minimum.
*   **Shape:** `xl` (1.5rem) roundedness to provide a friendly, non-aggressive feel.
*   **Interaction:** Use `primary_fixed` (#86f8c9) for active/pressed states to provide a clear "light-up" feedback.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines. Use `24px` of vertical white space to separate list items.
*   **Structure:** Maximize the "Large Placeholder" rule. Every list item should have an icon or image of at least **48px x 48px** to provide a visual anchor.

### Bottom Navigation
*   **Size:** 80px height. 
*   **Style:** `surface` with backdrop-blur. 
*   **Visuals:** Icon and Label must appear together. Active state uses a `Mint` (#E1F5EE) pill-shaped background behind the icon.

### Critical Action Confirmation
*   **Pattern:** Any "Delete" or "Exit" action must trigger a full-screen `surface_container_highest` overlay. This forces a cognitive pause and prevents accidental data loss.

---

## 6. Do's and Don'ts

### Do
*   **Do** limit screens to a maximum of 3-4 information elements. If there is more content, use a "Next" pattern rather than an infinite scroll.
*   **Do** use asymmetrical margins (e.g., 24px left, 32px right) to give the UI a modern, editorial feel.
*   **Do** use `on_surface_variant` for helper text, but ensure the contrast ratio remains at least 4.5:1.

### Don't
*   **Don't** use "Empty States" that are just text. Use a large, warm illustration or a `primary_container` tinted icon.
*   **Don't** use standard snackbars that disappear. Notifications for this demographic should be persistent until dismissed ("Sticky Alerts").
*   **Don't** use 1px borders. Ever. Define space through color and padding.

---

## 7. Signature Layout: The "Breathing" Grid
Instead of a standard centered column, use a staggered layout. A headline might start at 24px from the left, while the following body text is indented to 48px. This "staircase" effect helps the eye track downward through the information in a logical, rhythmic flow.