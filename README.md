# 🕵️ HypoSnitch: Forensic Binomial Testing

HypoSnitch is a sleek, forensic-themed interactive dashboard designed to perform **Binomial Hypothesis Testing**. Utilizing the power of exact Binomial cumulative distribution formulas and robust Monte Carlo simulations, it allows Data Scientists, Inspectors, and Students to determine the validity of null hypotheses with absolute clarity.

## 🚀 Features

- **Forensic UI Engine**: A stunning dark-mode interface built with Tailwind CSS, utilizing a cyberpunk/forensic terminal aesthetic, featuring fully responsive layouts and dynamic navigational hover state tracking.
- **Dual Calculations**: Calculates and contrasts both **Simulated** (Monte Carlo N=10,000) and **Exact** P-Values (utilizing `jStat` binomial distributions).
- **Dynamic Visualizations**: Leverages customized `recharts` histograms to visualize the full null distribution, map expected statistical normality, and isolate categorical rejection zones against observed variables.
- **Narrative Outcomes**: Automatically structures and generates "Plain English Conclusions" for non-technical stakeholders alongside rigid `ALPHA` confidence metrics.

---

## 🛠️ Local Development

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
1. Clone the repository down to your local machine:
   ```bash
   git clone https://github.com/sudo-ali-dev/HypoSnitch.git
   ```
2. Navigate into the directory and install all dependencies:
   ```bash
   cd HypoSnitch
   npm install
   ```
3. Start the Vite development environment:
   ```bash
   npm run dev
   ```
   *Your app will actively compile and run at `http://localhost:5173`.*

---

*Built with React, Recharts, TailwindCSS, & jStat. Designed by Muhammad Ali.*
