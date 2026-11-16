# Dealframe — App Feel & Flow

**Status:** Product experience direction · November 2026  
**Audience:** Product designers, frontend engineers and anyone implementing the Dealframe experience.  
**Visual reference:** The selected Dealframe dashboard board; **interaction reference:** PropertyDealCheck's `/analyse` experience, used for inspiration rather than replication.

## 1. Product experience thesis

**Turn a listing into an informed investment decision with as little manual work as possible.**

The product should feel like a modern, premium, reliable investment workspace—not a spreadsheet disguised as a website and not a chatbot with financial figures attached.

The experience is:

- **Fast to start:** A listing URL is the primary entry point.
- **Easy to verify:** Imported facts, estimates and assumptions are visibly different.
- **Calm to operate:** No giant forms or overwhelming dashboards.
- **Powerful when needed:** Advanced financing and sensitivity controls appear progressively.
- **Trustworthy:** Calculations are transparent, caveats are accessible and results update predictably.
- **Expandable:** Analysis is the starting point of a broader property investment workflow.

## 2. Product scope

### Current / near-term core

1. Paste a Rightmove property URL.
2. Import available listing information.
3. Review and correct the imported details.
4. Enter assumptions, including **estimated end value** and **refurbishment costs** (currently supplied by the user).
5. Evaluate investment outcomes across relevant strategies such as buy-to-let, flip and BRRR.
6. Save, revisit and compare deals as these capabilities are built.

**Important:** Do not represent automated end-value or refurbishment estimates as existing functionality. They are possible future enhancements.

### Longer-term vision

A continuous workspace across **Analyse → Acquire → Renovate → Refinance → Grow**, including deal tracking and portfolio intelligence. These are strategic directions, not commitments that every feature already exists.

## 3. Navigation architecture

Suggested desktop navigation, aligned with the selected dashboard reference:

- **Analyse:** Start a new analysis; primary entry point.
- **Deals:** Saved and in-progress opportunities.
- **Portfolio:** Owned assets and performance (future/when supported).
- **Projects:** Renovation and acquisition workstreams (future/when supported).
- **More / Settings:** Preferences, account, billing, help.

Use a left sidebar with the small horizontal Dealframe lockup, restrained icons, and a soft cobalt-tinted active state. Avoid exposing empty future sections as if they were complete; label upcoming capabilities or hide them until useful.

## 4. Primary user journey

```text
Open Dealframe
   ↓
Paste Rightmove listing URL
   ↓
Importing: clear, short progress feedback
   ↓
Property overview + imported facts
   ↓
Review missing/uncertain values
   ↓
Choose investment strategy
   ↓
Set essential assumptions
   ↓
Live investment summary and breakdown
   ↓
Inspect sensitivities / advanced inputs
   ↓
Save, compare, export or return later (as supported)
```

### Step A — Empty state: “Analyse a property”

**Primary heading:** Analyse a property  
**Support copy:** Turn a property listing into an investment analysis.

- One prominent URL field, clearly labelled for Rightmove.
- Primary action: **Import property**.
- Optional secondary action: **Enter details manually** if manual mode exists.
- Explain what happens next in one sentence, not a multi-step tutorial.
- Show recent analyses only when the user has them.

**UX principle:** The empty state should make the next action obvious within two seconds.

### Step B — Importing

- Disable duplicate submissions and show meaningful progress stages where available: **Fetching listing → Reading details → Preparing analysis**.
- Don't fabricate precise percentages or claim extraction success prematurely.
- On partial success, retain available values and clearly flag missing ones.
- On failure, explain the issue and offer retry/manual entry; never silently discard input.
- Do not imply universal support for every property website if only Rightmove is implemented.

### Step C — Review property facts

Show an immediately recognisable property header:

- Address/title, property type, bedrooms, location and source link.
- Listing price and any other reliably extracted fields.
- Small property photo only when available and permitted.
- Source provenance and last imported time where available.

**Provenance labels:**

| Label | Meaning | UI treatment |
|---|---|---|
| **Imported** | Taken from the source listing | Neutral/soft-blue label, source accessible |
| **Estimated** | Derived or modelled value | Label plus method/explanation |
| **Your assumption** | Supplied or overridden by user | Clearly editable, user-owned value |
| **Missing** | Not available yet | Visible prompt to provide it |

Don't imply a value was independently verified merely because it was imported.

### Step D — Investment assumptions

Keep the default panel concise. Prioritise:

- Purchase price.
- Estimated monthly rent (when relevant).
- Refurbishment budget.
- Estimated end value / GDV (when relevant).
- Investment strategy selector: **Buy-to-let / Flip / BRRR**.

Use a collapsible **Advanced assumptions** area for:

- Deposit or LTV, finance type, interest rate and term.
- Purchase costs, stamp duty assumptions and legal/other fees.
- Ongoing costs, voids, management, maintenance and insurance.
- Sale/refinance costs and other strategy-specific inputs.

Avoid showing irrelevant fields for the selected strategy. Explain defaults and allow overrides. Make clear whether values are annual, monthly, percentages or absolute pounds.

### Step E — Results and decision support

On desktop, keep an **investment summary on the right** while assumptions are edited on the left. Results should update quickly and predictably, with visible recalculation states if necessary.

Useful metrics vary by strategy:

- **Buy-to-let:** Monthly cash flow, gross/net yield, cash invested, cash-on-cash return.
- **Flip:** Total project cost, expected sale proceeds, projected profit, ROI and margin.
- **BRRR:** Total cash invested, refinance proceeds, capital left in deal, post-refinance cash flow and relevant return metrics.

Include breakdowns and calculation explanations. Do not show a blanket **“Strong deal”** score unless the scoring rubric is explicit, user-adjustable where appropriate, and accompanied by assumptions/risks. The reference board's “Strong” label is illustrative, not a validated decision model.

### Step F — Save and revisit

When implemented:

- Save the deal with its source URL, imported snapshot, assumptions and calculation version.
- Distinguish saved analyses from live listing data; changes to the listing should not silently rewrite the user's historical decision.
- Make edits reversible or recoverable where feasible.
- Allow comparison between deals using consistent assumptions and metrics.

## 5. Page layout and information hierarchy

### Desktop (primary reference)

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Sidebar │ Breadcrumb / source                Save / Share          │
│         ├───────────────────────────────────────────────────────────┤
│ Analyse │ Property title + short metadata                            │
│ Deals   │ Tabs: Analysis · Details · Notes                           │
│ Portfolio├───────────────────────────────────────────────────────────┤
│ Projects│ Key figures / provenance chips                            │
│         ├───────────────────────────────┬───────────────────────────┤
│         │ Investment assumptions        │ Investment summary        │
│         │ Strategy + essential fields   │ Headline metrics          │
│         │ Advanced accordion            │ Cost / return breakdown   │
│         │                               │ Risks / sensitivity       │
└─────────┴───────────────────────────────┴───────────────────────────┘
```

- Sidebar remains visually quiet.
- Property context appears above the working area.
- Key figures can be compact cards, but avoid card proliferation.
- Inputs and outcomes must remain visibly related.
- Use whitespace and borders to organise; avoid heavy shadows.

### Tablet and mobile

- Collapse the sidebar to a menu or compact navigation.
- Stack property details, assumptions and results in a clear sequence.
- Provide a sticky **View results** action or summary affordance where helpful.
- Keep all fields keyboard-accessible and labels visible.
- Do not depend on hover for explanations or provenance.

## 6. UI styling and implementation

**Foundation:** shadcn/ui components and a consistent design-token system.

### Appearance

- Light-first interface, warm off-white canvas `#FAFAF8`.
- Ink text `#17191C`, muted secondary text and fine borders.
- Cobalt `#526DAB` reserved for selections, links, provenance emphasis and key actions.
- White/near-white cards, moderate radii, minimal shadows.
- Inter-like typography consistent with the chosen brand board.
- Large, aligned financial values with tabular numerals.

### Component behaviour

- **Inputs:** Right-aligned numeric entry where useful; visible units and sensible validation.
- **Selects:** Plain-language strategy choices; avoid unexplained abbreviations.
- **Accordions:** Advanced assumptions hidden by default, but discoverable.
- **Tabs:** Analysis, Details and Notes only where each has meaningful content.
- **Tooltips:** Explain metrics and assumptions, never conceal essential warnings.
- **Status:** Distinguish loading, imported, missing, estimated, overridden and stale.
- **Actions:** Clear primary/secondary hierarchy; don't make every control cobalt.

### Motion

Subtle transitions only: ~120–200 ms for hover, disclosure and small state changes. Avoid decorative animations, distracting count-ups or prolonged skeleton states. Respect reduced-motion preferences.

## 7. Trust, accuracy and transparency

This is financial decision-support software. Trust is a feature.

- Show **calculation definitions** and units for each metric.
- Make assumptions and fees inspectable.
- Treat estimated rent, GDV and refurbishment budgets as uncertain.
- Surface data freshness and listing provenance when known.
- Do not auto-overwrite user edits when refreshing listing data.
- Highlight when a result depends on missing or defaulted assumptions.
- Include a clear, appropriately positioned statement that projections are estimates, not financial advice or guaranteed returns.
- Design for accessible contrast, keyboard navigation, screen-reader labels and clear error messaging.

## 8. What to borrow from the UI inspiration

From the user-supplied **PropertyDealCheck `/analyse`** reference, the relevant interaction ideas are:

- Listing-first import.
- Review/edit property facts after import.
- Separate essential and advanced financial inputs.
- Straightforward analysis summaries.
- A focused path from input to results.

**Do not clone:** its exact visual layout, copy, iconography or brand. Dealframe should feel calmer, more typographically precise, and more premium. The selected Dealframe dashboard board is the stronger **visual** reference; PropertyDealCheck is primarily a **flow** reference.

## 9. Example microcopy

| Moment | Suggested copy |
|---|---|
| Empty state | **Analyse a property** — Turn a listing into an investment analysis. |
| URL field | Paste a Rightmove property URL |
| Import action | Import property |
| Partial import | We imported the details we could find. Review the missing fields below. |
| Missing GDV | Add your estimated end value to calculate the projected outcome. |
| Source label | Imported from listing |
| User override | Your assumption |
| Estimate | Estimated — review before relying on this figure |
| Results | Investment summary |
| Advanced panel | Advanced assumptions |
| Save | Save deal |

## 10. Success criteria

Evaluate the experience with real property investors:

- Time from pasted URL to first meaningful result.
- Percentage of imports requiring manual correction.
- Percentage of users who understand where each key number came from.
- Completion rate for a first analysis.
- Ability to explain how a return metric was calculated.
- Return usage: revisiting, refining and comparing deals.

**North-star UX principle:** Users should spend their time deciding whether an investment makes sense—not copying data between tabs and spreadsheets.

## 11. Design and engineering guardrails

**Do:** preserve the chosen brand board's restrained look; use source labels; support quick editing; keep results close to assumptions; reveal complexity only when useful.

**Don't:** replace the logo with a generic grid; clutter the screen with every metric; imply automation where none exists; invent precision; hide key assumptions; conflate future features with current capabilities.

### Recommended first implementation slice

1. Listing URL entry + loading/error states.
2. Imported property review with provenance.
3. Strategy selector + essential assumptions.
4. Live right-hand investment summary with calculation explanations.
5. Advanced inputs and validation.
6. Save/revisit, then comparison and portfolio extensions as the product matures.

This document defines the intended **feel and flow**, not a claim that every described feature has already shipped.
