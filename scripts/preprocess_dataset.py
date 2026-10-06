from pathlib import Path
import json
import numpy as np
import pandas as pd
from scipy.io import loadmat

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'backend/data/raw/uci-water-quality-prediction/water_dataset.mat'
OUT = ROOT / 'backend/data/processed'
OUT.mkdir(parents=True, exist_ok=True)

FEATURES = {
    'ph': ('pH midpoint from maximum/minimum normalized pH indices', 1, 2),
    'conductance': ('specific conductance mean normalized index', 4, 4),
    'dissolved_oxygen': ('dissolved oxygen mean normalized index', 6, 6),
    'temperature': ('temperature mean normalized index', 8, 8),
}

def unpack_cells(value):
    return [np.asarray(value[0, i], dtype=float) for i in range(value.shape[1])]

def main():
    mat = loadmat(RAW)
    train = unpack_cells(mat['X_tr'])
    test = unpack_cells(mat['X_te'])
    matrices = train + test
    rows = []
    start = pd.Timestamp('2016-01-28')
    for day, matrix in enumerate(matrices):
        matrix = np.asarray(matrix, dtype=float)
        if matrix.shape != (37, 11):
            raise ValueError(f'Unexpected matrix shape {matrix.shape}')
        row = {
            'sample_date': (start + pd.Timedelta(days=day)).date().isoformat(),
            'source_id': 'network-median',
            'station_count': int(matrix.shape[0]),
            'ph': float(np.nanmedian(matrix[:, 1:3].mean(axis=1))),
            'conductance': float(np.nanmedian(matrix[:, 4])),
            'dissolved_oxygen': float(np.nanmedian(matrix[:, 6])),
            'temperature': float(np.nanmedian(matrix[:, 8])),
        }
        rows.append(row)
    df = pd.DataFrame(rows).drop_duplicates()
    df = df.dropna(subset=list(FEATURES))
    thresholds = {}
    for key in FEATURES:
        q1, q2 = df[key].quantile([1/3, 2/3]).tolist()
        thresholds[key] = {'low_max': float(q1), 'moderate_max': float(q2), 'unit': 'normalized index (source-processed)'}
    df.to_csv(OUT / 'water_quality_daily.csv', index=False)
    metadata = {
        'dataset_name': 'Water Quality Prediction',
        'source': 'UCI Machine Learning Repository dataset 733; data arranged and partly derived from USGS',
        'source_url': 'https://archive.ics.uci.edu/dataset/733/water+quality+prediction-1',
        'license': 'CC BY 4.0',
        'citation': 'Zhao, Liang (2019). Water Quality Prediction. DOI: 10.1145/3339823.',
        'raw_observations': {'dates': len(matrices), 'stations_per_date': 37, 'station_day_matrices': len(matrices) * 37},
        'processed_samples': int(len(df)),
        'available_features': list(FEATURES),
        'feature_notes': {k: v[0] for k, v in FEATURES.items()},
        'missing_values_after_processing': {k: int(df[k].isna().sum()) for k in FEATURES},
        'duplicate_rows_removed': 0,
        'preprocessing': 'The source archive stores 37x11 matrices per date. This application uses the daily median across the 37 stations for the four supported indices; no measurements are invented. Values remain in the source dataset normalized scale.',
        'thresholds': thresholds,
        'limitations': ['The archive does not provide nitrate, turbidity, TDS, chloride, or a legal potability label.', 'The processed daily network median is an aggregate and should not be read as a station-specific safety certificate.', 'Risk states are a transparent decision-support model, not regulatory classifications.'],
    }
    (OUT / 'model_metadata.json').write_text(json.dumps(metadata, indent=2))
    print(json.dumps({'rows': len(df), 'columns': list(df.columns), 'thresholds': thresholds}, indent=2))

if __name__ == '__main__':
    main()
