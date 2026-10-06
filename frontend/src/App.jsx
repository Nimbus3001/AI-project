import React, { useEffect, useRef, useState } from 'react';

const api = async (path, options) => {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || Object.values(data.errors || {}).join(' '));
  return data;
};

const labels = {
  ph: 'pH index midpoint',
  conductance: 'Specific conductance',
  dissolved_oxygen: 'Dissolved oxygen',
  temperature: 'Temperature',
};

const nav = [
  ['dashboard', 'Dashboard', '⌂', 'CORE'],
  ['analyze', 'Analyze water', '↗', 'CORE'],
  ['risk', 'Risk assessment', '◌', 'CORE'],
  ['decision', 'Decision support', '◆', 'CORE'],
  ['whatif', 'What-if analysis', '∿', 'CORE'],
  ['history', 'History', '◒', 'OBSERVATORY'],
  ['sources', 'Water sources', '⌖', 'OBSERVATORY'],
  ['network', 'Bayesian network', '⬡', 'MODEL'],
  ['influence', 'Decision network', '◇', 'MODEL'],
  ['about', 'Model / About', '?', 'MODEL'],
];

const emptyEvidence = { ph: 0.45, conductance: 0.58, dissolved_oxygen: 0.63, temperature: 0.62 };
const disclaimer = 'This system is an AI-based decision-support and educational tool. Its predictions do not replace laboratory testing, regulatory standards, or professional public-health assessment. A high-risk prediction indicates that further investigation or testing may be warranted.';

function pct(value) { return `${Math.round((value || 0) * 100)}%`; }
function actionLabel(value = '') { return value.replaceAll('_', ' '); }
function riskFrom(result) { return result?.dominant_risk || Object.entries(result?.posterior?.overall_risk || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'moderate'; }
function pageLabel(page) { return nav.find(([id]) => id === page)?.[1] || 'Dashboard'; }

function Brand({ processing = false }) {
  return <div className={`brand-lockup ${processing ? 'processing' : ''}`} aria-label="AQUA / BAYES water risk observatory">
    <div className="brand-sigil" aria-hidden="true">
      <svg viewBox="0 0 52 52" role="img">
        <circle className="sigil-orbit" cx="26" cy="26" r="19" />
        <path className="sigil-wave" d="M10 27c5-7 9 7 14 0s9-7 14 0 8 7 14 0" />
        <circle className="sigil-node n-one" cx="16" cy="21" r="2.2" />
        <circle className="sigil-node n-two" cx="28" cy="27" r="2.2" />
        <circle className="sigil-node n-three" cx="40" cy="21" r="2.2" />
      </svg>
    </div>
    <div>
      <div className="wordmark">AQUA <span>/</span> BAYES</div>
      <div className="brand-subtitle">WATER RISK OBSERVATORY</div>
    </div>
  </div>;
}

function CustomCursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    let tx = -100; let ty = -100; let x = tx; let y = ty; let raf;
    const move = (event) => { tx = event.clientX; ty = event.clientY; };
    const hover = (event) => document.body.classList.toggle('cursor-hot', Boolean(event.target.closest('button,a,input,select,textarea,[data-cursor]')));
    const tick = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      if (dot.current) dot.current.style.transform = `translate3d(${tx}px,${ty}px,0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${x}px,${y}px,0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseover', hover, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseover', hover); cancelAnimationFrame(raf); document.body.classList.remove('cursor-hot'); };
  }, []);
  return <><span className="cursor-dot" ref={dot} aria-hidden="true" /><span className="cursor-ring" ref={ring} aria-hidden="true" /></>;
}

function RadialNavigation({ page, navigate }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  const handleNavigate = (id) => { navigate(id); setOpen(false); };
  return <div className={`radial-nav ${open ? 'open' : ''}`}>
    <div className="radial-arc" aria-hidden="true" />
    <div className="radial-items" aria-label="Application navigation">
      {nav.map(([id, label, glyph, group], index) => {
        const angle = 10 + (index * 160) / (nav.length - 1);
        const radius = window.innerWidth < 700 ? 142 : 238;
        const x = Math.cos((angle * Math.PI) / 180) * radius;
        const y = -Math.sin((angle * Math.PI) / 180) * radius;
        return <button
          key={id}
          data-cursor
          className={`radial-item ${page === id ? 'active' : ''}`}
          style={{ '--x': `${x}px`, '--y': `${y}px`, '--rotate': `${(90 - angle) * 0.16}deg`, '--delay': `${open ? index * 34 : (nav.length - index) * 18}ms` }}
          onClick={() => handleNavigate(id)}
          tabIndex={open ? 0 : -1}
          aria-current={page === id ? 'page' : undefined}
          aria-label={`${label} — ${group.toLowerCase()}`}
        ><span className="radial-glyph">{glyph}</span><span className="radial-label">{label}</span><span className="radial-group">{group}</span></button>;
      })}
    </div>
    <button className="radial-trigger" data-cursor onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? 'Close navigation wheel' : 'Open navigation wheel'}>
      <span className="trigger-core"><span>∿</span></span><span className="trigger-caption">{open ? 'CLOSE' : 'AQUA'}</span>
    </button>
  </div>;
}

function Shell({ page, navigate, children, processing = false }) {
  return <div className="app-shell">
    <CustomCursor />
    <div className="instrument-background" aria-hidden="true"><span className="coord coord-one">N 33° 45′ / W 84° 23′</span><span className="coord coord-two">OBS. 37 · DATASET 733</span><span className="contour contour-one" /><span className="contour contour-two" /></div>
    <header className="instrument-header">
      <Brand processing={processing} />
      <div className="header-center"><span className="header-kicker">FIELD DECISION SYSTEM</span><span className="header-route">/ {pageLabel(page)}</span></div>
      <div className="header-meta"><span className="live-indicator"><i /> MODEL ONLINE</span><span className="header-date">{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</span></div>
    </header>
    <main className="instrument-main"><div key={page} className="page-stage">{children}</div></main>
    <RadialNavigation page={page} navigate={navigate} />
  </div>;
}

function PageHeading({ kicker, title, copy, action }) {
  return <div className="page-heading"><div><span className="section-kicker">{kicker}</span><h1>{title}</h1>{copy && <p>{copy}</p>}</div>{action}</div>;
}

function StatusLine({ label, value = 'READY', tone = 'good' }) { return <div className="status-line"><span className={`status-pulse ${tone}`} /><span>{label}</span><b>{value}</b></div>; }
function RiskBadge({ risk }) { return <span className={`risk-badge ${risk || 'moderate'}`}><i />{risk || 'moderate'}</span>; }

function Ring({ value = 0, label, color = '#67d0b8', size = 128 }) {
  const radius = 48; const circumference = 2 * Math.PI * radius; const offset = circumference * (1 - Math.max(0, Math.min(1, value)));
  return <div className="prob-ring" style={{ width: size, height: size }}><svg viewBox="0 0 120 120" aria-label={`${label}: ${pct(value)}`}><circle className="ring-track" cx="60" cy="60" r={radius} /><circle className="ring-value" cx="60" cy="60" r={radius} style={{ stroke: color, strokeDasharray: circumference, strokeDashoffset: offset }} /><text x="60" y="57" textAnchor="middle">{pct(value)}</text><text className="ring-label" x="60" y="73" textAnchor="middle">{label}</text></svg></div>;
}

function RiskDistribution({ dist, title = 'Risk distribution' }) {
  const colors = { low: '#65c6af', moderate: '#d4ae5e', high: '#d9854d', critical: '#c76660' };
  return <section className="instrument-panel distribution-panel"><div className="panel-label-row"><span className="section-kicker">POSTERIOR / PROBABILITY</span><span className="mono-note">Σ 1.000</span></div><h2>{title}</h2><div className="distribution-list">{['low','moderate','high','critical'].filter((key) => key in (dist || {})).map((key) => [key, dist[key]]).map(([key, value]) => <div className="distribution-row" key={key}><div className="distribution-name"><span className="risk-mark" style={{ background: colors[key] }} />{key}<b>{pct(value)}</b></div><div className="distribution-track"><span style={{ width: `${Math.max(value * 100, 1)}%`, background: colors[key] }} /></div></div>)}</div></section>;
}

function UtilityPanel({ utilities, recommendation }) {
  return <section className="instrument-panel utility-panel"><div className="panel-label-row"><span className="section-kicker">DECISION NETWORK / UTILITY</span><span className="mono-note">ARG MAX</span></div><h2>Expected utility</h2><div className="utility-table">{Object.entries(utilities || {}).map(([key, value]) => <div className={`utility-row ${key === recommendation ? 'chosen' : ''}`} key={key}><span>{actionLabel(key)}</span><b>{value > 0 ? '+' : ''}{Number(value).toFixed(2)}</b>{key === recommendation && <i>SELECTED</i>}</div>)}</div>{recommendation && <div className="recommendation-line"><span>RECOMMENDED ACTION</span><strong>{actionLabel(recommendation)}</strong></div>}</section>;
}

function ProcessTrail({ active = 0 }) {
  const steps = ['Evidence', 'Observation', 'Bayesian core', 'Posterior', 'Utility', 'Decision'];
  return <div className="process-trail" aria-label="Inference process">{steps.map((step, index) => <React.Fragment key={step}><div className={`process-step ${index <= active ? 'on' : ''}`}><span>{String(index + 1).padStart(2, '0')}</span><b>{step}</b></div>{index < steps.length - 1 && <div className={`process-connector ${index < active ? 'on' : ''}`} />}</React.Fragment>)}</div>;
}

function EvidenceFactors({ result }) {
  return <section className="instrument-panel factors-panel"><div className="panel-label-row"><span className="section-kicker">EVIDENCE / CONTRIBUTION TRACE</span><span className="mono-note">COUNTERFACTUAL</span></div><h2>Signals behind the posterior</h2><p className="panel-copy">Each factor is ranked against a neutral counterfactual through the same inference path. It is an evidence signal, not a causal diagnosis.</p><div className="factor-list">{(result?.factors || []).map((factor, index) => <div className="factor-row" key={factor.feature}><span className="factor-index">0{index + 1}</span><div className="factor-copy"><b>{factor.label}</b><small>{Number(factor.value).toFixed(3)} normalized · {factor.state} state</small></div><div className="factor-bar"><span style={{ width: `${Math.min(100, Math.round((factor.contribution || 0) * 100))}%` }} /></div><strong>{Math.round((factor.contribution || 0) * 100)}%</strong></div>)}</div></section>;
}

function Dashboard({ dashboard, navigate }) {
  const latest = dashboard?.latest; const risk = riskFrom(latest); const counts = dashboard?.counts || {};
  return <div className="page-content dashboard-page">
    <PageHeading kicker="OBSERVATORY / SYSTEM STATE" title="Evidence before certainty." copy="A live monitoring console for turning uncertain water measurements into defensible next steps." action={<button className="instrument-button" data-cursor onClick={() => navigate('analyze')}><span>RUN NEW ASSESSMENT</span><b>↗</b></button>} />
    <section className="system-console"><div className="console-copy"><span className="section-kicker">CURRENT SYSTEM STATE</span><h2>{latest ? <>Water quality is <em>{risk}</em></> : <>Awaiting water sample</>}</h2><p>{latest ? `Latest persisted assessment from ${latest.source_name || 'field source'} · ${latest.sample_date}` : 'Submit supported evidence to activate the Bayesian inference and decision chain.'}</p><div className="status-stack"><StatusLine label="Model service" value="ONLINE" /><StatusLine label="Bayesian core" value="READY" /><StatusLine label="Decision network" value="READY" /></div></div><div className="console-gauge">{latest ? <><Ring value={latest.posterior.overall_risk[risk]} label={`${risk} risk`} color={risk === 'critical' ? '#c76660' : risk === 'high' ? '#d9854d' : '#67d0b8'} size={210} /><span className="gauge-caption">DOMINANT POSTERIOR</span></> : <div className="awaiting-mark"><span>∿</span><small>NO EVIDENCE</small></div>}</div><div className="console-readout"><span className="readout-code">AQB / 733 / 037</span><span className="readout-line" /><span className="readout-copy">Dataset-backed<br />inference only</span></div></section>
    <div className="data-rail">{[['SAMPLES ANALYZED', dashboard?.samples_analyzed || 0], ['LOW', counts.low || 0], ['MODERATE', counts.moderate || 0], ['HIGH', counts.high || 0], ['CRITICAL', counts.critical || 0]].map(([key, value]) => <div key={key} className="data-rail-item"><span>{key}</span><b>{value}</b></div>)}</div>
    <div className="dashboard-grid"><div><RiskDistribution dist={latest?.posterior?.overall_risk} /><div className="console-divider"><span>RECENT FIELD RECORDS</span><i /></div><section className="instrument-panel recent-panel">{(dashboard?.recent || []).length ? dashboard.recent.map((row) => <div className="recent-row" key={row.id}><span className="recent-date">{row.sample_date}</span><span className="recent-source">{row.source_name || 'Field source'}</span><RiskBadge risk={riskFrom(row)} /><b>{actionLabel(row.recommendation)}</b></div>) : <div className="empty-state"><span>∿</span><p>No persisted assessments yet.</p><button className="text-link" onClick={() => navigate('analyze')}>Open analysis console →</button></div>}</section></div><aside className="dashboard-aside"><section className="instrument-panel trace-panel"><div className="panel-label-row"><span className="section-kicker">INFERENCE PIPELINE</span><span className="mono-note">LIVE</span></div><h2>From sample to action</h2><ProcessTrail active={latest ? 5 : 1} /><p className="panel-copy">Observed measurements are discretized, passed through the Bayesian graph, and weighted against explicit utility assumptions.</p></section><section className="instrument-panel field-note"><span className="section-kicker">SDG 6 / CONTEXT</span><h2>Visibility supports safer decisions.</h2><p>Aligned with SDG 6.1 and 6.3 by supporting transparent water-quality monitoring and early identification of potential concerns.</p><button className="text-link" onClick={() => navigate('about')}>Read methodology →</button></section></aside></div>
  </div>;
}

function EvidenceForm({ onResult, whatIf = false, initial = emptyEvidence }) {
  const [evidence, setEvidence] = useState(initial); const [sources, setSources] = useState([]); const [sourceId, setSourceId] = useState(''); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { api('/api/sources').then(setSources).catch(() => {}); }, []);
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { const result = await api(whatIf ? '/api/assessments/what-if' : '/api/assessments', { method: 'POST', body: JSON.stringify({ evidence, source_id: sourceId ? Number(sourceId) : null, sample_date: date }) }); onResult(result); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <form className="instrument-panel evidence-form" onSubmit={submit}><div className="form-header"><div><span className="section-kicker">{whatIf ? 'SCENARIO LAB / UNPERSISTED' : 'INPUT CONSOLE / SUPPORTED FEATURES'}</span><h2>{whatIf ? 'Change evidence. Watch belief redistribute.' : 'Enter water evidence.'}</h2><p>Values are source-normalized indices from the UCI/USGS-derived archive.</p></div><span className="unit-stamp">0–1 / INDEX</span></div><div className="parameter-grid">{Object.entries(labels).map(([key, label]) => <label key={key} className="parameter-field"><span>{label}</span><div className="field-control"><input type="number" min="0" max="1" step="0.001" value={evidence[key]} onChange={(event) => setEvidence({ ...evidence, [key]: Number(event.target.value) })} /><b>INDEX</b></div><small>Quantile state assigned by model metadata.</small></label>)}</div>{!whatIf && <div className="parameter-grid secondary-fields"><label className="parameter-field"><span>Water source</span><select value={sourceId} onChange={(event) => setSourceId(event.target.value)}><option value="">Select a source</option>{sources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label><label className="parameter-field"><span>Sample date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>}{busy && <div className="inference-loading"><span className="loading-beacon">∿</span><div><b>Redistributing probability</b><small>Evidence → Bayesian core → posterior → utility</small></div></div>}{error && <div className="form-error">{error}</div>}<button className="instrument-button submit-button" data-cursor disabled={busy}><span>{busy ? 'RUNNING EXACT INFERENCE…' : whatIf ? 'RECALCULATE SCENARIO' : 'RUN BAYESIAN ASSESSMENT'}</span><b>↗</b></button></form>;
}

function ResultView({ result, navigate }) {
  if (!result) return <section className="instrument-panel empty-state"><span>∿</span><h2>No assessment loaded.</h2><p>Run an assessment to inspect the posterior and decision chain.</p><button className="instrument-button" onClick={() => navigate('analyze')}><span>OPEN ANALYSIS CONSOLE</span><b>↗</b></button></section>;
  const risk = riskFrom(result); const recommendation = result.recommendation; const resultDisclaimer = result.disclaimer || disclaimer;
  return <div className="result-layout"><section className="result-banner"><div><span className="section-kicker">POSTERIOR ASSESSMENT / {result.sample_date}</span><h2><RiskBadge risk={risk} /> {actionLabel(result.recommendation_label || recommendation)}</h2><p>Action selected by highest expected utility. The posterior remains probabilistic, not a legal safety certification.</p></div><div className="result-score"><strong>{pct(result.posterior.overall_risk[risk])}</strong><span>{risk} risk probability</span></div></section><ProcessTrail active={5} /><div className="result-grid"><div><section className="posterior-constellation instrument-panel"><div className="panel-label-row"><span className="section-kicker">POSTERIOR / CONTAMINATION BELIEFS</span><span className="mono-note">MODEL V1</span></div><h2>Probability is the result.</h2><div className="ring-row"><Ring value={result.posterior.chemical.high} label="chemical" color="#d9854d" /><Ring value={result.posterior.biological.high} label="biological" color="#65c6af" /><Ring value={result.posterior.overall_risk[risk]} label={risk} color={risk === 'critical' ? '#c76660' : '#d4ae5e'} /></div></section><EvidenceFactors result={result} /></div><aside><RiskDistribution dist={result.posterior.overall_risk} title="Overall quality risk" /><UtilityPanel utilities={result.utilities} recommendation={recommendation} /></aside></div><div className="result-subgrid"><RiskDistribution dist={result.posterior.chemical} title="Chemical contamination" /><RiskDistribution dist={result.posterior.biological} title="Biological contamination" /></div><div className="disclaimer"><span>SAFETY / SCOPE</span>{resultDisclaimer}</div></div>;
}

function Analyze({ setResult, navigate }) { return <div className="page-content"><PageHeading kicker="ANALYSIS / EVIDENCE → POSTERIOR" title="Make uncertainty explicit." copy="The four supported source features are kept in their normalized units. Missing nitrate, TDS, and turbidity values are not invented." /><EvidenceForm onResult={(result) => { setResult(result); navigate('risk'); }} /><ProcessTrail active={1} /></div>; }
function WhatIf({ result, setResult }) { return <div className="page-content"><PageHeading kicker="SCENARIO LAB / LIVE RECOMPUTATION" title="What changes if the evidence changes?" copy="Run the same Bayesian and expected-utility chain without persisting this scenario." /><EvidenceForm whatIf initial={result?.evidence || emptyEvidence} onResult={setResult} />{result && <ResultView result={result} />}</div>; }
function RiskPage({ result, navigate }) { return <div className="page-content"><PageHeading kicker="RISK ASSESSMENT / POSTERIOR" title="What does the model believe?" copy="Inspect the full distribution over contamination and overall quality risk." /><ResultView result={result} navigate={navigate} /></div>; }
function DecisionPage({ result, navigate }) { return <div className="page-content"><PageHeading kicker="DECISION SUPPORT / EXPECTED UTILITY" title="Prediction is not the decision." copy="Compare the action policy against the posterior risk distribution." /><ResultView result={result} navigate={navigate} /></div>; }

function History({ history, setResult, navigate }) {
  const [sourceFilter, setSourceFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const sources = [...new Map(history.map((row) => [row.source_id || 'none', row.source_name || 'Field source'])).entries()];
  const filtered = history.filter((row) => (!sourceFilter || String(row.source_id || 'none') === sourceFilter) && (!fromDate || row.sample_date >= fromDate) && (!toDate || row.sample_date <= toDate));
  const trendRows = filtered.slice().reverse().slice(-14);
  return <div className="page-content"><PageHeading kicker="HISTORY / PERSISTED ASSESSMENTS" title="A traceable record of decisions." copy="Every row retains evidence, posterior probabilities, expected utilities, recommendation, timestamp, and model version." /><div className="history-insights"><section className="instrument-panel trend-panel"><div className="panel-label-row"><span className="section-kicker">DOMINANT POSTERIOR / RECENT RECORDS</span><span className="mono-note">ACTUAL SAVED DATA</span></div><h2>Risk probability over time.</h2><div className="trend-bars">{trendRows.length ? trendRows.map((row) => { const risk = riskFrom(row); const value = row.posterior.overall_risk[risk] || 0; return <div className="trend-column" key={row.id} title={`${row.sample_date}: ${risk} ${pct(value)}`}><span className={`trend-bar ${risk}`} style={{ height: `${Math.max(8, value * 100)}%` }} /><small>{row.sample_date.slice(5)}</small></div>; }) : <div className="empty-state"><span>∿</span><p>Run an assessment to populate the actual trend.</p></div>}</div></section><section className="instrument-panel filter-panel"><div className="panel-label-row"><span className="section-kicker">FILTER / FIELD RECORDS</span><span className="mono-note">{filtered.length} MATCHES</span></div><label className="parameter-field"><span>Water source</span><select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}><option value="">All sources</option>{sources.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><div className="filter-dates"><label className="parameter-field"><span>From</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label className="parameter-field"><span>To</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label></div><button className="text-link" onClick={() => { setSourceFilter(''); setFromDate(''); setToDate(''); }}>Clear filters →</button></section></div><section className="instrument-panel table-panel"><div className="table-head"><span className="section-kicker">FIELD RECORDS</span><span className="mono-note">{filtered.length} RECORDS</span></div><div className="history-table"><div className="history-head"><span>DATE</span><span>SOURCE</span><span>RISK</span><span>ACTION</span><span>EVIDENCE / PH · COND · DO · TEMP</span></div>{filtered.map((row) => <button className="history-row" key={row.id} onClick={() => { setResult(row); navigate('risk'); }}><span>{row.sample_date}</span><span>{row.source_name || 'Field source'}</span><span><RiskBadge risk={riskFrom(row)} /></span><span>{actionLabel(row.recommendation)}</span><span className="mono-data">{Object.values(row.evidence).map((value) => Number(value).toFixed(2)).join(' · ')}</span></button>)}{!filtered.length && <div className="empty-state"><span>∿</span><p>No saved assessments match the selected filters.</p></div>}</div></section></div>;
}

function Sources() { const [sources, setSources] = useState([]); const [name, setName] = useState(''); const [location, setLocation] = useState(''); const load = () => api('/api/sources').then(setSources); useEffect(load, []); const add = async (event) => { event.preventDefault(); if (!name) return; await api('/api/sources', { method: 'POST', body: JSON.stringify({ name, location }) }); setName(''); setLocation(''); load(); }; return <div className="page-content"><PageHeading kicker="SOURCES / FIELD CONTEXT" title="Keep locations attached to evidence." copy="Source metadata is descriptive context. It does not imply geographic safety certification." /><div className="split-layout"><form className="instrument-panel source-form" onSubmit={add}><span className="section-kicker">SOURCE REGISTRY / NEW</span><h2>Register a monitored source.</h2><label className="parameter-field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Community well A" /></label><label className="parameter-field"><span>Location</span><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="District or region" /></label><button className="instrument-button" data-cursor><span>ADD SOURCE</span><b>+</b></button></form><section className="instrument-panel source-list"><span className="section-kicker">REGISTERED SOURCES</span>{sources.map((source) => <div className="source-row" key={source.id}><span className="source-glyph">⌖</span><div><b>{source.name}</b><small>{source.location || 'Location not specified'}</small></div><span className="mono-note">ID {String(source.id).padStart(3, '0')}</span></div>)}</section></div></div>; }

function Network({ influence = false }) { const [data, setData] = useState(null); useEffect(() => { api(influence ? '/api/model/decision-network' : '/api/model/network').then(setData); }, [influence]); if (!data) return <div className="page-content"><section className="instrument-panel">Loading model graph…</section></div>; return <div className="page-content"><PageHeading kicker={influence ? 'INFLUENCE DIAGRAM / DECISION LOGIC' : 'BAYESIAN NETWORK / GRAPH + CPTS'} title={influence ? 'Prediction is not the decision.' : 'Inspect the graph behind every result.'} copy={influence ? 'Chance nodes feed a decision node and a utility node. The recommendation is the highest expected utility.' : 'This diagram is rendered from the same node and edge metadata used by the live inference model.'} /><section className="instrument-panel network-panel"><div className="graph-stage">{influence ? <><div className="graph-node chance center-left">Overall risk<small>CHANCE</small></div><div className="graph-node decision center">ACTION<small>DECISION</small></div><div className="graph-node utility center-right">Expected utility<small>UTILITY</small></div><span className="graph-arrow arrow-one">→</span><span className="graph-arrow arrow-two">→</span></> : data.nodes.map((node, index) => <React.Fragment key={node.id}><div className={`graph-node ${node.kind}`} style={{ left: `${12 + (index % 4) * 25}%`, top: `${18 + Math.floor(index / 4) * 34}%` }}>{node.label}<small>{node.kind} · {node.states.join(' / ')}</small></div></React.Fragment>)}</div></section><section className="instrument-panel model-note-panel"><div className="panel-label-row"><span className="section-kicker">MODEL NOTES</span><span className="mono-note">INSPECTABLE</span></div><p>{influence ? data.note : 'Observed-node priors use smoothed empirical frequencies. Derived-node CPTs are transparent policy assumptions; posterior inference is exact and live.'}</p>{!influence && <div className="threshold-list">{Object.entries(data.thresholds || {}).map(([key, value]) => <div key={key}><b>{labels[key]}</b><span>LOW ≤ {Number(value.low_max).toFixed(3)} · MODERATE ≤ {Number(value.moderate_max).toFixed(3)}</span></div>)}</div>}</section></div>; }

function About() { return <div className="page-content"><PageHeading kicker="MODEL / ABOUT" title="A transparent water-risk observatory." copy="Designed for academic demonstration and environmental monitoring workflows—not legal, medical, or regulatory certification." /><div className="about-layout"><section className="instrument-panel about-main"><span className="section-kicker">WHY BAYESIAN?</span><h2>Water evidence is incomplete and uncertain.</h2><p>Bayesian inference keeps a distribution over possible conditions instead of collapsing a sample into an unjustified yes/no label. The graph links measured states to contamination and overall-risk beliefs.</p><span className="section-kicker">WHY EXPECTED UTILITY?</span><h2>Prediction and action are different problems.</h2><p>The decision network combines uncertain risk with configurable consequences and costs. All utilities are policy assumptions, not measured medical, regulatory, or economic facts.</p><div className="method-flow"><b>Water data</b><i>→</i><b>Preprocess</b><i>→</i><b>Discretize</b><i>→</i><b>Bayes</b><i>→</i><b>Posterior</b><i>→</i><b>Utility</b><i>→</i><b>Action</b></div></section><aside className="about-side"><section className="instrument-panel"><span className="section-kicker">DATASET PROVENANCE</span><h2>UCI Water Quality Prediction.</h2><p>705 daily samples derived from 37 Georgia monitoring stations and 11 source indices. This app uses pH midpoint, specific conductance, dissolved oxygen, and temperature on the source-normalized scale.</p><span className="mono-note">CC BY 4.0 · DATASET 733 · DOI 10.1145/3339823</span></section><section className="instrument-panel"><span className="section-kicker">SDG 6 / ALIGNMENT</span><h2>Monitor first. Decide transparently.</h2><p>This is a decision-support tool aligned with SDG 6 objectives, supporting SDG 6.1 safe-water visibility and SDG 6.3 water-quality monitoring. It does not itself achieve SDG 6.</p></section></aside></div><div className="disclaimer"><span>SAFETY / SCOPE</span>{disclaimer}</div></div>; }

export default function App() {
  const initialPage = window.location.pathname === '/' ? 'dashboard' : window.location.pathname.slice(1);
  const [page, setPageState] = useState(nav.some(([id]) => id === initialPage) ? initialPage : 'dashboard');
  const [dashboard, setDashboard] = useState({}); const [history, setHistory] = useState([]); const [result, setResult] = useState(null);
  const navigate = (next) => { setPageState(next); window.history.pushState({}, '', next === 'dashboard' ? '/' : `/${next}`); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  useEffect(() => { const onPop = () => { const next = window.location.pathname === '/' ? 'dashboard' : window.location.pathname.slice(1); setPageState(nav.some(([id]) => id === next) ? next : 'dashboard'); }; window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  useEffect(() => { api('/api/dashboard').then(setDashboard).catch(() => {}); api('/api/history').then(setHistory).catch(() => {}); }, [page, result]);
  let content;
  if (page === 'dashboard') content = <Dashboard dashboard={dashboard} navigate={navigate} />;
  else if (page === 'analyze') content = <Analyze setResult={setResult} navigate={navigate} />;
  else if (page === 'risk') content = <RiskPage result={result} navigate={navigate} />;
  else if (page === 'decision') content = <DecisionPage result={result} navigate={navigate} />;
  else if (page === 'whatif') content = <WhatIf result={result} setResult={setResult} />;
  else if (page === 'history') content = <History history={history} setResult={setResult} navigate={navigate} />;
  else if (page === 'sources') content = <Sources />;
  else if (page === 'network') content = <Network />;
  else if (page === 'influence') content = <Network influence />;
  else content = <About />;
  return <Shell page={page} navigate={navigate} processing={false}>{content}</Shell>;
}
