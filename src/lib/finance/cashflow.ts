const EPSILON = 1e-10;
const MAX_ITERATIONS = 1000;

function requireMinimumCashflows(cashflows: number[]): void {
  if (!Array.isArray(cashflows) || cashflows.length < 2) {
    throw new Error('At least 2 cash flows are required');
  }
  if (!cashflows.every((cf) => Number.isFinite(cf))) {
    throw new Error('All cash flows must be finite numbers');
  }
}

export function computeNPV(ratePercent: number, cashflows: number[]): number {
  requireMinimumCashflows(cashflows);
  const rate = ratePercent / 100;
  let npv = 0;
  for (let t = 0; t < cashflows.length; t++) {
    npv += cashflows[t] / Math.pow(1 + rate, t);
  }
  return npv;
}

export function computeIRR(cashflows: number[], guess = 0.1): number {
  requireMinimumCashflows(cashflows);

  let rate = guess;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashflows[t] / denom;
      if (t > 0) {
        dnpv -= t * cashflows[t] / (denom * (1 + rate));
      }
    }

    if (Math.abs(npv) < EPSILON) {
      return rate * 100;
    }

    const newRate = rate - npv / dnpv;

    if (Math.abs(newRate - rate) < EPSILON) {
      return newRate * 100;
    }

    rate = newRate;

    if (rate <= -0.999999) {
      rate = -0.999999;
    }
  }

  throw new Error('IRR did not converge');
}

export function parseCashflows(input: string): number[] {
  return input
    .split(/[,\n\r\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      const n = Number(s);
      if (!Number.isFinite(n)) {
        throw new Error(`Invalid cash flow value: "${s}"`);
      }
      return n;
    });
}
