export interface AmortizationInput {
  principal: number;
  ratePercent: number;
  periods: number;
  payment: number;
  startPeriod?: number;
  endPeriod?: number;
}

export interface AmortizationRow {
  period: number;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface AmortizationSchedule {
  rows: AmortizationRow[];
  allRows: AmortizationRow[];
  input: Required<Pick<AmortizationInput, 'startPeriod' | 'endPeriod'>> & Omit<AmortizationInput, 'startPeriod' | 'endPeriod'>;
}

export interface AmortizationSummary {
  totalPayments: number;
  totalInterest: number;
  totalPrincipal: number;
  endingBalance: number;
}

function assertFinite(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
}

function roundCurrency(value: number): number {
  if (Object.is(value, -0)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateRange(startPeriod: number, endPeriod: number, periods: number): void {
  if (!Number.isInteger(startPeriod) || startPeriod < 1) {
    throw new Error('startPeriod must be an integer greater than or equal to 1');
  }
  if (!Number.isInteger(endPeriod) || endPeriod < startPeriod || endPeriod > periods) {
    throw new Error('endPeriod must be an integer between startPeriod and periods');
  }
}

export function buildAmortizationSchedule(input: AmortizationInput): AmortizationSchedule {
  assertFinite('principal', input.principal);
  assertFinite('ratePercent', input.ratePercent);
  assertFinite('payment', input.payment);

  if (!Number.isInteger(input.periods) || input.periods <= 0) {
    throw new Error('periods must be greater than 0');
  }
  if (input.principal <= 0) {
    throw new Error('principal must be greater than 0');
  }
  if (input.ratePercent <= -100) {
    throw new Error('ratePercent must be greater than -100%');
  }
  if (input.payment <= 0) {
    throw new Error('payment must be greater than 0');
  }

  const rate = input.ratePercent / 100;
  const firstInterest = roundCurrency(input.principal * rate);
  if (input.payment <= firstInterest) {
    throw new Error('Payment does not amortize the loan');
  }

  const startPeriod = input.startPeriod ?? 1;
  const endPeriod = input.endPeriod ?? input.periods;
  validateRange(startPeriod, endPeriod, input.periods);

  let balance = roundCurrency(input.principal);
  const allRows: AmortizationRow[] = [];

  for (let period = 1; period <= input.periods; period += 1) {
    const openingBalance = roundCurrency(balance);
    const interest = roundCurrency(openingBalance * rate);
    const principalPayment = roundCurrency(input.payment - interest);
    balance = roundCurrency(openingBalance - principalPayment);

    allRows.push({
      period,
      openingBalance,
      payment: roundCurrency(input.payment),
      interest,
      principal: principalPayment,
      balance,
    });
  }

  const finalBalance = allRows.at(-1)?.balance ?? input.principal;
  if (finalBalance > 0.5) {
    throw new Error('Payment does not amortize the loan within the requested periods');
  }

  return {
    rows: allRows.filter((row) => row.period >= startPeriod && row.period <= endPeriod),
    allRows,
    input: {
      principal: input.principal,
      ratePercent: input.ratePercent,
      periods: input.periods,
      payment: input.payment,
      startPeriod,
      endPeriod,
    },
  };
}

export function summarizeAmortization(rows: AmortizationRow[]): AmortizationSummary {
  const totalPayments = roundCurrency(rows.reduce((sum, row) => sum + row.payment, 0));
  const totalInterest = roundCurrency(rows.reduce((sum, row) => sum + row.interest, 0));
  const totalPrincipal = roundCurrency(rows.reduce((sum, row) => sum + row.principal, 0));
  const endingBalance = rows.at(-1)?.balance ?? 0;

  return { totalPayments, totalInterest, totalPrincipal, endingBalance };
}
