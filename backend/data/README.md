# Dataset provenance and preprocessing

Source: [UCI Machine Learning Repository — Water Quality Prediction, dataset 733](https://archive.ics.uci.edu/dataset/733/water+quality+prediction-1), CC BY 4.0, citation Zhao (2019), DOI `10.1145/3339823`. The archive is arranged and partly derived from USGS measurements.

The source contains 705 consecutive dates and a 37 × 11 matrix for each date. The preprocessing script aggregates each date to the median across the 37 stations and keeps four supported indices: pH midpoint, specific conductance mean, dissolved oxygen mean, and temperature mean. This yields 705 daily rows. Source values are already normalized and are kept on that normalized scale. The source has no missing values according to the UCI metadata; the script still drops invalid/missing supported rows and reports the result. Duplicate processed rows are removed where appropriate.

The archive does **not** contain nitrate, TDS, turbidity, chloride, microbiology, or a legal potability label. Those variables are not fabricated. The model metadata records empirical one-third/two-third discretization thresholds and limitations.
