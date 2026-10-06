from itertools import product
from pathlib import Path
import numpy as np
import pandas as pd
from pgmpy.models import DiscreteBayesianNetwork
from pgmpy.factors.discrete import TabularCPD
from pgmpy.inference import VariableElimination
from .metadata import STATES, FEATURE_LABELS, state_for, load_metadata

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'backend/data/processed/water_quality_daily.csv'
OBSERVED = list(FEATURE_LABELS)

def _empirical_priors():
    if DATA.exists():
        df = pd.read_csv(DATA)
        priors = {}
        for feature in OBSERVED:
            states = df[feature].map(lambda x: state_for(feature, float(x)))
            counts = states.value_counts().reindex(STATES, fill_value=0).to_numpy(dtype=float) + 1.0
            priors[feature] = (counts / counts.sum()).tolist()
        return priors
    return {feature: [1/3, 1/3, 1/3] for feature in OBSERVED}

def _categorical_columns(parent_names, state_count, fn):
    cols = []
    for combo in product(STATES, repeat=len(parent_names)):
        probs = np.asarray(fn(combo), dtype=float)
        probs = np.clip(probs, 1e-6, None)
        probs = probs / probs.sum()
        cols.append(probs)
    return np.asarray(cols).T

def _risk3(combo, weights):
    score = sum(weights.get(x, 0.0) for x in combo) / max(1, len(combo))
    if score < 0.30: return [0.78, 0.18, 0.04]
    if score < 0.58: return [0.16, 0.68, 0.16]
    return [0.04, 0.21, 0.75]

def build_model():
    edges = [('ph', 'chemical'), ('conductance', 'chemical'), ('dissolved_oxygen', 'biological'), ('temperature', 'biological'), ('chemical', 'overall_risk'), ('biological', 'overall_risk')]
    model = DiscreteBayesianNetwork(edges)
    priors = _empirical_priors()
    cpds = []
    state_names = {node: STATES for node in OBSERVED + ['chemical', 'biological']}
    state_names['overall_risk'] = ['low', 'moderate', 'high', 'critical']
    for feature in OBSERVED:
        cpds.append(TabularCPD(feature, 3, np.asarray(priors[feature]).reshape(3, 1), state_names={feature: STATES}))
    chemical = _categorical_columns(['ph', 'conductance'], 3, lambda c: _risk3(c, {'low': 0.45, 'moderate': 0.55, 'high': 0.90}) if c[0] != 'moderate' else _risk3(c, {'low': 0.35, 'moderate': 0.50, 'high': 0.90}))
    biological = _categorical_columns(['dissolved_oxygen', 'temperature'], 3, lambda c: _risk3(c, {'low': 0.90, 'moderate': 0.45, 'high': 0.15}))
    cpds.append(TabularCPD('chemical', 3, chemical, evidence=['ph', 'conductance'], evidence_card=[3, 3], state_names={'chemical': STATES, 'ph': STATES, 'conductance': STATES}))
    cpds.append(TabularCPD('biological', 3, biological, evidence=['dissolved_oxygen', 'temperature'], evidence_card=[3, 3], state_names={'biological': STATES, 'dissolved_oxygen': STATES, 'temperature': STATES}))
    def overall(c):
        cscore = {'low': 0.10, 'moderate': 0.52, 'high': 0.90}[c[0]]
        bscore = {'low': 0.08, 'moderate': 0.48, 'high': 0.88}[c[1]]
        score = 0.55 * cscore + 0.45 * bscore
        if score < 0.22: return [0.72, 0.22, 0.05, 0.01]
        if score < 0.48: return [0.16, 0.62, 0.18, 0.04]
        if score < 0.72: return [0.04, 0.20, 0.62, 0.14]
        return [0.01, 0.06, 0.22, 0.71]
    overall_cpd = _categorical_columns(['chemical', 'biological'], 4, overall)
    cpds.append(TabularCPD('overall_risk', 4, overall_cpd, evidence=['chemical', 'biological'], evidence_card=[3, 3], state_names={'overall_risk': state_names['overall_risk'], 'chemical': STATES, 'biological': STATES}))
    model.add_cpds(*cpds)
    model.check_model()
    return model

MODEL = build_model()
INFER = VariableElimination(MODEL)

def infer(evidence):
    states = {key: state_for(key, float(value)) for key, value in evidence.items() if key in OBSERVED}
    result = {}
    for node in ['chemical', 'biological', 'overall_risk']:
        values = INFER.query([node], evidence=states, show_progress=False).values
        labels = ['low', 'moderate', 'high'] if node != 'overall_risk' else ['low', 'moderate', 'high', 'critical']
        result[node] = {label: round(float(values[i]), 6) for i, label in enumerate(labels)}
    return {'states': states, 'posterior': result}

def network_metadata():
    metadata = load_metadata()
    return {
        'nodes': [
            {'id': 'ph', 'label': 'pH index', 'kind': 'observed', 'states': STATES},
            {'id': 'conductance', 'label': 'Specific conductance', 'kind': 'observed', 'states': STATES},
            {'id': 'dissolved_oxygen', 'label': 'Dissolved oxygen', 'kind': 'observed', 'states': STATES},
            {'id': 'temperature', 'label': 'Temperature', 'kind': 'observed', 'states': STATES},
            {'id': 'chemical', 'label': 'Chemical contamination', 'kind': 'chance', 'states': STATES},
            {'id': 'biological', 'label': 'Biological contamination', 'kind': 'chance', 'states': STATES},
            {'id': 'overall_risk', 'label': 'Overall water quality risk', 'kind': 'chance', 'states': ['low', 'moderate', 'high', 'critical']},
        ],
        'edges': [{'from': a, 'to': b} for a, b in [('ph','chemical'),('conductance','chemical'),('dissolved_oxygen','biological'),('temperature','biological'),('chemical','overall_risk'),('biological','overall_risk')]],
        'thresholds': metadata.get('thresholds', {}),
        'cpt_note': 'Observed-node priors use smoothed empirical state frequencies from the processed UCI/USGS-derived dataset. Intermediate and risk CPTs are transparent policy assumptions documented in docs/bayesian-network.md.',
    }
