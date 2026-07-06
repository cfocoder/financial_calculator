import { describe, expect, it } from 'vitest';
import { buildAmortizationSchedule, summarizeAmortization } from './amortization';

describe('amortization schedule engine', () => {
  it('calculates the first row split for a standard loan', () => {
    const schedule = buildAmortizationSchedule({
      principal: 25000,
      ratePercent: 0.5,
      periods: 60,
      payment: 483.32,
    });

    expect(schedule.rows[0]).toMatchObject({
      period: 1,
      payment: 483.32,
      interest: 125,
      principal: 358.32,
      balance: 24641.68,
    });
  });

  it('finishes approximately at zero for a fully amortizing loan', () => {
    const schedule = buildAmortizationSchedule({
      principal: 25000,
      ratePercent: 0.5,
      periods: 60,
      payment: 483.32,
    });

    const last = schedule.rows.at(-1);
    expect(last?.period).toBe(60);
    expect(Math.abs(last?.balance ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(0.5);
  });

  it('supports a partial period range while preserving opening balance', () => {
    const schedule = buildAmortizationSchedule({
      principal: 25000,
      ratePercent: 0.5,
      periods: 60,
      payment: 483.32,
      startPeriod: 2,
      endPeriod: 3,
    });

    expect(schedule.rows.map((row) => row.period)).toEqual([2, 3]);
    expect(schedule.rows[0].openingBalance).toBe(24641.68);
    expect(schedule.rows[0].interest).toBe(123.21);
  });

  it('summarizes total payment, interest, and principal', () => {
    const schedule = buildAmortizationSchedule({
      principal: 25000,
      ratePercent: 0.5,
      periods: 60,
      payment: 483.32,
    });
    const summary = summarizeAmortization(schedule.rows);

    expect(summary.totalPayments).toBeCloseTo(28999.2, 2);
    expect(summary.totalInterest).toBeCloseTo(3999.2, 1);
    expect(summary.totalPrincipal).toBeCloseTo(25000, 1);
  });

  it('rejects invalid or non-amortizing inputs', () => {
    expect(() => buildAmortizationSchedule({ principal: 25000, ratePercent: 0.5, periods: 0, payment: 483.32 })).toThrow('periods must be greater than 0');
    expect(() => buildAmortizationSchedule({ principal: 25000, ratePercent: 0.5, periods: 60, payment: 100 })).toThrow('Payment does not amortize the loan');
    expect(() => buildAmortizationSchedule({ principal: Number.NaN, ratePercent: 0.5, periods: 60, payment: 483.32 })).toThrow('principal must be finite');
  });
});
