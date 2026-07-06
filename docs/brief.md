# LedgerCalc — MVP Brief

## Product idea

LedgerCalc is a web-based financial calculator inspired by classic business calculators such as the HP 17BII+, but with an original visual identity and modern web UX.

The app should feel like a serious pocket financial calculator: tactile, fast, compact, and trustworthy. It should not copy HP branding, logos, exact industrial design, or protected layouts.

## MVP objective

Build a local-first financial calculator web app with:

1. A calculator-like interface.
2. A TVM worksheet for time value of money calculations.
3. A small, tested finance engine.
4. A clean Git baseline suitable for future work with Aider, Dyad, Agor, and OpenDesign.

## MVP scope

### In scope

- React + TypeScript web app.
- Classic calculator-inspired UI.
- TVM worksheet with fields:
  - N: number of periods
  - I/Y: periodic interest rate percentage
  - PV: present value
  - PMT: payment per period
  - FV: future value
  - Payment timing: end / beginning
- Solve missing values for:
  - PV
  - FV
  - PMT
- Basic calculator keypad for numeric entry.
- Unit tests for financial formulas.
- Documentation of formulas and assumptions.

### Out of scope for v1

- Exact HP 17BII+ cloning.
- HP branding or trademark use.
- RPN mode.
- NPV / IRR worksheet.
- Amortization schedule.
- Backend, accounts, sync, database, payments.
- Mobile native app.

## Design direction

Visual style:

- Premium calculator/workbench aesthetic.
- Dark graphite body.
- Soft LCD-like display area.
- Warm amber or green accent for active values.
- Rounded but tactile keys.
- Clear typography, monospaced values.
- Original layout inspired by financial calculators, not copied from any specific model.

UX principles:

- All fields visible in the TVM worksheet.
- Result feedback should explain which value was solved.
- Invalid states should be explicit.
- Keyboard and mouse input should both feel natural.

## Financial assumptions

- Rates are entered as percentages per period, not annualized, for v1 simplicity.
- Cashflow sign convention:
  - Money received is positive.
  - Money paid is negative.
- Payment timing:
  - `end` means payments occur at the end of each period.
  - `begin` means payments occur at the beginning of each period.

## Acceptance criteria

- `npm test` passes.
- `npm run build` passes.
- The app can solve PV, FV, and PMT from valid input.
- Finance formulas live in `src/lib/finance` and are unit-tested.
- UI clearly shows inputs, solved output, and assumptions.
- No secrets, API keys, auth, backend, or third-party service dependency is required.

## Future v1.1 candidates

- NPV / IRR worksheet.
- Amortization schedule.
- Export calculation as Markdown/CSV.
- PWA installability.
- History of calculations in local storage.
- Optional RPN-style input mode.
