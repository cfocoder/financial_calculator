# LedgerCalc

LedgerCalc is a modern web financial calculator inspired by classic business calculators, with an original visual identity and no HP branding or cloned industrial design.

## MVP

- React + TypeScript + Vite.
- Calculator-inspired UI.
- TVM worksheet for `PV`, `FV`, and `PMT`.
- Tested finance engine in `src/lib/finance`.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

## Current financial assumptions

- Rates are entered as percentages per period.
- Money received is positive; money paid is negative.
- Payment timing supports end-of-period and beginning-of-period payments.

## Project workflow

This repo is the test bed for the Hermes + OpenDesign + Dyad + Aider + Agor workflow. See `docs/brief.md` for scope and acceptance criteria.
