from pathlib import Path
import json
from flask import Flask, jsonify, request, send_from_directory
from .db import init_db, create_assessment, list_assessments, get_assessment, list_sources, add_source, update_source
from .bayes.network import infer, network_metadata
from .bayes.metadata import FEATURE_LABELS, load_metadata, feature_stats
from .decision.influence import decide, metadata as decision_metadata

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / 'frontend/dist'
app = Flask(__name__, static_folder=str(FRONTEND / 'assets'), static_url_path='/assets')
init_db()

DISCLAIMER = 'This system is an AI-based decision-support and educational tool. Its predictions do not replace laboratory testing, regulatory standards, or professional public-health assessment. A high-risk prediction indicates that further investigation or testing may be warranted.'

def factors(evidence, states, posterior):
    scores=[]
    dominant=max(posterior['overall_risk'], key=posterior['overall_risk'].get)
    current=posterior['overall_risk'][dominant]
    neutral={'low':0.5,'moderate':0.5,'high':0.5}
    for feature, value in evidence.items():
        label=FEATURE_LABELS.get(feature, feature)
        state=states.get(feature,'unknown')
        counterfactual=dict(evidence); counterfactual[feature]=neutral[state] if state in neutral else 0.5
        counterfactual_probability=infer(counterfactual)['posterior']['overall_risk'][dominant]
        score=round(abs(current-counterfactual_probability),3)
        scores.append({'feature':feature,'label':label,'value':value,'state':state,'contribution':score})
    return sorted(scores,key=lambda x:x['contribution'],reverse=True)

def validate(data):
    required=list(FEATURE_LABELS)
    errors={}
    for key in required:
        if key not in data or data[key] in ('',None): errors[key]='Required supported normalized index (0–1).'
        else:
            try:
                value=float(data[key])
                if not 0 <= value <= 1: errors[key]='Must be between 0 and 1 for the source-normalized index.'
            except (TypeError,ValueError): errors[key]='Must be numeric.'
    if errors: return None, errors
    return {k:float(data[k]) for k in required}, None

def assessment_payload(data, persist=False):
    evidence, errors=validate(data.get('evidence',data))
    if errors: return None, (jsonify({'errors':errors}),400)
    result=infer(evidence)
    decision=decide(result['posterior'])
    ranked=factors(evidence,result['states'],result['posterior'])
    payload={'sample_date':data.get('sample_date') or 'Today','source_id':data.get('source_id'),'evidence':evidence,'states':result['states'],'posterior':result['posterior'],'utilities':decision['utilities'],'recommendation':decision['recommendation'],'factors':ranked,'model_version':'bayeswater-v1'}
    if persist: payload['id']=create_assessment(payload)
    return {**payload,'recommended_action':payload['recommendation'],'recommendation_label':decision['recommendation_label'],'dominant_risk':decision['dominant_risk'],'policy':decision['policy'],'disclaimer':DISCLAIMER}, None

@app.get('/api/health')
def health(): return jsonify({'ok':True,'service':'bayeswater','model_version':'bayeswater-v1'})
@app.get('/api/model/network')
def model_network(): return jsonify(network_metadata())
@app.get('/api/model/decision-network')
def model_decision(): return jsonify(decision_metadata())
@app.get('/api/model/about')
def model_about(): return jsonify({'metadata':load_metadata(),'feature_stats':feature_stats(),'feature_labels':FEATURE_LABELS,'disclaimer':DISCLAIMER})
@app.get('/api/sources')
def sources(): return jsonify(list_sources())
@app.post('/api/sources')
def source_create():
    data=request.get_json(force=True)
    if not data.get('name'): return jsonify({'error':'Source name is required'}),400
    return jsonify({'id':add_source(data)}),201
@app.patch('/api/sources/<int:source_id>')
def source_update(source_id):
    data=request.get_json(force=True)
    if not data.get('name'): return jsonify({'error':'Source name is required'}),400
    row=update_source(source_id, data)
    return (jsonify(row),200) if row else (jsonify({'error':'Source not found'}),404)
@app.post('/api/assessments')
def assessments_create():
    payload, error=assessment_payload(request.get_json(force=True),True)
    return error if error else jsonify(payload),201
@app.post('/api/assessments/what-if')
def what_if():
    payload, error=assessment_payload(request.get_json(force=True),False)
    return error if error else jsonify(payload)
@app.get('/api/assessments/<int:assessment_id>')
def assessment_detail(assessment_id):
    row=get_assessment(assessment_id)
    if not row: return jsonify({'error':'Assessment not found'}),404
    row['disclaimer']=DISCLAIMER
    row['recommended_action']=row['recommendation']
    row['recommendation_label']=row['recommendation'].replace('_',' ').title()
    row['dominant_risk']=max(row['posterior']['overall_risk'], key=row['posterior']['overall_risk'].get)
    row['policy']=decision_metadata()['utility_table']
    return jsonify(row)
@app.get('/api/history')
def history():
    source_id=request.args.get('source', type=int)
    return jsonify(list_assessments(int(request.args.get('limit',100)), source_id, request.args.get('from'), request.args.get('to')))
@app.get('/api/dashboard')
def dashboard():
    rows=list_assessments(250)
    counts={k:0 for k in ['low','moderate','high','critical']}
    actions={}
    for row in rows:
        risk=max(row['posterior']['overall_risk'],key=row['posterior']['overall_risk'].get); counts[risk]+=1; actions[row['recommendation']]=actions.get(row['recommendation'],0)+1
    return jsonify({'counts':counts,'samples_analyzed':len(rows),'actions':actions,'recent':rows[:6],'latest':rows[0] if rows else None})

@app.route('/', defaults={'path':''})
@app.route('/<path:path>')
def spa(path):
    if path.startswith('api/'): return jsonify({'error':'Not found'}),404
    target=FRONTEND / path
    if target.exists() and target.is_file(): return send_from_directory(FRONTEND,path)
    return send_from_directory(FRONTEND,'index.html')

if __name__=='__main__':
    app.run(host='0.0.0.0',port=int(__import__('os').environ.get('PORT',3000)))
