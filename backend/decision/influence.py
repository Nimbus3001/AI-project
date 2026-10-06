ACTIONS = ['normal_use', 'monitor_retest', 'treat', 'avoid_restrict']
ACTION_LABELS = {'normal_use': 'Normal use', 'monitor_retest': 'Monitor / retest', 'treat': 'Treat', 'avoid_restrict': 'Avoid / restrict use'}
RISK_LEVELS = ['low', 'moderate', 'high', 'critical']
# Transparent educational policy assumptions: higher is better; these are not measured costs.
UTILITY_TABLE = {
    'normal_use': {'low': 8, 'moderate': 2, 'high': -18, 'critical': -42},
    'monitor_retest': {'low': 4, 'moderate': 7, 'high': 3, 'critical': -9},
    'treat': {'low': -5, 'moderate': 8, 'high': 15, 'critical': 13},
    'avoid_restrict': {'low': -10, 'moderate': 1, 'high': 12, 'critical': 20},
}

def decide(posterior):
    risk = posterior['overall_risk']
    utilities = {}
    for action in ACTIONS:
        utilities[action] = round(sum(risk[level] * UTILITY_TABLE[action][level] for level in RISK_LEVELS), 3)
    recommendation = max(utilities, key=utilities.get)
    dominant = max(risk, key=risk.get)
    return {'utilities': utilities, 'recommendation': recommendation, 'recommendation_label': ACTION_LABELS[recommendation], 'dominant_risk': dominant, 'policy': UTILITY_TABLE}

def metadata():
    return {'actions': [{'id': a, 'label': ACTION_LABELS[a]} for a in ACTIONS], 'risk_levels': RISK_LEVELS, 'utility_table': UTILITY_TABLE, 'note': 'Policy assumptions for an educational decision-support demonstration. They are configurable and are not regulatory or medical cost measurements.'}
