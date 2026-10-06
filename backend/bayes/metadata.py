from pathlib import Path
import json
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'backend/data/processed'
DEFAULT_THRESHOLDS = {
    'ph': {'low_max': 0.82, 'moderate_max': 0.91, 'unit': 'normalized index'},
    'conductance': {'low_max': 0.0025, 'moderate_max': 0.0045, 'unit': 'normalized index'},
    'dissolved_oxygen': {'low_max': 0.82, 'moderate_max': 0.89, 'unit': 'normalized index'},
    'temperature': {'low_max': 0.58, 'moderate_max': 0.64, 'unit': 'normalized index'},
}
STATES = ['low', 'moderate', 'high']
FEATURE_LABELS = {
    'ph': 'pH index midpoint',
    'conductance': 'Specific conductance',
    'dissolved_oxygen': 'Dissolved oxygen',
    'temperature': 'Temperature',
}

def load_metadata():
    path = DATA / 'model_metadata.json'
    if path.exists():
        return json.loads(path.read_text())
    return {'thresholds': DEFAULT_THRESHOLDS, 'available_features': list(DEFAULT_THRESHOLDS)}

def thresholds():
    return load_metadata().get('thresholds', DEFAULT_THRESHOLDS)

def state_for(feature, value):
    t = thresholds().get(feature, DEFAULT_THRESHOLDS[feature])
    if value <= t['low_max']:
        return 'low'
    if value <= t['moderate_max']:
        return 'moderate'
    return 'high'

def feature_stats():
    path = DATA / 'water_quality_daily.csv'
    if not path.exists():
        return {}
    df = pd.read_csv(path)
    stats = {}
    for key in FEATURE_LABELS:
        if key in df:
            values = np.asarray(df[key].tolist(), dtype=float)
            stats[key] = {'min': float(np.min(values)), 'max': float(np.max(values)), 'median': float(np.median(values))}
    return stats
