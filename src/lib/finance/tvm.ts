export type PaymentTiming = 'end' | 'begin';

export interface TVMInputs {
  n?: number;
  ratePercent?: number;
  pv?: number;
  pmt?: number;
  fv?: number;
  timing?: PaymentTiming;
}

export interface TVMResult {
  solvedFor: 'PV' | 'FV' | 'PMT';
  value: number;
  normalizedInputs: Required<Pick<TVMInputs, 'timing'>> & Omit<TVMInputs, 'timing'>;
}

const EPSILON = 1e-12;

function requireFinite(name: string, value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`${name} is required and must be finite`);
  }
  return value;
}

function annuityFactor(rate: number, n: number, timing: PaymentTiming): number {
  if (Math.abs(rate) < EPSILON) {
    return n;
  }
  const dueFactor = timing === 'begin' ? 1 + rate : 1;
  return ((Math.pow(1 + rate, n) - 1) / rate) * dueFactor;
}

export function solveFV(inputs: TVMInputs): TVMResult {
  const n = requireFinite('N', inputs.n);
  const rate = requireFinite('I/Y', inputs.ratePercent) / 100;
  const pv = requireFinite('PV', inputs.pv);
  const pmt = inputs.pmt ?? 0;
  const timing = inputs.timing ?? 'end';

  if (n < 0) throw new Error('N must be greater than or equal to 0');

  const compound = Math.pow(1 + rate, n);
  const fv = -(pv * compound + pmt * annuityFactor(rate, n, timing));
  return { solvedFor: 'FV', value: normalizeCurrency(fv), normalizedInputs: { ...inputs, timing } };
}

export function solvePV(inputs: TVMInputs): TVMResult {
  const n = requireFinite('N', inputs.n);
  const rate = requireFinite('I/Y', inputs.ratePercent) / 100;
  const pmt = inputs.pmt ?? 0;
  const fv = requireFinite('FV', inputs.fv);
  const timing = inputs.timing ?? 'end';

  if (n < 0) throw new Error('N must be greater than or equal to 0');

  const compound = Math.pow(1 + rate, n);
  const pv = -(fv + pmt * annuityFactor(rate, n, timing)) / compound;
  return { solvedFor: 'PV', value: normalizeCurrency(pv), normalizedInputs: { ...inputs, timing } };
}

export function solvePMT(inputs: TVMInputs): TVMResult {
  const n = requireFinite('N', inputs.n);
  const rate = requireFinite('I/Y', inputs.ratePercent) / 100;
  const pv = requireFinite('PV', inputs.pv);
  const fv = requireFinite('FV', inputs.fv);
  const timing = inputs.timing ?? 'end';

  if (n <= 0) throw new Error('N must be greater than 0 to solve PMT');

  let pmt: number;
  if (Math.abs(rate) < EPSILON) {
    pmt = -(pv + fv) / n;
  } else {
    const compound = Math.pow(1 + rate, n);
    pmt = -(fv + pv * compound) / annuityFactor(rate, n, timing);
  }

  return { solvedFor: 'PMT', value: normalizeCurrency(pmt), normalizedInputs: { ...inputs, timing } };
}

export function solveTVM(inputs: TVMInputs, target: 'PV' | 'FV' | 'PMT'): TVMResult {
  switch (target) {
    case 'PV':
      return solvePV(inputs);
    case 'FV':
      return solveFV(inputs);
    case 'PMT':
      return solvePMT(inputs);
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
