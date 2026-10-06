# AQUA / BAYES — Bayesian Water Quality Risk Prediction & Decision Support

A runnable academic decision-support application aligned with SDG 6. It combines a real UCI/USGS-derived water-quality dataset, a `pgmpy` Bayesian Network, exact posterior inference, a transparent decision policy, expected utility, SQLite persistence, explainability, What-If analysis, historical trends, and live model diagrams.

## Quick start

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scripts/preprocess_dataset.py
cd frontend && npm install && npm run build && cd ..
.venv/bin/python -m backend.app
```

Open `http://localhost:3000`. The server listens on `0.0.0.0` and serves the built React frontend plus `/api/*` routes.

## Demonstration path

1. Open **Analyze water**.
2. Enter four source-normalized indices (0–1): pH midpoint, specific conductance, dissolved oxygen, and temperature.
3. Select a source and date, then run the assessment.
4. Inspect posterior distributions, ranked evidence, and expected utilities.
5. Open **What-if analysis**, change one value, and recalculate without persisting the scenario.
6. Open **History** to inspect the saved result and dashboard trends.
7. Inspect **Bayesian network**, **Decision network**, and **Model / About** for the methodology and assumptions.

## Architecture

- `backend/bayes/network.py`: Bayesian graph, CPTs, and exact `VariableElimination` inference.
- `backend/decision/influence.py`: action set, utility assumptions, and expected utility.
- `backend/db.py`: SQLite schema and persistence.
- `backend/app.py`: Flask API and frontend serving.
- `scripts/preprocess_dataset.py`: reproducible source archive → daily processed dataset and threshold metadata.
- `frontend/src/App.jsx`: responsive product interface and required pages.

## Dataset and limitations

The app uses the UCI Machine Learning Repository **Water Quality Prediction** dataset (ID 733), licensed CC BY 4.0 and cited as Zhao (2019), DOI `10.1145/3339823`. It contains 705 daily samples represented by 37-station matrices and 11 normalized indices. This app uses four supported indices and daily station medians. It does not fabricate nitrate, TDS, turbidity, chloride, microbiology, or legal potability labels.

Read [`docs/bayesian-network.md`](docs/bayesian-network.md), [`docs/decision-policy.md`](docs/decision-policy.md), and [`docs/evaluation.md`](docs/evaluation.md) for structure, CPT rationale, utility assumptions, evaluation boundaries, and SDG 6 alignment.

> This system is an AI-based decision-support and educational tool. Its predictions do not replace laboratory testing, regulatory standards, or professional public-health assessment. A high-risk prediction indicates that further investigation or testing may be warranted.
