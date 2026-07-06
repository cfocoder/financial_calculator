import { describe, expect, it } from 'vitest';
import { solveFV, solvePMT, solvePV, solveN, solveRate, solveTVM } from './tvm';

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

  it('solves number of periods for a single future value target', () => {
    const exactFutureValue = 1000 * Math.pow(1.05, 10);
    const result = solveN({ ratePercent: 5, pv: -1000, pmt: 0, fv: exactFutureValue });
    expect(result.solvedFor).toBe('N');
    expect(result.value).toBeCloseTo(10, 4);
  });

  it('solves periodic interest rate as a percent', () => {
    const result = solveRate({ n: 10, pv: -1000, pmt: 0, fv: 1628.89 });
    expect(result.solvedFor).toBe('I/Y');
    expect(result.value).toBeCloseTo(5, 4);
  });

  it('routes N and I/Y through the generic solver', () => {
    const exactFutureValue = 1000 * Math.pow(1.05, 10);
    expect(solveTVM({ ratePercent: 5, pv: -1000, pmt: 0, fv: exactFutureValue }, 'N').value).toBeCloseTo(10, 4);
    expect(solveTVM({ n: 10, pv: -1000, pmt: 0, fv: 1628.89 }, 'I/Y').value).toBeCloseTo(5, 4);
  });

  it('rejects rates at or below -100 percent', () => {
    expect(() => solveFV({ n: 10, ratePercent: -100, pv: -1000 })).toThrow('I/Y must be greater than -100%');
    expect(() => solvePMT({ n: 10, ratePercent: -101, pv: 1000, fv: 0 })).toThrow('I/Y must be greater than -100%');
  });

});
