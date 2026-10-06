# Bayesian Network

## Data provenance

The application uses the **Water Quality Prediction** dataset from the [UCI Machine Learning Repository, dataset 733](https://archive.ics.uci.edu/dataset/733/water+quality+prediction-1), licensed CC BY 4.0 and cited as Zhao (2019), DOI `10.1145/3339823`. The archive contains 705 consecutive dates from 2016-01-28 through 2018-01-01, each represented by a 37-station × 11-index matrix. The source README says the data are arranged and partly derived from USGS measurements.

The app uses four source-supported indices: pH midpoint from the maximum/minimum pH fields, specific conductance mean, dissolved oxygen mean, and temperature mean. It aggregates each date to the median across stations so the processed demonstration set has 705 daily rows. Source values are already normalized by the source archive and remain on that scale. There are no nitrate, TDS, turbidity, chloride, or legal potability labels in this archive; those fields are not fabricated or displayed as if available.

## Graph

```text
pH index ───────────┐
                    ├──> Chemical contamination ──┐
conductance ────────┘                              │
                                                   ├──> Overall risk
DO ────────────────┐                               │
                   ├──> Biological contamination ─┘
temperature ───────┘
```

Observed nodes are discretized into `low`, `moderate`, and `high` states using one-third and two-third empirical quantiles from the processed dataset. The actual threshold values are saved in `backend/data/processed/model_metadata.json` and surfaced in the Network page.

## CPTs and inference

- Observed-node priors are empirical state frequencies with Laplace smoothing (+1 per state).
- Chemical and biological CPTs are transparent, inspectable policy assumptions that express how unusual pH/conductance or low DO/high temperature evidence shifts contamination beliefs. They are not hidden learned labels.
- Overall risk is a four-state CPT (`low`, `moderate`, `high`, `critical`) based on chemical and biological states.
- `pgmpy` constructs the `DiscreteBayesianNetwork`, validates the CPDs with `check_model()`, and performs exact `VariableElimination` for every submitted sample and What-If scenario.

All displayed posterior values are returned by this model at runtime and are not hardcoded frontend examples.

## Caveat

A high posterior is a trigger for investigation or testing, not proof of contamination or a regulatory safety decision.
