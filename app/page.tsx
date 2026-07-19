'use client';

import { useMemo, useState } from 'react';
import catalogue from './catalogue.json';

type Response = 'Fully Meets' | 'Configuration' | 'Customization' | 'Not Available';
const score: Record<Response, number> = { 'Fully Meets': 2, Configuration: 2, Customization: 1, 'Not Available': 0 };

export default function Home() {
  const [tab, setTab] = useState<'overview' | 'requirements' | 'evidence'>('overview');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [answers, setAnswers] = useState<Record<string, Response>>({
    'ACSA-FR-UC01-REQ001': 'Fully Meets', 'ACSA-FR-UC01-REQ002': 'Fully Meets', 'ACSA-FR-UC01-REQ003': 'Configuration', 'ACSA-FR-UC01-REQ004': 'Customization'
  });
  const items = useMemo(() => catalogue.filter(r => (filter === 'All' || r.type === filter) && `${r.id} ${r.name} ${r.category}`.toLowerCase().includes(search.toLowerCase())), [filter, search]);
  const answered = Object.keys(answers).length;
  const currentScore = Object.entries(answers).reduce((sum, [id, a]) => sum + score[a] * (catalogue.find(r => r.id === id)?.priority === 'Must' ? 2 : catalogue.find(r => r.id === id)?.priority === 'Should' ? 1.5 : 1), 0);
  return <main>
    <aside>
      <div className="brand"><span className="mark">A</span><span>ACSA <b>Evaluation</b></span></div>
      <div className="workspace">WORKSPACE</div>
      <nav>
        <button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}><i>⊞</i> Overview</button>
        <button className={tab==='requirements'?'active':''} onClick={()=>setTab('requirements')}><i>☷</i> Requirements <em>{catalogue.length}</em></button>
        <button className={tab==='evidence'?'active':''} onClick={()=>setTab('evidence')}><i>⌁</i> Evidence</button>
      </nav>
      <div className="sideBottom"><div className="help">? <span>Need support?<small>Read the assessment guide</small></span></div><div className="profile"><div className="avatar">AM</div><span>Amara Mensah<small>Assessment lead</small></span><b>⌄</b></div></div>
    </aside>
    <section className="content">
      <header><div className="crumb">Assessments <span>/</span> CIVIL REGISTRY 2.4</div><div className="headerActions"><button className="plain">Save & exit</button><button className="submit">Submit for review <span>→</span></button></div></header>
      <div className="hero"><div><div className="eyebrow">ACSA CORE REQUIREMENTS SCREENING</div><h1>Civil Registry 2.4</h1><p>Republic of Ghana · Started 18 July 2026</p></div><div className="status"><span></span> Draft assessment</div></div>
      {tab === 'overview' && <>
        <div className="progressHead"><div><b>Assessment progress</b><span>{answered} of {catalogue.length} requirements assessed</span></div><strong>{Math.round(answered/catalogue.length*100)}%</strong></div>
        <div className="track"><div style={{width:`${answered/catalogue.length*100}%`}}></div></div>
        <div className="grid">
          <article className="score"><div className="label">CURRENT WEIGHTED SCORE</div><div><strong>{currentScore.toFixed(1)}</strong><span> / 1,084.5</span></div><p>Based on {answered} completed responses</p><div className="mini"><i style={{height:'76%'}}></i><i style={{height:'58%'}}></i><i style={{height:'25%'}}></i><i style={{height:'12%'}}></i></div></article>
          <article className="coverage"><div className="label">RESPONSE COVERAGE</div><div className="donut"><b>{answered}<small>answered</small></b></div><p>{catalogue.length-answered} requirements remaining</p></article>
          <article className="next"><div className="label">NEXT UP</div><h3>Continue your assessment</h3><p>Declaration<br/><span>Requirement 5 of 24</span></p><button onClick={()=>setTab('requirements')}>Resume assessment <b>→</b></button></article>
        </div>
        <div className="sectionTitle"><div><h2>Assessment areas</h2><p>Complete every requirement to submit for ACSA review.</p></div><button className="view" onClick={()=>setTab('requirements')}>View all requirements →</button></div>
        <div className="areas">{['Declaration','Registration','Certification','Identity management'].map((name,i)=>{const counts=[24,32,18,27]; return <div className="area" key={name}><div className="areaIcon">{['⌁','◫','▣','◇'][i]}</div><div><b>{name}</b><span>{i===0?4:0} of {counts[i]} completed</span></div><div className="areaTrack"><i style={{width:`${i===0?17:0}%`}}></i></div><button onClick={()=>setTab('requirements')}>→</button></div>})}</div>
      </>}
      {tab === 'requirements' && <div className="requirements"><div className="reqHead"><div><h2>Requirements catalogue</h2><p>Record the solution’s current capability and supporting evidence.</p></div><div className="filters"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search requirements"/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Functional</option><option>Non-functional</option></select></div></div><div className="tableHead"><span>REQUIREMENT</span><span>PRIORITY</span><span>COMPLIANCE</span></div>{items.slice(0,16).map((r)=><div className="req" key={r.id}><div><small>{r.id}</small><b>{r.name}</b><p>{r.description}</p></div><span className={'priority '+r.priority.toLowerCase()}>{r.priority}</span><select value={answers[r.id] || ''} onChange={e=>setAnswers({...answers,[r.id]:e.target.value as Response})}><option value="">Select response</option>{Object.keys(score).map(x=><option key={x}>{x}</option>)}</select></div>)}</div>}
      {tab === 'evidence' && <div className="evidence"><div className="emptyIcon">↑</div><h2>Evidence library</h2><p>Attach supporting documents, screenshots, or links to substantiate your responses.</p><button className="upload">Upload evidence</button><div className="hint">Evidence is private to your organisation and assigned ACSA reviewers.</div></div>}
    </section>
  </main>
}
