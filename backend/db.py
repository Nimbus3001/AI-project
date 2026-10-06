from pathlib import Path
import json
import sqlite3
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / 'water_quality.sqlite3'

def conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c

def init_db():
    c = conn()
    c.executescript('''
    CREATE TABLE IF NOT EXISTS water_sources (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, location TEXT, description TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS assessments (id INTEGER PRIMARY KEY AUTOINCREMENT, source_id INTEGER, sample_date TEXT NOT NULL, evidence_json TEXT NOT NULL, states_json TEXT NOT NULL, posterior_json TEXT NOT NULL, utilities_json TEXT NOT NULL, recommendation TEXT NOT NULL, factors_json TEXT NOT NULL, model_version TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(source_id) REFERENCES water_sources(id));
    ''')
    if c.execute('SELECT COUNT(*) FROM water_sources').fetchone()[0] == 0:
        now = datetime.now(timezone.utc).isoformat()
        c.executemany('INSERT INTO water_sources(name,location,description,created_at) VALUES (?,?,?,?)', [
            ('Network median demo', 'Georgia, USA', 'Daily median across 37 stations in the UCI/USGS-derived source archive.', now),
            ('Community well A', 'Demo source', 'User-managed source for new field observations.', now),
        ])
    c.commit(); c.close()

def create_assessment(payload):
    c = conn(); now = datetime.now(timezone.utc).isoformat()
    cur = c.execute('INSERT INTO assessments(source_id,sample_date,evidence_json,states_json,posterior_json,utilities_json,recommendation,factors_json,model_version,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', (payload.get('source_id'), payload['sample_date'], json.dumps(payload['evidence']), json.dumps(payload['states']), json.dumps(payload['posterior']), json.dumps(payload['utilities']), payload['recommendation'], json.dumps(payload['factors']), payload.get('model_version','bayeswater-v1'), now))
    c.commit(); assessment_id = cur.lastrowid; c.close(); return assessment_id

def row_json(row):
    if not row: return None
    d = dict(row)
    for k in ['evidence_json','states_json','posterior_json','utilities_json','factors_json']:
        d[k[:-5]] = json.loads(d.pop(k))
    return d

def list_assessments(limit=100, source_id=None, date_from=None, date_to=None):
    c=conn(); clauses=[]; params=[]
    if source_id:
        clauses.append('a.source_id=?'); params.append(source_id)
    if date_from:
        clauses.append('a.sample_date>=?'); params.append(date_from)
    if date_to:
        clauses.append('a.sample_date<=?'); params.append(date_to)
    where = (' WHERE ' + ' AND '.join(clauses)) if clauses else ''
    params.append(limit)
    rows=c.execute(f'SELECT a.*, s.name AS source_name FROM assessments a LEFT JOIN water_sources s ON s.id=a.source_id{where} ORDER BY a.created_at DESC LIMIT ?', params).fetchall(); c.close(); return [row_json(r) for r in rows]

def get_assessment(assessment_id):
    c=conn(); row=c.execute('SELECT a.*, s.name AS source_name FROM assessments a LEFT JOIN water_sources s ON s.id=a.source_id WHERE a.id=?',(assessment_id,)).fetchone(); c.close(); return row_json(row)

def list_sources():
    c=conn(); rows=[dict(r) for r in c.execute('SELECT * FROM water_sources ORDER BY name')]; c.close(); return rows

def add_source(data):
    c=conn(); now=datetime.now(timezone.utc).isoformat(); cur=c.execute('INSERT INTO water_sources(name,location,description,created_at) VALUES (?,?,?,?)',(data['name'],data.get('location',''),data.get('description',''),now)); c.commit(); ident=cur.lastrowid; c.close(); return ident

def update_source(source_id, data):
    c=conn(); current=c.execute('SELECT * FROM water_sources WHERE id=?',(source_id,)).fetchone()
    if not current:
        c.close(); return None
    c.execute('UPDATE water_sources SET name=?, location=?, description=? WHERE id=?', (data.get('name', current['name']), data.get('location', current['location']), data.get('description', current['description']), source_id))
    c.commit(); row=c.execute('SELECT * FROM water_sources WHERE id=?',(source_id,)).fetchone(); c.close(); return dict(row)
