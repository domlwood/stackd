# Dealframe — Brand Identity

**Status:** Working brand direction · November 2026  
**Purpose:** A practical source of truth for designers, marketers, and engineers.  
**Reference:** The user-selected Dealframe brand/dashboard composition featuring two overlapping square frames, a muted-blue intersection, a lowercase wordmark, and a restrained property-analysis interface.

## 1. Brand foundation

**Name:** Dealframe  
**Preferred display:** `dealframe` (one word, lowercase)  
**Category:** Property investment intelligence software  
**Initial market:** UK property investors  
**Positioning:** An intelligent workspace that turns property listings into structured, actionable investment analysis.

### Core promise

**See beyond the listing.**

Dealframe removes the repetitive work between discovering a property and understanding its investment potential. Users import a listing, inspect the facts, add or refine assumptions, and evaluate a deal in one clear workspace.

### What Dealframe is—and is not

- **Is:** A decision-support product for buy-to-let, flips, BRRR and, eventually, the broader investment lifecycle.
- **Is:** Transparent about which values come from a listing, which are estimates, and which are user assumptions.
- **Is not:** An estate agent, property listing portal, or a source of guaranteed returns.
- **Is not:** An AI-first novelty brand; automation should be useful, quiet, and verifiable.

### Brand attributes

1. **Precise:** Clear hierarchy, disciplined geometry, defensible calculations.
2. **Intelligent:** Makes complex information easier to interpret, without theatrics.
3. **Credible:** Financially serious, honest about uncertainty.
4. **Contemporary:** Premium software rather than conventional property marketing.
5. **Approachable:** Confident but never intimidating.

## 2. Naming and verbal identity

**Deal** represents the investment opportunity. **Frame** represents the structure through which it is evaluated. The meaning can stretch from initial deal analysis into acquisition, refurbishment, refinancing and portfolio growth.

### Working messaging

- **Primary tagline:** See beyond the listing.
- **Supporting proposition:** Property investment intelligence, without the manual work.
- **Product narrative:** From listing to insight.
- **Extended journey:** Analyse · Plan · Refine · Grow.

These are working lines, not mandatory copy for every placement. Prefer plain, concrete language over exaggerated promises.

### Voice and tone

- Short, direct sentences; confident without hype.
- Use investment terminology accurately: yield, cash flow, end value, LTV, purchase costs.
- Explain assumptions and caveats in context, not buried in footnotes.
- Prefer **“Estimated monthly rent”** to **“AI-predicted rental upside.”**
- Prefer **“Review your assumptions”** to **“Unlock instant investment certainty.”**
- Never claim that a deal is objectively “good” without explaining the criteria and uncertainty.

## 3. Visual identity — selected direction

The **selected visual reference** is the original Dealframe brand/dashboard board, **not** the later four-quadrant-grid or open-corner alternatives.

### Primary symbol

Two **offset, overlapping square frames**:

- One square is positioned **lower-left**.
- The other is positioned **upper-right**.
- Both use dark, architectural, rectilinear strokes.
- A small **muted-cobalt square** occupies the central overlap, symbolising the insight created by framing an opportunity.
- Geometry should be square, deliberate, and balanced; avoid rounded outer containers, a four-cell window/grid, corner brackets, roofs, or building silhouettes.

**Design intent:** Two perspectives on one opportunity: the physical property and its financial interpretation.

**Preservation rule:** Refine line weights, offsets, negative space, optical alignment and wordmark spacing without changing the fundamental overlap motif. The original selected board is the visual authority. AI redraws are exploratory, not pixel-perfect masters.

### Wordmark

- Set `dealframe` entirely lowercase.
- Bold or confident semibold contemporary grotesk/sans-serif.
- Clean counters, controlled kerning, subtle softness in the letterforms.
- Avoid ultra-geometric novelty, exaggerated roundedness, or extended letter spacing.
- The selected board resembles a modern Inter-like sans; exact font and custom lettering remain **to be finalised**.

### Logo system to produce

1. **Primary horizontal lockup:** Symbol left, wordmark right.
2. **Symbol-only:** Sidebar collapsed state, favicon, app icon.
3. **Reverse lockup:** Off-white mark/wordmark on near-black, blue overlap retained where legible.
4. **Monochrome lockup:** One-colour dark and one-colour light variants.
5. **Small-size optimised symbol:** Manually adjusted for 16, 20, 24 and 32 px rendering.

### Clear space and sizing

Use a provisional minimum clear space equal to approximately one symbol-stroke width on all sides; formalise after vector construction. Test horizontal logo legibility at common navigation heights, and ensure the overlap square does not vanish at favicon scale. Do not claim final geometric measurements until the SVG master is approved.

## 4. Colour system

| Role | Hex | Usage |
|---|---|---|
| Ink | `#17191C` | Logo, primary text, dark surfaces |
| Warm off-white | `#FAFAF8` | Primary light canvas, reverse logo |
| Muted cobalt | `#526DAB` | Logo intersection, restrained product accents |
| Slate | `#777D84` | Secondary text, metadata |
| Mist | `#E9EBE9` | Soft surfaces, subtle separators |

**Colour principles:** Predominantly neutral. Cobalt is an accent, not a blanket brand wash. Keep charts and financial status colours semantically distinct from the brand accent. Meet accessible contrast requirements for functional UI; these hex values are brand anchors, not a complete accessibility-tested token set.

## 5. Typography

The reference board specifies **Inter** and uses confident, compact SaaS typography. For fidelity, begin with:

- **Brand and UI:** Inter, with custom wordmark adjustments if needed.
- **Financial figures:** Inter with tabular numerals (`font-variant-numeric: tabular-nums`).
- **Optional code/data labels:** A restrained monospace only where meaningful.

Earlier exploration considered Instrument Sans/Geist; **do not silently substitute those** when reproducing the selected board. A font change should be evaluated as a separate identity decision.

### Hierarchy

- Strong, compact page headings.
- Readable medium-weight card titles.
- Small, muted metadata and field provenance labels.
- Large, clear financial values with aligned digits.
- Avoid decorative all-caps except sparse editorial labels.

## 6. Graphic language

- Swiss-modernist grid discipline and consistent alignment.
- Thin borders, generous whitespace, restrained corner radii.
- Subtle, functional blue-tinted selection states.
- Flat vector marks; no gradients, glassmorphism, glossy 3D or stock property imagery in the identity itself.
- Photography, when used for listings, should remain factual and secondary to analysis.
- No rooflines, keys, generic house pictograms, sparkles, or upward-trending arrows in the logo.

## 7. Brand in the product

The product interface is the most important expression of the brand. The selected reference uses:

- An understated left navigation with compact Dealframe logo.
- A warm, light background with white or near-white panels.
- Thin gray dividers and softly rounded cards.
- Clear numeric hierarchy and blue provenance tags.
- A right-side investment summary with minimal visual noise.
- Restrained premium styling rather than decorative dashboard graphics.

Avoid making the logo unusually prominent inside the app: the analysis should command attention.

## 8. Recraft → Figma production workflow

1. **Use the selected original board as the image reference** in Recraft, not the later grid reinterpretation.
2. Request **small, controlled variations** on the overlapping frames: stroke weight, frame offset, intersection proportion and wordmark kerning.
3. Generate **one concept per output** to evaluate geometry accurately.
4. Keep the original palette and lowercase name constant during symbol refinement.
5. Export a vector-capable result, then reconstruct or clean it in Figma/Illustrator as necessary.
6. Test at 16/24/32 px, on light/dark backgrounds, and inside a real sidebar.
7. Approve a canonical SVG and export variants; don't treat a raster AI rendering as a finished logo asset.

### Recraft prompt

> Refine the supplied Dealframe reference logo with exceptionally high fidelity. Preserve its fundamental symbol: two offset, overlapping dark square frames, one lower-left and one upper-right, with a muted cobalt square at their intersection. Preserve the bold lowercase `dealframe` wordmark, horizontal alignment, near-black `#17191C`, warm off-white `#FAFAF8`, and muted cobalt `#526DAB`. Make only subtle professional improvements to optical balance, frame stroke consistency, negative space, square overlap, letter spacing and symbol-to-wordmark proportion. Flat, crisp, Swiss-modernist vector identity; no rounded black icon container, no four-quadrant grid, no corner-bracket replacement, no houses, no gradients, no mockups. Present one clean horizontal lockup on a plain background.

## 9. Deliverables and open decisions

**Expected assets:** `dealframe-logo-horizontal.svg`, `dealframe-symbol.svg`, reverse/monochrome SVGs, favicon exports, app icon, clear-space rules, light/dark usage examples, and UI token mapping.

**Still to finalise:** Exact vector geometry, custom wordmark treatment, icon-size adjustments, complete accessible UI palette, and commercial name clearance. **Dealframe is a working name; no trademark or domain clearance is implied by this guide.**
