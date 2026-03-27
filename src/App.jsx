import { useMemo, useState } from "react";
import { jStat } from "jstat";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DIRECTIONS = {
  greater: "greater than",
  less: "less than",
  "two-tailed": "different from",
};

const ALPHAS = [0.01, 0.05, 0.1];

function parseNum(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function sampleBinomial(n, p) {
  let count = 0;
  for (let i = 0; i < n; i += 1) {
    if (Math.random() < p) count += 1;
  }
  return count;
}

function tailProbabilities(n, p0, observed) {
  const less = jStat.binomial.cdf(observed, n, p0);
  const greater = 1 - jStat.binomial.cdf(observed - 1, n, p0);
  return { less, greater };
}

function computeExactPValue(n, p0, observed, direction) {
  const tails = tailProbabilities(n, p0, observed);

  if (direction === "greater") return tails.greater;
  if (direction === "less") return tails.less;
  return Math.min(1, 2 * Math.min(tails.less, tails.greater));
}

function isInRejectionZone(count, observed, direction, mu) {
  if (direction === "greater") return count >= observed;
  if (direction === "less") return count <= observed;
  return Math.abs(count - mu) >= Math.abs(observed - mu);
}

function explainChance(pValueExact, observed, n, direction) {
  const directionText =
    direction === "greater"
      ? `${observed} or more`
      : direction === "less"
        ? `${observed} or fewer`
        : `${observed} or more-extreme`;

  return `If H0 were true, there is a ${(pValueExact * 100).toFixed(2)}% chance of seeing ${directionText} defects in ${n} items by random chance.`;
}

function runTest({ p0, n, observed, alpha, direction }) {
  const sims = 10000;
  const draws = Array.from({ length: sims }, () => sampleBinomial(n, p0));

  const mu = n * p0;
  const inZone = draws.filter((x) => isInRejectionZone(x, observed, direction, mu)).length;
  const pValueSim = inZone / sims;
  const pValueExact = computeExactPValue(n, p0, observed, direction);

  const bins = Array.from({ length: n + 1 }, (_, k) => ({
    k,
    freq: 0,
    reject: isInRejectionZone(k, observed, direction, mu),
  }));

  draws.forEach((x) => {
    bins[x].freq += 1;
  });

  const reject = pValueExact < alpha;

  return {
    nullDistribution: draws,
    histogram: bins,
    pValueSim,
    pValueExact,
    reject,
    hypotheses: {
      h0: `The true defect rate is equal to ${(p0 * 100).toFixed(1)}%.`,
      h1: `The true defect rate is ${DIRECTIONS[direction]} ${(p0 * 100).toFixed(1)}%.`,
    },
    explanation: explainChance(pValueExact, observed, n, direction),
  };
}

function App() {
  const [p0, setP0] = useState("0.10");
  const [n, setN] = useState("20");
  const [observed, setObserved] = useState("8");
  const [alpha, setAlpha] = useState(0.05);
  const [direction, setDirection] = useState("greater");
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [results, setResults] = useState(null);

  const parsed = useMemo(
    () => ({
      p0: parseNum(p0),
      n: parseNum(n),
      observed: parseNum(observed),
    }),
    [p0, n, observed]
  );

  function validateInputs() {
    const nextErrors = [];
    const nextWarnings = [];

    if (!Number.isFinite(parsed.p0) || parsed.p0 <= 0 || parsed.p0 >= 1) {
      nextErrors.push("Probability must be between 0 and 1 (exclusive).");
    }

    if (!Number.isInteger(parsed.n) || parsed.n <= 0) {
      nextErrors.push("Sample size must be a positive integer.");
    }

    if (!Number.isInteger(parsed.observed) || parsed.observed < 0) {
      nextErrors.push("Observed defects must be a non-negative integer.");
    }

    if (Number.isInteger(parsed.n) && Number.isInteger(parsed.observed) && parsed.observed > parsed.n) {
      nextErrors.push("Observed count cannot exceed sample size.");
    }

    if (Number.isInteger(parsed.n) && parsed.n < 5) {
      nextWarnings.push("Small sample - results may be unreliable.");
    }

    if (Number.isInteger(parsed.observed) && parsed.observed === 0 && direction === "less") {
      nextWarnings.push("Special note: with observed = 0 and a lower-tail test, evidence can only support very low rates.");
    }

    setErrors(nextErrors);
    setWarnings(nextWarnings);

    return nextErrors.length === 0;
  }

  function handleRun() {
    if (!validateInputs()) {
      setResults(null);
      return;
    }

    const outcome = runTest({
      p0: parsed.p0,
      n: parsed.n,
      observed: parsed.observed,
      alpha,
      direction,
    });

    setResults(outcome);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <header className="reveal mb-8 rounded-3xl border border-ink/10 bg-ink px-6 py-8 text-cream shadow-card">
        <p className="mb-2 text-sm uppercase tracking-[0.26em] text-sun">Stat Detective</p>
        <h1 className="text-4xl font-bold md:text-5xl">HypoSnitch</h1>
        <p className="mt-3 max-w-2xl text-cream/85">
          Test a defect-rate claim with simulation and exact binomial math. Run the case and walk through each step.
        </p>
      </header>

      <section className="reveal glass mb-6 rounded-3xl border border-ink/10 p-5 shadow-card md:p-7">
        <h2 className="mb-5 text-2xl font-semibold text-ink">Input Panel</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink/80">H0 probability (p0)</span>
            <input
              type="number"
              step="0.01"
              value={p0}
              onChange={(e) => setP0(e.target.value)}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 outline-none transition focus:border-coral"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink/80">Sample size (n)</span>
            <input
              type="number"
              step="1"
              value={n}
              onChange={(e) => setN(e.target.value)}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 outline-none transition focus:border-coral"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink/80">Observed defects</span>
            <input
              type="number"
              step="1"
              value={observed}
              onChange={(e) => setObserved(e.target.value)}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 outline-none transition focus:border-coral"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-ink/80">Significance level (alpha)</span>
            <select
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 outline-none transition focus:border-coral"
            >
              {ALPHAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-ink/80">Alternative direction</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 outline-none transition focus:border-coral"
            >
              <option value="greater">greater</option>
              <option value="less">less</option>
              <option value="two-tailed">two-tailed</option>
            </select>
          </label>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={handleRun}
            className="rounded-2xl bg-coral px-6 py-3 text-sm font-bold uppercase tracking-[0.1em] text-white transition hover:translate-y-[-1px] hover:bg-[#d73b60]"
          >
            Run Test
          </button>
        </div>

        {errors.length > 0 && (
          <ul className="mt-4 space-y-2 rounded-xl border border-coral/40 bg-coral/10 p-4 text-sm text-ink">
            {errors.map((error) => (
              <li key={error}>- {error}</li>
            ))}
          </ul>
        )}

        {warnings.length > 0 && (
          <ul className="mt-4 space-y-2 rounded-xl border border-sun/70 bg-sun/25 p-4 text-sm text-ink">
            {warnings.map((warning) => (
              <li key={warning}>- {warning}</li>
            ))}
          </ul>
        )}
      </section>

      {results && (
        <section className="space-y-6">
          <article className="reveal glass rounded-3xl border border-ink/10 p-5 shadow-card md:p-7">
            <h3 className="text-2xl font-semibold text-ink">Step 1: Hypotheses</h3>
            <p className="mt-3 text-base text-ink/90">
              <strong>H0:</strong> {results.hypotheses.h0}
            </p>
            <p className="mt-2 text-base text-ink/90">
              <strong>H1:</strong> {results.hypotheses.h1}
            </p>
          </article>

          <article className="reveal glass rounded-3xl border border-ink/10 p-5 shadow-card md:p-7">
            <h3 className="text-2xl font-semibold text-ink">Step 2: Null Distribution Chart</h3>
            <div className="mt-4 h-[320px] w-full">
              <ResponsiveContainer>
                <BarChart data={results.histogram} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#13293d22" />
                  <XAxis dataKey="k" label={{ value: "Defect count", position: "insideBottom", offset: -2 }} />
                  <YAxis label={{ value: "Frequency", angle: -90, position: "insideLeft" }} />
                  <Tooltip cursor={{ fill: "#13293d10" }} formatter={(value) => [value, "Frequency"]} />
                  <ReferenceLine x={parsed.observed} stroke="#ef476f" strokeWidth={3} />
                  <Bar dataKey="freq" radius={[4, 4, 0, 0]}>
                    {results.histogram.map((row) => (
                      <Cell key={row.k} fill={row.reject ? "#ef476f" : "#3f88c5"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="reveal glass rounded-3xl border border-ink/10 p-5 shadow-card md:p-7">
            <h3 className="text-2xl font-semibold text-ink">Step 3: p-value</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <p className="text-sm uppercase tracking-wide text-ink/60">Simulated p-value</p>
                <p className="mt-1 text-2xl font-bold text-ink">{results.pValueSim.toFixed(6)}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <p className="text-sm uppercase tracking-wide text-ink/60">Exact p-value</p>
                <p className="mt-1 text-2xl font-bold text-ink">{results.pValueExact.toFixed(6)}</p>
              </div>
            </div>
            <p className="mt-4 text-ink/85">{results.explanation}</p>
          </article>

          <article
            className={`reveal rounded-3xl border p-5 shadow-card md:p-7 ${
              results.reject ? "border-mint/60 bg-mint/20" : "border-ink/20 bg-white"
            }`}
          >
            <h3 className="text-2xl font-semibold text-ink">Step 4: Decision</h3>
            <p className="mt-3 text-lg font-medium text-ink">
              p-value ({results.pValueExact.toFixed(6)}) {results.reject ? "<" : ">="} alpha ({alpha})
            </p>
            <p className="mt-2 text-2xl font-bold uppercase tracking-wide text-ink">
              {results.reject ? "Reject H0" : "Fail to Reject H0"}
            </p>
            <p className="mt-2 text-ink/85">
              {results.reject
                ? `Strong evidence that the true defect rate is ${DIRECTIONS[direction]} ${(parsed.p0 * 100).toFixed(1)}%.`
                : "Not enough evidence to dispute the factory claim."}
            </p>
          </article>
        </section>
      )}
    </main>
  );
}

export default App;
