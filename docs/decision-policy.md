# Decision Network and Utility Policy

The decision model separates uncertain prediction from action choice. The chance variable is the posterior distribution over `low`, `moderate`, `high`, and `critical` overall risk. The decision variable has four actions:

- Normal use
- Monitor / retest
- Treat
- Avoid / restrict use

For each action, expected utility is computed as:

```text
EU(action) = Σ P(risk state | evidence) × utility(action, risk state)
```

The current values are intentionally small, readable educational policy parameters:

| Action | Low | Moderate | High | Critical |
|---|---:|---:|---:|---:|
| Normal use | 8 | 2 | -18 | -42 |
| Monitor / retest | 4 | 7 | 3 | -9 |
| Treat | -5 | 8 | 15 | 13 |
| Avoid / restrict | -10 | 1 | 12 | 20 |

These values encode relative health consequence, treatment/monitoring cost, inconvenience, false-safe cost, and unnecessary-treatment cost. They are **model assumptions**, not measured medical, regulatory, or financial values. The utility table is returned by the backend and displayed alongside the recommendation. The application selects the action with the highest computed expected utility.
