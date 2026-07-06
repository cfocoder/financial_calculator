import { describe, expect, it } from 'vitest';
import { computeNPV, computeIRR, parseCashflows } from './cashflow';

describe('computeNPV', () => {
  it('matches hand-calculated NPV for a known series', () => {
    const cashflows = [-1000, 300, 400, 500, 600];
    const npv = computeNPV(10, cashflows);
    expect(npv).toBeCloseTo(388.77, 1);
  });

  it('returns the sum of cash flows when rate is zero', () => {
    const cashflows = [-1000, 300, 400, 500];
    const npv = computeNPV(0, cashflows);
    expect(npv).toBe(200);
  });

  it('handles negative discount rate', () => {
    const cashflows = [-100, 50, 50, 50];
    const npv = computeNPV(-5, cashflows);
    const expected = -100 + 50 / 0.95 + 50 / 0.95 ** 2 + 50 / 0.95 ** 3;
    expect(npv).toBeCloseTo(expected, 10);
  });

  it('throws for fewer than 2 cash flows', () => {
    expect(() => computeNPV(10, [100])).toThrow('At least 2 cash flows');
    expect(() => computeNPV(10, [])).toThrow('At least 2 cash flows');
  });

  it('throws for non-finite values', () => {
    expect(() => computeNPV(10, [NaN, 100])).toThrow('must be finite');
    expect(() => computeNPV(10, [Infinity, 100])).toThrow('must be finite');
  });

  it('handles all positive cash flows', () => {
    const cashflows = [0, 100, 200, 300];
    const npv = computeNPV(10, cashflows);
    const expected = 0 + 100 / 1.1 + 200 / 1.1 ** 2 + 300 / 1.1 ** 3;
    expect(npv).toBeCloseTo(expected, 10);
  });
});

describe('computeIRR', () => {
  it('returns approximately correct rate for a standard investment', () => {
    const cashflows = [-1000, 300, 400, 500, 600];
    const irr = computeIRR(cashflows);
    const npv = computeNPV(irr, cashflows);
    expect(npv).toBeCloseTo(0, 4);
  });

  it('returns zero when all future cash flows sum to initial investment', () => {
    const cashflows = [-1000, 500, 500];
    const irr = computeIRR(cashflows, 0);
    expect(irr).toBeCloseTo(0, 4);
  });

  it('returns negative rate for a poor investment', () => {
    const cashflows = [-100, 10, 10, 10];
    const irr = computeIRR(cashflows, 0);
    const npv = computeNPV(irr, cashflows);
    expect(npv).toBeCloseTo(0, 4);
    expect(irr).toBeLessThan(0);
  });

  it('throws for fewer than 2 cash flows', () => {
    expect(() => computeIRR([100])).toThrow('At least 2 cash flows');
  });

  it('throws for non-finite values', () => {
    expect(() => computeIRR([NaN, 100])).toThrow('must be finite');
  });
});

describe('parseCashflows', () => {
  it('parses comma-separated values', () => {
    expect(parseCashflows('-1000,200,300,400')).toEqual([-1000, 200, 300, 400]);
  });

  it('parses newline-separated values', () => {
    expect(parseCashflows('-1000\n200\n300')).toEqual([-1000, 200, 300]);
  });

  it('parses mixed separators', () => {
    expect(parseCashflows('-1000, 200\n300 400')).toEqual([-1000, 200, 300, 400]);
  });

  it('returns empty array for empty input', () => {
    expect(parseCashflows('')).toEqual([]);
  });

  it('throws for invalid numbers', () => {
    expect(() => parseCashflows('-1000,abc')).toThrow('Invalid cash flow');
  });
});
