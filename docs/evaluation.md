# Evaluation, limitations, and SDG 6 alignment

## Evaluation approach

The UCI/USGS-derived archive is a forecasting dataset without a trustworthy legal potability or contamination ground-truth label. Therefore the app does not fabricate accuracy, precision, recall, F1, or a confusion matrix. The useful checks are:

- CPT columns normalize to 1.
- Posterior distributions normalize to 1 for each query.
- Sensitivity analysis: changing evidence states changes posterior and expected utility through the same inference path.
- Data quality: 705 daily rows after aggregation, no missing supported values, and reproducible source-derived thresholds.
- Decision consistency: recommendation equals the maximum expected utility.

## Limitations and uncertainty

The processed daily median is not station-specific. The source features are normalized, not a complete laboratory panel. No nitrate, TDS, turbidity, chloride, microbiology, or regulatory compliance labels are available. The intermediate contamination CPTs, overall-risk CPT, and utilities are transparent assumptions chosen for an academic decision-support demonstration. Dataset sampling and aggregation can introduce bias. A posterior probability is not a diagnosis.

## SDG 6 alignment

This is **a decision-support tool aligned with SDG 6 objectives**. It supports SDG 6.1 by helping users identify potentially concerning evidence for further investigation, and SDG 6.3 by supporting transparent water-quality monitoring and pollution-related risk discussion. The application does not itself achieve SDG 6 and does not certify water as legally safe for human consumption.

## Required safety disclaimer

> This system is an AI-based decision-support and educational tool. Its predictions do not replace laboratory testing, regulatory standards, or professional public-health assessment. A high-risk prediction indicates that further investigation or testing may be warranted.
