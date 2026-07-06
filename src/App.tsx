import { useMemo, useState } from 'react';
import { buildAmortizationSchedule, summarizeAmortization } from './lib/finance/amortization';
import { formatMoney, solveTVM, type PaymentTiming } from './lib/finance/tvm';
import { computeNPV, computeIRR, parseCashflows } from './lib/finance/cashflow';

type Target = 'PV' | 'FV' | 'PMT';
type Field = 'n' | 'ratePercent' | 'pv' | 'pmt' | 'fv';

type FormState = Record<Field, string> & { timing: PaymentTiming };

const initialForm: FormState = {
  n: '60',
  ratePercent: '0.5',
  pv: '25000',
  pmt: '',
  fv: '0',
  timing: 'end',
};

function parseOptional(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseInput(value: string, fallback: number): number {
  if (value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [target, setTarget] = useState<Target>('PMT');
  const [result, setResult] = useState<string>('Ready');
  const [display, setDisplay] = useState<string>('25000');
  const [error, setError] = useState<string>('');
  const [cfInput, setCfInput] = useState<string>('-1000, 300, 400, 500, 600');
  const [cfRate, setCfRate] = useState<string>('10');
  const [cfNpv, setCfNpv] = useState<string>('');
  const [cfIrr, setCfIrr] = useState<string>('');
  const [cfError, setCfError] = useState<string>('');

  const amortization = useMemo(() => {
    try {
      const payment = parseInput(form.pmt, 483.32);
      const schedule = buildAmortizationSchedule({
        principal: Math.abs(parseInput(form.pv, 25000)),
        ratePercent: parseInput(form.ratePercent, 0.5),
        periods: Math.max(1, Math.trunc(parseInput(form.n, 60))),
        payment: Math.abs(payment),
        startPeriod: 1,
        endPeriod: Math.min(12, Math.max(1, Math.trunc(parseInput(form.n, 60)))),
      });
      return {
        schedule,
        summary: summarizeAmortization(schedule.allRows),
        error: '',
      };
    } catch (problem) {
      return {
        schedule: null,
        summary: null,
        error: problem instanceof Error ? problem.message : 'Unable to build amortization schedule',
      };
    }
  }, [form]);

  const solvedPreview = useMemo(() => {
    try {
      const answer = solveTVM(
        {
          n: parseOptional(form.n),
          ratePercent: parseOptional(form.ratePercent),
          pv: parseOptional(form.pv),
          pmt: parseOptional(form.pmt),
          fv: parseOptional(form.fv),
          timing: form.timing,
        },
        target,
      );
      return `${answer.solvedFor} = ${formatMoney(answer.value)}`;
    } catch {
      return 'Complete the worksheet to solve';
    }
  }, [form, target]);

  function updateField(field: Field, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setDisplay(value || '0');
    setError('');
  }

  function solve() {
    try {
      const answer = solveTVM(
        {
          n: parseOptional(form.n),
          ratePercent: parseOptional(form.ratePercent),
          pv: parseOptional(form.pv),
          pmt: parseOptional(form.pmt),
          fv: parseOptional(form.fv),
          timing: form.timing,
        },
        target,
      );
      setForm((current) => ({ ...current, [target.toLowerCase() as Field]: String(answer.value) }));
      setDisplay(String(answer.value));
      setResult(`${answer.solvedFor} solved: ${formatMoney(answer.value)}`);
      setError('');
    } catch (problem) {
      const message = problem instanceof Error ? problem.message : 'Unable to solve';
      setError(message);
      setResult('Check inputs');
    }
  }

  function computeCashflows() {
    try {
      const cashflows = parseCashflows(cfInput);
      const rate = parseInput(cfRate, 10);
      const npv = computeNPV(rate, cashflows);
      let irrMsg: string;
      try {
        const irr = computeIRR(cashflows);
        irrMsg = `${irr.toFixed(4)}%`;
      } catch {
        irrMsg = 'N/A';
      }
      setCfNpv(formatMoney(npv));
      setCfIrr(irrMsg);
      setCfError('');
    } catch (problem) {
      const message = problem instanceof Error ? problem.message : 'Unable to compute';
      setCfError(message);
      setCfNpv('');
      setCfIrr('');
    }
  }

  function clear() {
    setForm({ ...initialForm, pmt: '' });
    setTarget('PMT');
    setDisplay('0');
    setResult('Cleared');
    setError('');
  }

  const keyLabels = ['N', 'I/Y', 'PV', 'PMT', 'FV', 'CPT', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '+/-', '+'];

  return (
    <main className="app-shell">
      <section className="hero-panel" aria-labelledby="app-title">
        <p className="eyebrow">Financial calculator · MVP</p>
        <h1 id="app-title">LedgerCalc</h1>
        <p className="subtitle">
          A modern, original financial calculator inspired by classic business calculators — focused first on time value of money workflows.
        </p>
      </section>

      <section className="calculator-card" aria-label="LedgerCalc calculator">
        <div className="calculator-body">
          <div className="screen" aria-live="polite">
            <div className="screen-topline">TVM WORKSHEET · {form.timing.toUpperCase()} MODE</div>
            <div className="screen-value">{display}</div>
            <div className="screen-status">{error || result}</div>
          </div>

          <div className="workbench">
            <form className="worksheet" onSubmit={(event) => { event.preventDefault(); solve(); }}>
              <div className="worksheet-header">
                <h2>TVM Worksheet</h2>
                <span>{solvedPreview}</span>
              </div>

              <label>
                <span>N</span>
                <input value={form.n} onChange={(event) => updateField('n', event.target.value)} inputMode="decimal" />
              </label>
              <label>
                <span>I/Y % per period</span>
                <input value={form.ratePercent} onChange={(event) => updateField('ratePercent', event.target.value)} inputMode="decimal" />
              </label>
              <label>
                <span>PV</span>
                <input value={form.pv} onChange={(event) => updateField('pv', event.target.value)} inputMode="decimal" />
              </label>
              <label>
                <span>PMT</span>
                <input value={form.pmt} onChange={(event) => updateField('pmt', event.target.value)} inputMode="decimal" placeholder="solve" />
              </label>
              <label>
                <span>FV</span>
                <input value={form.fv} onChange={(event) => updateField('fv', event.target.value)} inputMode="decimal" />
              </label>

              <div className="segmented" role="group" aria-label="Payment timing">
                <button type="button" className={form.timing === 'end' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, timing: 'end' }))}>End</button>
                <button type="button" className={form.timing === 'begin' ? 'active' : ''} onClick={() => setForm((current) => ({ ...current, timing: 'begin' }))}>Begin</button>
              </div>

              <div className="solve-row">
                <select value={target} onChange={(event) => setTarget(event.target.value as Target)} aria-label="Value to solve">
                  <option value="PMT">Solve PMT</option>
                  <option value="PV">Solve PV</option>
                  <option value="FV">Solve FV</option>
                </select>
                <button className="solve-button" type="submit">CPT</button>
              </div>
            </form>

            <div className="keypad" aria-label="Calculator keypad preview">
              {keyLabels.map((label) => (
                <button key={label} type="button" className={label === 'CPT' ? 'command key-accent' : 'command'} onClick={label === 'CPT' ? solve : undefined}>
                  {label}
                </button>
              ))}
              <button type="button" className="command wide" onClick={clear}>CLR</button>
              <button type="button" className="command wide secondary">SHIFT</button>
            </div>
          </div>
        </div>
      </section>

      <section className="amortization-panel" aria-label="Amortization worksheet">
        <div className="worksheet-header">
          <div>
            <p className="eyebrow">Loan analysis</p>
            <h2>Amortization Worksheet</h2>
          </div>
          {amortization.summary ? (
            <span>Interest: {formatMoney(amortization.summary.totalInterest)}</span>
          ) : (
            <span>{amortization.error}</span>
          )}
        </div>

        {amortization.summary && amortization.schedule ? (
          <>
            <div className="summary-grid">
              <div>
                <span>Total paid</span>
                <strong>{formatMoney(amortization.summary.totalPayments)}</strong>
              </div>
              <div>
                <span>Total principal</span>
                <strong>{formatMoney(amortization.summary.totalPrincipal)}</strong>
              </div>
              <div>
                <span>Ending balance</span>
                <strong>{formatMoney(amortization.summary.endingBalance)}</strong>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <caption>First {amortization.schedule.rows.length} periods</caption>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Payment</th>
                    <th>Interest</th>
                    <th>Principal</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {amortization.schedule.rows.map((row) => (
                    <tr key={row.period}>
                      <td>{row.period}</td>
                      <td>{formatMoney(row.payment)}</td>
                      <td>{formatMoney(row.interest)}</td>
                      <td>{formatMoney(row.principal)}</td>
                      <td>{formatMoney(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="panel-error">{amortization.error}</p>
        )}
      </section>

      <section className="cashflow-panel" aria-label="Cashflow worksheet">
        <div className="worksheet-header">
          <div>
            <p className="eyebrow">Investment analysis</p>
            <h2>Cashflow Worksheet</h2>
          </div>
          <span>{cfNpv ? `NPV: ${cfNpv}` : cfError ? 'Error' : 'Enter cash flows'}</span>
        </div>

        <form className="cashflow-form" onSubmit={(event) => { event.preventDefault(); computeCashflows(); }}>
          <label>
            <span>Cash flows (comma, space, or newline separated)</span>
            <textarea
              value={cfInput}
              onChange={(event) => { setCfInput(event.target.value); setCfNpv(''); setCfIrr(''); setCfError(''); }}
              rows={4}
              placeholder="-1000, 300, 400, 500"
            />
          </label>
          <label>
            <span>Discount rate %</span>
            <input
              value={cfRate}
              onChange={(event) => { setCfRate(event.target.value); setCfNpv(''); setCfIrr(''); setCfError(''); }}
              inputMode="decimal"
            />
          </label>

          {cfError && <p className="panel-error">{cfError}</p>}

          {cfNpv && (
            <div className="cashflow-results">
              <div>
                <span>NPV</span>
                <strong>{cfNpv}</strong>
              </div>
              <div>
                <span>IRR</span>
                <strong>{cfIrr}</strong>
              </div>
            </div>
          )}

          <button className="solve-button" type="submit">Compute</button>
        </form>
      </section>

      <section className="notes-panel" aria-label="Formula assumptions">
        <h2>Assumptions</h2>
        <ul>
          <li>Rates are entered as percentages per period for v1.</li>
          <li>Cash received is positive; cash paid is negative.</li>
          <li>Classic calculator feel, original branding and layout.</li>
          <li>NPV: first cash flow (t=0) is the initial investment, undiscounted.</li>
          <li>IRR uses Newton-Raphson; may not converge in all edge cases.</li>
        </ul>
      </section>
    </main>
  );
}

export default App;
