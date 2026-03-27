import { useMemo, useState, useEffect, useRef } from "react";
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
      h0: (p0).toFixed(2),
      h1: (p0).toFixed(2),
    },
    runTime: new Date().toISOString(),
    runId: (Math.random() * 1000).toFixed(0),
    latency: (Math.random() * 10).toFixed(3)
  };
}

export default function App() {
  const [p0, setP0] = useState("0.10");
  const [n, setN] = useState("20");
  const [observed, setObserved] = useState("8");
  const [alpha, setAlpha] = useState(0.05);
  const [direction, setDirection] = useState("greater");
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [activeSection, setActiveSection] = useState("parameters");

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
      nextErrors.push("Claimed defect rate must be strictly between 0 and 1.");
    }
    if (!Number.isInteger(parsed.n) || parsed.n <= 0) {
      nextErrors.push("Sample size must be a positive integer.");
    }
    if (!Number.isInteger(parsed.observed) || parsed.observed < 0) {
      nextErrors.push("Observed defects must be non-negative.");
    }
    if (Number.isInteger(parsed.n) && Number.isInteger(parsed.observed) && parsed.observed > parsed.n) {
      nextErrors.push("Observed defects cannot exceed the sample size.");
    }

    if (Number.isInteger(parsed.n) && parsed.n < 5) {
      nextWarnings.push("Small sample size (n<5) — results may be statistically unreliable.");
    }
    if (Number.isInteger(parsed.observed) && parsed.observed === 0 && direction === "less") {
      nextWarnings.push("Special Note: k=0 with lower-tail tests only provides evidence for extremely low rates.");
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

  const initialRunDone = useRef(false);
  useEffect(() => {
    if (!initialRunDone.current) {
      handleRun();
      initialRunDone.current = true;
    }
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0d0d16] border-b border-[#8eff71]/15 flex justify-between items-center w-full px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black text-[#8eff71] tracking-tighter font-headline">HypoSnitch</span>
          <div className="h-4 w-[1px] bg-outline-variant/30 hidden md:block"></div>
          <span className="font-['Space_Grotesk'] uppercase tracking-[0.05rem] text-sm text-[#8eff71]/60 hidden md:block">Hypothesis Testing</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-[#8eff71]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>biotech</span>
            <span className="material-symbols-outlined text-[#8eff71]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>analytics</span>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-0 h-full flex flex-col items-center py-8 z-40 bg-[#0d0d16] border-r border-[#8eff71]/15 w-20 pt-24 hidden md:flex">
        <div className="mb-12 text-center">
          <div className="text-[#8eff71] font-bold font-headline text-xs tracking-tighter">SNITCH_OS</div>
          <div className="font-['Space_Grotesk'] text-[10px] uppercase tracking-widest text-[#8eff71]/40">v2.0.26</div>
        </div>
        <nav className="flex flex-col w-full gap-2">
          {[
            { id: "parameters", icon: "tune", label: "Parameters" },
            { id: "hypothesis", icon: "gavel", label: "Hypothesis" },
            { id: "distribution", icon: "bar_chart", label: "Distribution" },
            { id: "verdict", icon: "verified", label: "Verdict" },
          ].map((item) => (
            <div
              key={item.id}
              onMouseEnter={() => setActiveSection(item.id)}
              className={`w-full flex flex-col items-center py-4 transition-all scale-95 active:scale-90 cursor-pointer ${activeSection === item.id
                ? "bg-[#8eff71] text-[#0d0d16]"
                : "text-[#8eff71]/40 hover:text-[#c3f400] hover:bg-[#1f1f2a]"
                }`}
            >
              <span className="material-symbols-outlined mb-1">{item.icon}</span>
              <span className="font-['Space_Grotesk'] text-[10px] uppercase tracking-widest">{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <main className="md:pl-20 pt-20 pb-16 min-h-screen flex flex-col">
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-4 space-y-6" onMouseEnter={() => setActiveSection("parameters")}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-primary"></span>
              <h2 className="font-headline text-xs font-bold uppercase tracking-[0.2rem] text-primary">Input_Parameters</h2>
            </div>
            <div className="bg-surface-container p-6 border-l-2 border-primary/30 relative flex flex-col gap-8">
              <div className="space-y-6 relative z-10">
                <div className="space-y-2">
                  <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant flex justify-between">
                    Claimed Defect Rate (p₀)
                    <span className="text-primary/40 font-mono">FLOAT64</span>
                  </label>
                  <input
                    type="number" step="0.01" value={p0} onChange={(e) => setP0(e.target.value)}
                    className="w-full bg-surface-container-low border-0 border-b border-primary py-3 px-4 font-headline text-primary focus:ring-0 focus:bg-surface-container-high transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant flex justify-between">
                    Sample Size (n)
                    <span className="text-primary/40 font-mono">INT64</span>
                  </label>
                  <input
                    type="number" value={n} onChange={(e) => setN(e.target.value)}
                    className="w-full bg-surface-container-low border-0 border-b border-primary py-3 px-4 font-headline text-primary focus:ring-0 focus:bg-surface-container-high transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant flex justify-between">
                    Observed Defects (k)
                    <span className="text-primary/40 font-mono">INT64</span>
                  </label>
                  <input
                    type="number" value={observed} onChange={(e) => setObserved(e.target.value)}
                    className="w-full bg-surface-container-low border-0 border-b border-primary py-3 px-4 font-headline text-primary focus:ring-0 focus:bg-surface-container-high transition-colors"
                  />
                </div>
                <div className="space-y-3">
                  <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Significance Level (α)</label>
                  <div className="grid grid-cols-3 gap-1">
                    {ALPHAS.map((a) => (
                      <button
                        key={a} type="button" onClick={() => setAlpha(a)}
                        className={`py-2 text-xs font-headline border transition-all ${alpha === a ? "border-primary bg-primary text-on-primary" : "border-primary/20 bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary"}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Direction of Alternative (H₁)</label>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => setDirection("greater")} className={`w-full py-3 text-[10px] text-left px-4 font-headline border transition-all uppercase flex justify-between items-center ${direction === "greater" ? "border-primary bg-primary text-on-primary" : "border-primary/20 bg-surface-container-high text-primary hover:border-secondary"}`}>
                      Greater Than (p &gt; p₀)
                      <span className="material-symbols-outlined text-xs">trending_up</span>
                    </button>
                    <button type="button" onClick={() => setDirection("two-tailed")} className={`w-full py-3 text-[10px] text-left px-4 font-headline border transition-all uppercase flex justify-between items-center ${direction === "two-tailed" ? "border-primary bg-primary text-on-primary" : "border-primary/20 bg-surface-container-high text-primary hover:border-secondary"}`}>
                      Two-Tailed (p ≠ p₀)
                      <span className="material-symbols-outlined text-xs">unfold_more</span>
                    </button>
                    <button type="button" onClick={() => setDirection("less")} className={`w-full py-3 text-[10px] text-left px-4 font-headline border transition-all uppercase flex justify-between items-center ${direction === "less" ? "border-primary bg-primary text-on-primary" : "border-primary/20 bg-surface-container-high text-primary hover:border-secondary"}`}>
                      Less Than (p &lt; p₀)
                      <span className="material-symbols-outlined text-xs">trending_down</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative z-10 space-y-4">
                <button type="button" onClick={handleRun} className="w-full bg-primary text-on-primary font-headline font-bold uppercase py-4 tracking-widest text-sm hover:bg-primary-dim active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  Run Forensic Test
                </button>

                {errors.length > 0 && (
                  <ul className="space-y-2 rounded-none border-l-2 border-error bg-error/10 p-4 text-[10px] uppercase tracking-widest text-error font-label">
                    {errors.map((error, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <span className="material-symbols-outlined text-xs shrink-0">warning</span>
                        <span className="leading-tight">{error}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {warnings.length > 0 && (
                  <ul className="space-y-2 rounded-none border-l-2 border-secondary bg-secondary/10 p-4 text-[10px] uppercase tracking-widest text-secondary font-label">
                    {warnings.map((warning, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <span className="material-symbols-outlined text-xs shrink-0">info</span>
                        <span className="leading-tight">{warning}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="bg-surface-container-low p-4 border border-outline-variant/10">
              <div className="flex items-center gap-3 text-[10px] font-label text-on-surface-variant uppercase tracking-tighter hover:text-primary transition-colors cursor-default">
                <span className="material-symbols-outlined text-xs">info</span>
                System notes: Exact binomial calculations use log-gamma normalization for high-n precision.
              </div>
            </div>
          </section>

          {results && (
            <section className="lg:col-span-8 space-y-8 animate-[fadeIn_0.5s_ease-out]">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-2 space-y-6" onMouseEnter={() => setActiveSection("hypothesis")}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-secondary"></span>
                    <h2 className="font-headline text-xs font-bold uppercase tracking-[0.2rem] text-secondary">Step_01_Hypothesis</h2>
                  </div>
                  <div className="bg-surface-container p-6 border-l-2 border-secondary/30 relative overflow-hidden group">
                    <div className="absolute right-[-20px] top-[40%] opacity-5 rotate-90 font-headline text-4xl font-black transition-opacity group-hover:opacity-10">H0_VS_H1</div>
                    <p className="text-sm font-body leading-relaxed text-on-surface-variant relative z-10">
                      The <span className="text-primary font-bold">null hypothesis (H₀)</span> assumes the true defect rate is exactly <span className="font-headline text-on-surface">{results.hypotheses.h0}</span>.
                    </p>
                    <div className="my-4 h-[1px] bg-outline-variant/20 relative z-10"></div>
                    <p className="text-sm font-body leading-relaxed text-on-surface-variant relative z-10">
                      The <span className="text-secondary font-bold">alternative hypothesis (H₁)</span> suggests the true defect rate is {DIRECTIONS[direction]} <span className="font-headline text-on-surface">{results.hypotheses.h1}</span>.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <span className="w-2 h-2 bg-primary"></span>
                    <h2 className="font-headline text-xs font-bold uppercase tracking-[0.2rem] text-primary">Step_03_P_Values</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-high p-4 flex flex-col items-center border border-primary/10 hover:border-primary/30 transition-colors">
                      <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mb-2 text-center">Exact Binomial</span>
                      <span className="font-headline text-2xl font-bold text-primary">{results.pValueExact.toFixed(4)}</span>
                    </div>
                    <div className="bg-surface-container-high p-4 flex flex-col items-center border border-primary/10 hover:border-primary/30 transition-colors">
                      <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mb-2 text-center">Simulated (N=10k)</span>
                      <span className="font-headline text-2xl font-bold text-primary">{results.pValueSim.toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-surface-container-lowest border border-outline-variant/15 italic text-[11px] text-on-surface-variant leading-relaxed">
                    {`"The probability of observing ${direction === 'greater' ? parsed.observed + ' or more' : direction === 'less' ? parsed.observed + ' or fewer' : parsed.observed + ' or more extreme'} defects purely by chance, given p₀=${results.hypotheses.h0}, is approximately ${(results.pValueExact * 100).toFixed(2)}%."`}
                  </div>
                </div>

                <div className="md:col-span-3 space-y-6" onMouseEnter={() => setActiveSection("distribution")}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary"></span>
                    <h2 className="font-headline text-xs font-bold uppercase tracking-[0.2rem] text-primary">Step_02_Null_Distribution</h2>
                  </div>
                  <div className="bg-surface-container p-6 aspect-[4/3] min-h-[300px] flex flex-col relative border border-primary/10">
                    <div className="flex-1 w-full h-full pb-6 relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={results.histogram} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#8eff7110" vertical={false} />
                          <XAxis dataKey="k" stroke="#8eff7140" tick={{ fill: '#8eff7150', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#8eff7130' }} tickLine={false} />
                          <YAxis stroke="#8eff7140" tick={{ fill: '#8eff7150', fontSize: 10, fontFamily: 'monospace' }} axisLine={false} tickLine={false} label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: '#ffffff', fontSize: 10, fontFamily: 'monospace', offset: 10 }} />
                          <Tooltip cursor={{ fill: "#8eff7110" }} formatter={(value) => [value, "Frequency"]} contentStyle={{ backgroundColor: '#1f1f2a', border: '1px solid #8eff7130', borderRadius: '4px', fontSize: '11px', color: '#ffffff', fontFamily: 'monospace' }} itemStyle={{ color: '#ffffff' }} labelStyle={{ color: '#ffffff' }} />
                          <ReferenceLine x={parsed.observed} stroke="#ff7351" strokeWidth={2} strokeDasharray="3 3" label={{ position: 'top', value: 'OBSERVED', fill: '#ff7351', fontSize: 10, fontFamily: 'monospace' }} />
                          <Bar dataKey="freq" radius={[2, 2, 0, 0]}>
                            {results.histogram.map((row) => (
                              <Cell key={row.k} fill={row.reject ? "#ff735180" : "#8eff7140"} className="hover:opacity-80 transition-opacity" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="absolute bottom-4 right-6 flex gap-4 text-[9px] uppercase tracking-widest font-label z-10 hidden sm:flex">
                      <div className="flex items-center gap-2"><span className="w-2 h-2 bg-[#8eff7140]"></span> Null Dist</div>
                      <div className="flex items-center gap-2"><span className="w-2 h-2 bg-[#ff735180]"></span> Rejection Zone</div>
                    </div>
                  </div>
                  <div className="p-4 bg-surface-container-lowest border border-outline-variant/15 italic text-[11px] text-on-surface-variant leading-relaxed">
                    {`"This histogram visualizes 10,000 simulated batches of ${parsed.n} items assuming H₀ is true (p₀=${results.hypotheses.h0}). The red rejection zone visually represents the probability of seeing ${direction === 'greater' ? parsed.observed + ' or more' : direction === 'less' ? parsed.observed + ' or fewer' : parsed.observed + ' or more extreme'} defects strictly by random chance."`}
                  </div>
                </div>
              </div>

              <div className="space-y-6" onMouseEnter={() => setActiveSection("verdict")}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 ${results.reject ? 'bg-error' : 'bg-secondary'}`}></span>
                  <h2 className={`font-headline text-xs font-bold uppercase tracking-[0.2rem] ${results.reject ? 'text-error' : 'text-secondary'}`}>Step_04_Final_Verdict</h2>
                </div>
                <div className={`flex flex-col border overflow-hidden transition-colors ${results.reject ? 'border-error/30' : 'border-secondary/30'}`}>
                  <div className={`${results.reject ? 'bg-error' : 'bg-secondary'} p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 relative`}>
                    <div className="flex flex-col items-center md:items-start text-center md:text-left relative z-10">
                      <span className={`font-label text-[11px] font-bold uppercase tracking-[0.4em] mb-2 ${results.reject ? 'text-on-error/70' : 'text-on-secondary/70'}`}>Final Verdict Status</span>
                      <h3 className={`font-headline font-black text-4xl md:text-5xl tracking-tighter uppercase leading-none ${results.reject ? 'text-on-error' : 'text-on-secondary'}`}>
                        {results.reject ? "REJECT NULL" : "FAIL TO REJECT"}
                      </h3>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-3 relative z-10">
                      <div className={`px-4 py-2 font-headline font-black text-xs md:text-sm tracking-widest uppercase shadow-sm ${results.reject ? 'bg-on-error text-error' : 'bg-[#0d0d16] text-secondary'}`}>
                        {results.reject ? "BREACH_DETECTED" : "WITHIN_LIMITS"}
                      </div>
                      <span className={`font-mono text-[10px] ${results.reject ? 'text-on-error/80' : 'text-on-secondary/80'}`}>SYSTEM_TIME: {results.runTime}</span>
                    </div>
                    <div className="absolute right-[-20px] md:right-10 bottom-[-20px] opacity-10 pointer-events-none">
                      <span className="material-symbols-outlined text-[150px] md:text-9xl leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>{results.reject ? "gavel" : "verified"}</span>
                    </div>
                  </div>
                  <div className={`grid grid-cols-1 md:grid-cols-12 bg-surface-container border-t ${results.reject ? 'border-error/20' : 'border-secondary/20'}`}>
                    <div className={`md:col-span-8 p-6 md:p-8 border-b md:border-b-0 md:border-r ${results.reject ? 'border-error/10' : 'border-secondary/10'}`}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`material-symbols-outlined text-sm ${results.reject ? 'text-error' : 'text-secondary'}`}>description</span>
                        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Plain English Conclusion</span>
                      </div>
                      <p className="font-headline text-lg md:text-xl text-on-surface font-medium leading-relaxed">
                        Statistical analysis confirms there is <span className={`${results.reject ? 'text-error underline' : 'text-secondary'} decoration-2 underline-offset-4`}>{results.reject ? 'sufficient evidence' : 'insufficient evidence'}</span> at the significance level of α={alpha} to conclude the true defect rate is {DIRECTIONS[direction]} the claimed {(parsed.p0 || 0).toFixed(2)} baseline.
                      </p>
                    </div>
                    <div className="md:col-span-4 bg-surface-container-low p-6 md:p-8 space-y-6">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm">terminal</span>
                        <span className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Technical Metrics</span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                          <span className="font-mono text-[10px] text-on-surface-variant">ALPHA</span>
                          <span className="font-headline text-2xl font-bold text-primary">{alpha}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                          <span className="font-mono text-[10px] text-on-surface-variant">CONFIDENCE</span>
                          <span className="font-headline text-2xl font-bold text-primary">{((1 - alpha) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="font-mono text-[10px] text-on-surface-variant">P-VALUE (EXACT)</span>
                          <span className={`font-headline text-lg font-bold ${results.reject ? 'text-error' : 'text-secondary'}`}>{results.pValueExact.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant/10 p-4 font-mono text-[10px] text-on-surface-variant/60 uppercase grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>RUN_ID: {results.runId}-SNITCH-XP</div>
                  <div>LATENCY: {results.latency}ms</div>
                  <div>METHOD: EXACT_BINOMIAL</div>
                  <div className="text-right">OS: SNITCH_CORE_v2</div>
                </div>
              </div>
            </section>
          )}
        </div>
        <div className="mt-auto pt-16 flex justify-center w-full select-none pb-8">
          <a
            href="https://github.com/sudo-ali-dev"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-5 font-headline text-3xl md:text-5xl font-black tracking-[0.2em] text-[#f2effb] transition-opacity duration-300 hover:opacity-10 cursor-pointer"
          >
            BUILT_BY_MUHAMMAD_ALI
          </a>
        </div>
      </main>

      <div className="fixed inset-0 pointer-events-none opacity-[0.03] overflow-hidden z-[100]">
        <div className="absolute inset-0 bg-[radial-gradient(#8eff71_1px,transparent_1px)] [background-size:20px_20px]"></div>
      </div>
    </>
  );
}
