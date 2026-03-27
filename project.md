# HypoSnitch - Full Build Structure

---

## App Flow (User Journey)

```
[Input Panel] -> [Run Test Button] -> [Step-by-Step Results]
                                          ↓
                                   Step 1: Hypotheses
                                   Step 2: Null Distribution Chart
                                   Step 3: p-value (Simulated + Exact)
                                   Step 4: Decision & Verdict
```

---

## Component Architecture

```
App
├── Header                        (Logo + tagline)
├── InputPanel
│   ├── ClaimInput                (H0 probability, e.g. 0.10)
│   ├── SampleSizeInput           (n, e.g. 20)
│   ├── ObservedInput             (observed defects, e.g. 8)
│   ├── AlphaSelector             (0.01 / 0.05 / 0.10)
│   └── DirectionSelector         (greater / less / two-tailed)
│
└── ResultsPanel                  (only renders after "Run Test")
    ├── Step1_Hypotheses          (H0 and H1 in plain English)
    ├── Step2_Distribution        (histogram chart)
    ├── Step3_PValue              (simulated + exact p-value)
    └── Step4_Verdict             (decision card - reject or not)
```

---

## Data & State Flow

```
userInputs {
  p0          -> claimed probability (H0)
  n           -> sample size
  observed    -> observed count
  alpha       -> significance level
  direction   -> "greater" | "less" | "two-tailed"
}
        ↓
  [Run Test clicked]
        ↓
runSimulation(userInputs)
  -> simulate 10,000 binomial draws
  -> count how many hit the rejection zone
  -> calculate simulated p-value

calculateExactPValue(userInputs)
  -> use binomial CDF formula
  -> P(X ≥ observed) = 1 - P(X ≤ observed - 1)  [for "greater than"]
  -> P(X ≤ observed)                              [for "less than"]
  -> 2 × min(above)                               [for "two-tailed"]
        ↓
results {
  nullDistribution[]   -> array of 10,000 simulated counts
  pValueSim            -> simulated p-value
  pValueExact          -> exact p-value
  reject               -> true / false
  hypotheses           -> { h0: string, h1: string }
}
        ↓
  [ResultsPanel renders all 4 steps]
```

---

## Step-by-Step Logic

### Step 1 - Hypotheses
Dynamically builds sentences from inputs:
- H0: "The true defect rate is equal to 10%"
- H1: "The true defect rate is greater than 10%"

---

### Step 2 - Null Distribution Chart
- X-axis: number of defects (0 -> n)
- Y-axis: frequency out of 10,000 simulated batches
- Blue bars = expected zone under H0
- Red bars = rejection zone (>= observed for "greater than")
- Vertical red line = where the inspector's finding lands

---

### Step 3 - p-value
Two numbers shown side by side:

| | Value |
|---|---|
| Simulated p-value | calculated from simulation |
| Exact p-value | calculated from binomial CDF |

A one-liner explanation beneath:

> "If H0 were true, there's only a 0.03% chance of seeing 8 or more defects in 20 items just by random chance."

---

### Step 4 - Verdict Card
A bold decision card:

```
┌─────────────────────────────────────┐
│  p-value (0.0003) < α (0.05)        │
│                                     │
│  REJECT H0                          │
│                                     │
│  "Strong evidence that the true     │
│   defect rate exceeds 10%."         │
└─────────────────────────────────────┘
```

OR if fail to reject:

```
┌─────────────────────────────────────┐
│  p-value (0.18) ≥ α (0.05)          │
│                                     │
│  FAIL TO REJECT H0                  │
│                                     │
│  "Not enough evidence to dispute    │
│   the factory's claim."             │
└─────────────────────────────────────┘
```

---

## Libraries Needed

| Purpose | Library |
|---|---|
| UI & components | React |
| Chart (histogram) | Recharts |
| Binomial CDF math | jStat |
| Styling | Tailwind CSS |
| Simulation | Plain JavaScript (Math.random()) |

---

## Edge Case Handling

- observed > n -> show error "Observed count can't exceed sample size"
- p0 = 0 or p0 = 1 -> show error "Probability must be between 0 and 1"
- n < 5 -> show warning "Small sample - results may be unreliable"
- observed = 0 with direction "less" -> special note
