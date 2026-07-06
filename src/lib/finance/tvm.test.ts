import { describe, expect, it } from 'vitest';
import { solveFV, solvePMT, solvePV } from './tvm';

describe('TVM finance engine', () => {
  it('solves future value with zero payments', () => {
    const result = solveFV({ n: 10, ratePercent: 5, pv: -1000, pmt: 0 });
    expect(result.solvedFor).toBe('FV');
    expect(result.value).toBe(1628.89);
  });

  it('solves present value with zero payments', () => {
    const result = solvePV({ n: 10, ratePercent: 5, fv: 1628.89, pmt: 0 });
    expect(result.solvedFor).toBe('PV');
    expect(result.value).toBe(-1000);
  });

  it('solves end-of-period payment for a loan', () => {
    const result = solvePMT({ n: 60, ratePercent: 0.5, pv: 25000, fv: 0, timing: 'end' });
    expect(result.solvedFor).toBe('PMT');
    expect(result.value).toBe(-483.32);
  });

  it('solves beginning-of-period payment for a loan', () => {
    const result = solvePMT({ n: 60, ratePercent: 0.5, pv: 25000, fv: 0, timing: 'begin' });
    expect(result.value).toBe(-480.92);
  });

  it('handles zero interest payment calculations', () => {
    const result = solvePMT({ n: 10, ratePercent: 0, pv: 1000, fv: 0 });
    expect(result.value).toBe(-100);
  });
});
