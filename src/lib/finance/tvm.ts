export type PaymentTiming = 'end' | 'begin';
export type TVMTarget = 'PV' | 'FV' | 'PMT' | 'N' | 'I/Y';

export interface TVMInputs {
  n?: number;
  ratePercent?: number;
  pv?: number;
  pmt?: number;
  fv?: number;
  timing?: PaymentTiming;
}

export interface TVMResult {
  solvedFor: TVMTarget;
  value: number;
  normalizedInputs: Required<Pick<TVMInputs, 'timing'>> & Omit<TVMInputs, 'timing'>;
}

const EPSILON = 1e-12;
const MAX_ITERATIONS = 160;

function requireFinite(name: string, value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`${name} is required and must be finite`);
  }
  return value;
}

function requireValidRate(ratePercent: number): number {
  if (ratePercent <= -100) {
    throw new Error('I/Y must be greater than -100%');
  }
  return ratePercent / 100;
}

function requireNonNegativePeriods(n: number): number {
  if (n < 0) throw new Error('N must be greater than or equal to 0');
  return n;
}

function futureAnnuityFactor(rate: number, n: number, timing: PaymentTiming): number {
  if (Math.abs(rate) < EPSILON) {
    return n;
  }
  const dueFactor = timing === 'begin' ? 1 + rate : 1;
  return ((Math.pow(1 + rate, n) - 1) / rate) * dueFactor;
}

function presentAnnuityFactor(rate: number, n: number, timing: PaymentTiming): number {
  if (Math.abs(rate) < EPSILON) {
    return n;
  }
  const dueFactor = timing === 'begin' ? 1 + rate : 1;
  return ((1 - Math.pow(1 + rate, -n)) / rate) * dueFactor;
}

function tvmBalance({ n, rate, pv, pmt, fv, timing }: {
  n: number;
  rate: number;
  pv: number;
  pmt: number;
  fv: number;
  timing: PaymentTiming;
}): number {
  const discountedFutureValue = fv * Math.pow(1 + rate, -n);
  return pv + pmt * presentAnnuityFactor(rate, n, timing) + discountedFutureValue;
}

function normalizePrecision(value: number, decimals = 10): number {
  if (Object.is(value, -0)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function solveFV(inputs: TVMInputs): TVMResult {
  const n = requireNonNegativePeriods(requireFinite('N', inputs.n));
  const rate = requireValidRate(requireFinite('I/Y', inputs.ratePercent));
  const pv = requireFinite('PV', inputs.pv);
  const pmt = inputs.pmt ?? 0;
  const timing = inputs.timing ?? 'end';

  const compound = Math.pow(1 + rate, n);
  const fv = -(pv * compound + pmt * futureAnnuityFactor(rate, n, timing));
  return { solvedFor: 'FV', value: normalizeCurrency(fv), normalizedInputs: { ...inputs, timing } };
}

export function solvePV(inputs: TVMInputs): TVMResult {
  const n = requireNonNegativePeriods(requireFinite('N', inputs.n));
  const rate = requireValidRate(requireFinite('I/Y', inputs.ratePercent));
  const pmt = inputs.pmt ?? 0;
  const fv = requireFinite('FV', inputs.fv);
  const timing = inputs.timing ?? 'end';

  const pv = -(pmt * presentAnnuityFactor(rate, n, timing) + fv * Math.pow(1 + rate, -n));
  return { solvedFor: 'PV', value: normalizeCurrency(pv), normalizedInputs: { ...inputs, timing } };
}

export function solvePMT(inputs: TVMInputs): TVMResult {
  const n = requireNonNegativePeriods(requireFinite('N', inputs.n));
  const rate = requireValidRate(requireFinite('I/Y', inputs.ratePercent));
  const pv = requireFinite('PV', inputs.pv);
  const fv = requireFinite('FV', inputs.fv);
  const timing = inputs.timing ?? 'end';

  if (n <= 0) throw new Error('N must be greater than 0 to solve PMT');

  const factor = presentAnnuityFactor(rate, n, timing);
  if (Math.abs(factor) < EPSILON) throw new Error('PMT cannot be solved from the supplied inputs');

  const pmt = -(pv + fv * Math.pow(1 + rate, -n)) / factor;
  return { solvedFor: 'PMT', value: normalizeCurrency(pmt), normalizedInputs: { ...inputs, timing } };
}

export function solveN(inputs: TVMInputs): TVMResult {
  const rate = requireValidRate(requireFinite('I/Y', inputs.ratePercent));
  const pv = requireFinite('PV', inputs.pv);
  const pmt = inputs.pmt ?? 0;
  const fv = requireFinite('FV', inputs.fv);
  const timing = inputs.timing ?? 'end';

  if (Math.abs(rate) < EPSILON) {
    if (Math.abs(pmt) < EPSILON) throw new Error('N cannot be solved when I/Y and PMT are both zero');
    const n = -(pv + fv) / pmt;
    if (n < 0 || !Number.isFinite(n)) throw new Error('N cannot be solved from the supplied inputs');
    return { solvedFor: 'N', value: normalizePrecision(n), normalizedInputs: { ...inputs, timing } };
  }

  let low = 0;
  let high = 1;
  const f = (n: number) => tvmBalance({ n, rate, pv, pmt, fv, timing });
  let lowValue = f(low);
  let highValue = f(high);

  while (Math.sign(lowValue) === Math.sign(highValue) && high < 1_000_000) {
    high *= 2;
    highValue = f(high);
  }

  if (Math.sign(lowValue) === Math.sign(highValue)) {
    throw new Error('N cannot be solved from the supplied inputs');
  }

  for (let i = 0; i < MAX_ITERATIONS; i += 1) {
    const mid = (low + high) / 2;
    const midValue = f(mid);
    if (Math.abs(midValue) < EPSILON || Math.abs(high - low) < 1e-10) {
      return { solvedFor: 'N', value: normalizePrecision(mid), normalizedInputs: { ...inputs, timing } };
    }
    if (Math.sign(lowValue) === Math.sign(midValue)) {
      low = mid;
      lowValue = midValue;
    } else {
      high = mid;
    }
  }

  return { solvedFor: 'N', value: normalizePrecision((low + high) / 2), normalizedInputs: { ...inputs, timing } };
}

export function solveRate(inputs: TVMInputs): TVMResult {
  const n = requireNonNegativePeriods(requireFinite('N', inputs.n));
  const pv = requireFinite('PV', inputs.pv);
  const pmt = inputs.pmt ?? 0;
  const fv = requireFinite('FV', inputs.fv);
  const timing = inputs.timing ?? 'end';

  if (n <= 0) throw new Error('N must be greater than 0 to solve I/Y');

  const f = (rate: number) => tvmBalance({ n, rate, pv, pmt, fv, timing });
  const brackets: Array<[number, number]> = [
    [-0.999999, 0],
    [0, 0.1],
    [0.1, 1],
    [1, 10],
  ];

  for (const [startLow, startHigh] of brackets) {
    let low = startLow;
    let high = startHigh;
    let lowValue = f(low);
    let highValue = f(high);

    if (Math.abs(lowValue) < EPSILON) {
      return { solvedFor: 'I/Y', value: normalizePrecision(low * 100), normalizedInputs: { ...inputs, timing } };
    }
    if (Math.abs(highValue) < EPSILON) {
      return { solvedFor: 'I/Y', value: normalizePrecision(high * 100), normalizedInputs: { ...inputs, timing } };
    }
    if (Math.sign(lowValue) === Math.sign(highValue)) continue;

    for (let i = 0; i < MAX_ITERATIONS; i += 1) {
      const mid = (low + high) / 2;
      const midValue = f(mid);
      if (Math.abs(midValue) < EPSILON || Math.abs(high - low) < 1e-12) {
        return { solvedFor: 'I/Y', value: normalizePrecision(mid * 100), normalizedInputs: { ...inputs, timing } };
      }
      if (Math.sign(lowValue) === Math.sign(midValue)) {
        low = mid;
        lowValue = midValue;
      } else {
        high = mid;
        highValue = midValue;
      }
    }

    return { solvedFor: 'I/Y', value: normalizePrecision(((low + high) / 2) * 100), normalizedInputs: { ...inputs, timing } };
  }

  throw new Error('I/Y cannot be solved from the supplied inputs');
}

export function solveTVM(inputs: TVMInputs, target: TVMTarget): TVMResult {
  switch (target) {
    case 'PV':
      return solvePV(inputs);
    case 'FV':
      return solveFV(inputs);
    case 'PMT':
      return solvePMT(inputs);
    case 'N':
      return solveN(inputs);
    case 'I/Y':
      return solveRate(inputs);
  }
}

export function normalizeCurrency(value: number): number {
  if (Object.is(value, -0)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}
