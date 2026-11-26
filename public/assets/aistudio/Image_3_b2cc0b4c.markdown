---
name: Financial Terminal System
colors:
  surface: '#0f131e'
  surface-dim: '#0f131e'
  surface-bright: '#353945'
  surface-container-lowest: '#0a0e19'
  surface-container-low: '#171b26'
  surface-container: '#1b1f2b'
  surface-container-high: '#262a35'
  surface-container-highest: '#313441'
  on-surface: '#dfe2f2'
  on-surface-variant: '#c3c5d8'
  inverse-surface: '#dfe2f2'
  inverse-on-surface: '#2c303c'
  outline: '#8d90a2'
  outline-variant: '#434656'
  surface-tint: '#b6c4ff'
  primary: '#b6c4ff'
  on-primary: '#002780'
  primary-container: '#2962ff'
  on-primary-container: '#f7f5ff'
  inverse-primary: '#004ee8'
  secondary: '#66dabf'
  on-secondary: '#00382e'
  secondary-container: '#20a28a'
  on-secondary-container: '#003027'
  tertiary: '#ffb3b0'
  on-tertiary: '#680010'
  tertiary-container: '#da2237'
  on-tertiary-container: '#fff4f3'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#001550'
  on-primary-fixed-variant: '#003ab3'
  secondary-fixed: '#84f7db'
  secondary-fixed-dim: '#66dabf'
  on-secondary-fixed: '#00201a'
  on-secondary-fixed-variant: '#005143'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b0'
  on-tertiary-fixed: '#410007'
  on-tertiary-fixed-variant: '#92001b'
  background: '#0f131e'
  on-background: '#dfe2f2'
  surface-variant: '#313441'
  surface-base: '#131722'
  surface-card: '#1E222D'
  surface-elevated: '#2A2E39'
  surface-hover: '#363A45'
  border-subtle: '#2A2E39'
  border-strong: '#434651'
  text-primary: '#F0F3FA'
  text-secondary: '#787B86'
  text-muted: '#50535E'
  market-up: '#089981'
  market-up-subtle: rgba(8, 153, 129, 0.12)
  market-down: '#F23645'
  market-down-subtle: rgba(242, 54, 69, 0.12)
  action-blue: '#2962FF'
  action-blue-hover: '#1E53E5'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  label-numeric-lg:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
  label-numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-numeric-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  label-ticker:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.375rem
  space-md: 0.5rem
  space-lg: 0.75rem
  space-xl: 1rem
---

## Brand & Style

This design system targets professional traders, quantitative analysts, and active market participants who require microsecond-grade visual clarity and dense data organization. The emotional tone is authoritative, analytical, ultra-precise, and reliable under intense volatility. 

The aesthetic is a union of **Corporate / Modern High-Density Terminal** and **Clean Minimalist Precision**:
- Deep slate architectural planes engineered for 12+ hour daily screen exposure without retinal fatigue.
- Pure typographic utility prioritizing monospaced precision in numerical readouts, balanced by neutral system grotesques for scan-friendly labeling.
- Strict chromatic signal rules where vibrant accents are reserved almost exclusively for real-time delta feedback (bullish green, bearish red, interactive electric blue), keeping background noise to absolute zero.
- High-efficiency information density with tight horizontal and vertical padding, razor-sharp separation lines, and micro-elevation cues.

## Colors

The palette operates under strict dark-mode defaults optimized for multimonitor trading terminals:

- **Surface Hierarchy**:
  - `surface-base` (`#131722`): Canvas bedrock, outer navigation gutters, chart backdrops.
  - `surface-card` (`#1E222D`): Modular tiles, table containers, search bars, symbol sidebars.
  - `surface-elevated` (`#2A2E39`): Popovers, active dropdown menus, context toolbars.
  - `surface-hover` (`#363A45`): Hover states across data rows and interactive buttons.

- **Financial Signal Accents**:
  - `market-up` (`#089981`): Dynamic gains, positive delta pills, bullish candle bodies, and positive volume bars.
  - `market-down` (`#F23645`): Dynamic losses, negative delta pills, bearish candle bodies, and sell triggers.
  - Pair each market color with its corresponding `12%` alpha wash background when rendering pill badges and change tags for accessible legibility without harsh glare.

- **Primary Interaction**:
  - `primary_color_hex` (`#2962FF`): Primary triggers, selected tab indicators, charting crosshairs, and link accents. Never use this for financial performance indicators.

## Typography

The typographic system utilizes **Inter** for all narrative, hierarchical headings, and structural interface controls, paired with **JetBrains Mono** exclusively for tabular numeric values, timestamps, trade prices, volumes, and delta percentages.

- **Tabular Alignment**: All market quotes, bid/ask spreads, and percentage changes MUST use monospace figures (`label-numeric-*`) with `font-feature-settings: "tnum" 1` enabled to eliminate horizontal layout jitter as prices update in real-time.
- **Ticker Hierarchy**: Stock, crypto, and FX tickers (`label-ticker`) are displayed in all-caps bold Inter, followed by secondary entity descriptions styled in muted `body-sm` (`#787B86`).

## Layout & Spacing

The terminal is engineered on a **dense fluid-panel layout** capable of running full-width viewport grids across 1440px to 4K displays:

- **Desktop Framework**: Split-screen architecture featuring sticky micro-toolbars (44px), symbol watchlists (260px–320px fixed rail), central flexible chart/grid workspace, and collapsible bottom execution logs or data tables.
- **Micro-Scale Spacing**: Standard UI scale relies on 4px (`space-xs`) and 6px (`space-sm`) gaps between symbols, tags, and small inputs. Table rows adhere to a tight 32px or 36px vertical baseline to maximize rows visible above the fold.
- **Responsive Adaptations**:
  - `Desktop (>= 1280px)`: Multi-pane split screen with persistent side watchlists and live ticker tape.
  - `Tablet (768px - 1279px)`: Collapsible drawer for secondary metrics and ticker lists; charts retain primary focus.
  - `Mobile (< 768px)`: Single-column stacked tabs, converting multi-column matrix tables into horizontally swipeable cards or simplified single-value listings.

## Elevation & Depth

Visual hierarchy uses crisp **flat tonal layering** and **low-contrast micro-outlines** rather than soft ambient blur shadows, ensuring instantaneous cognitive parsing:

- **Level 0 (Bedrock)**: `#131722` - Outer terminal canvas and chart rendering surface.
- **Level 1 (Card & Module)**: `#1E222D` with a crisp 1px solid border of `#2A2E39`. Used for table bodies, market overview modules, and search inputs.
- **Level 2 (Popovers & Flyouts)**: `#2A2E39` with a 1px border of `#434651` and an intentional directional drop-shadow: `0 4px 16px rgba(0, 0, 0, 0.45)`. Reserved strictly for active context menus, indicator pickers, and modal alerts.
- **Dividers**: Always 1px solid `#2A2E39`. Avoid gradient separators or blur effects that interfere with technical chart gridlines.

## Shapes

The interface embraces a **Soft / Architectural Sharpness** (`roundedness: 1`):
- Standard inputs, buttons, table cell selections, and container panels use `0.25rem` (4px) radii. This compact radius maximizes usable screen real estate and matches the precision of trading charting software.
- Ticker badges, status dots, and market mover percentage tags use pill styling (`rounded-full`) to contrast against rectangular data modules and create quick visual anchor points.

## Components

- **Buttons**:
  - *Primary*: Background `#2962FF`, text `#FFFFFF`, height 32px (compact) or 38px (regular), padding `0 14px`, 4px border radius. Hover: `#1E53E5`.
  - *Ghost / Tool*: Transparent background, `#787B86` icon/text, hover background `#2A2E39`, hover text `#F0F3FA`.
  - *Buy / Long*: Solid `#089981`, white text, 36px height.
  - *Sell / Short*: Solid `#F23645`, white text, 36px height.

- **Market Mover Badges & Pills**:
  - *Bullish*: Text `#089981`, background `rgba(8, 153, 129, 0.12)`, font `label-numeric-sm`, inline padding 6px horizontal, 2px vertical, full pill radius (`9999px`). Includes a leading `+` sign and optional upward micro chevron (`▲`).
  - *Bearish*: Text `#F23645`, background `rgba(242, 54, 69, 0.12)`, font `label-numeric-sm`, inline padding 6px horizontal, 2px vertical, full pill radius (`9999px`). Includes a leading `-` sign and optional downward micro chevron (`▼`).

- **Symbol Cards & Watchlists**:
  - 1px border `#2A2E39`, `#1E222D` background.
  - Symbol row features round 24px ticker avatar/icon on the left, ticker name in bold 13px Inter, sparkline mini-chart centered, followed by right-aligned monospace last price and pill badge.

- **Data Tables**:
  - Headers: Sticky, 28px height, `#131722` background, uppercase `11px` Inter font with letter-spacing `0.04em`, color `#787B86`, bottom border 1px solid `#2A2E39`.
  - Rows: Height 36px, alternating hover state `#2A2E39`, border-bottom 1px solid `#1E222D`. Numeric cells right-aligned in `JetBrains Mono`.

- **Search & Filter Inputs**:
  - Background `#1E222D`, border 1px solid `#2A2E39`, height 34px, 4px radius. Focus state: border `#2962FF` with zero offset glow. Integrated keyboard shortcuts (e.g., `Ctrl+K`) styled in muted monospace badges (`#2A2E39` fill, `#787B86` text).

- **Ticker Badges & Chips**:
  - Rounded 4px or pill, `#2A2E39` neutral outline, active tab indicated with a solid `#2962FF` bottom highlight bar (2px) or solid white badge state with `#131722` text.