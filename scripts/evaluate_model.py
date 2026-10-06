import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import pandas as pd
from backend.bayes.network import infer
from backend.decision.influence import decide

df = pd.read_csv(ROOT / 'backend/data/processed/water_quality_daily.csv')
base = {'ph': float(df.ph.median()), 'conductance': float(df.conductance.median()), 'dissolved_oxygen': float(df.dissolved_oxygen.median()), 'temperature': float(df.temperature.median())}
low = {k: 0.15 for k in base}
high = {k: 0.95 for k in base}
reports = {'processed_rows': len(df), 'missing_values': df[list(base)].isna().sum().to_dict(), 'duplicate_rows': int(df.duplicated().sum()), 'scenarios': {}}
for name, evidence in [('baseline', base), ('low_state', low), ('high_state', high)]:
    result = infer(evidence)
    decision = decide(result['posterior'])
    reports['scenarios'][name] = {'states': result['states'], 'posterior': result['posterior'], 'utilities': decision['utilities'], 'recommendation': decision['recommendation']}
    for dist in result['posterior'].values():
        assert abs(sum(dist.values()) - 1) < 1e-5
    assert decision['recommendation'] == max(decision['utilities'], key=decision['utilities'].get)
assert reports['scenarios']['low_state']['posterior']['overall_risk'] != reports['scenarios']['high_state']['posterior']['overall_risk']
( ROOT / 'backend/data/processed/evaluation_report.json').write_text(json.dumps(reports, indent=2))
print(json.dumps(reports, indent=2))
