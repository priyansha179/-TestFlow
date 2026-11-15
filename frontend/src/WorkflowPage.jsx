import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "./api";
import { useAuth } from "./AuthContext";

const tabs = ["Plans", "Runs", "Defects", "Reports", "Activity"];
const blankPlan = { name: "", objective: "", scope: "", status: "Draft", start_date: "", end_date: "", test_case_ids: [] };
const blankDefect = { title: "", description: "", test_case_id: "", test_run_id: "", steps_to_reproduce: "", expected_result: "", actual_result: "", severity: "Medium", priority: "Medium", status: "Open", assigned_to: "" };

export default function WorkflowPage() {
  const { projectId } = useParams();
  const { session } = useAuth();
  const [project, setProject] = useState(null);
  const [cases, setCases] = useState([]);
  const [plans, setPlans] = useState([]);
  const [runs, setRuns] = useState([]);
  const [defects, setDefects] = useState([]);
  const [activity, setActivity] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState("Plans");
  const [selectedRun, setSelectedRun] = useState(null);
  const [planForm, setPlanForm] = useState(blankPlan);
  const [runForm, setRunForm] = useState({ name: "", plan_id: "", environment: "Staging" });
  const [defectForm, setDefectForm] = useState(blankDefect);
  const [editingDefect, setEditingDefect] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showRunForm, setShowRunForm] = useState(false);
  const [showDefectForm, setShowDefectForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [projects, testCases, planRows, runRows, defectRows, activityRows, summaryData] = await Promise.all([
        api.projects(session.token), api.testCases(projectId, session.token),
        api.testPlans(projectId, session.token), api.testRuns(projectId, session.token),
        api.defects(projectId, session.token), api.activity(projectId, session.token),
        api.dashboardSummary(session.token)
      ]);
      setProject(projects.find(item => String(item.id) === String(projectId)) || null);
      setCases(testCases); setPlans(planRows); setRuns(runRows); setDefects(defectRows);
      setActivity(activityRows); setSummary(summaryData);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [projectId]);

  const caseMap = useMemo(() => Object.fromEntries(cases.map(item => [item.id, item.title])), [cases]);
  async function submitPlan(event) {
    event.preventDefault(); setSaving(true);
    try { await api.createTestPlan(projectId, planForm, session.token); setPlanForm(blankPlan); setShowPlanForm(false); await load(); }
    catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function removePlan(id) {
    if (!window.confirm("Delete this test plan? Existing test runs will remain available.")) return;
    try { await api.deleteTestPlan(id, session.token); await load(); } catch (err) { setError(err.message); }
  }
  async function submitRun(event) {
    event.preventDefault(); setSaving(true);
    try {
      const created = await api.createTestRun(projectId, { ...runForm, plan_id: runForm.plan_id ? Number(runForm.plan_id) : null }, session.token);
      setShowRunForm(false); setRunForm({ name: "", plan_id: "", environment: "Staging" }); await load();
      setSelectedRun(await api.getTestRun(created.id, session.token)); setTab("Runs");
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function openRun(run) {
    try { setSelectedRun(await api.getTestRun(run.id, session.token)); }
    catch (err) { setError(err.message); }
  }
  async function saveResult(result, nextStatus) {
    try {
      await api.recordResult(selectedRun.id, { test_case_id: result.test_case_id, status: nextStatus, actual_result: result.actual_result || "", notes: result.notes || "" }, session.token);
      await openRun(selectedRun);
      await load();
    } catch (err) { setError(err.message); }
  }
  async function changeRunStatus(run, nextStatus) {
    try { await api.updateRunStatus(run.id, nextStatus, session.token); await openRun(run); await load(); }
    catch (err) { setError(err.message); }
  }
  async function submitDefect(event) {
    event.preventDefault(); setSaving(true);
    const payload = { ...defectForm, test_case_id: defectForm.test_case_id ? Number(defectForm.test_case_id) : null, test_run_id: defectForm.test_run_id ? Number(defectForm.test_run_id) : null };
    try {
      if (editingDefect) await api.updateDefect(editingDefect.id, payload, session.token);
      else await api.createDefect(projectId, payload, session.token);
      setShowDefectForm(false); setEditingDefect(null); setDefectForm(blankDefect); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  function editDefect(item) {
    setEditingDefect(item);
    setDefectForm({ ...item, test_case_id: item.test_case_id || "", test_run_id: item.test_run_id || "" });
    setShowDefectForm(true);
  }
  async function removeDefect(id) {
    if (!window.confirm("Delete this defect?")) return;
    try { await api.deleteDefect(id, session.token); await load(); } catch (err) { setError(err.message); }
  }

  if (loading && !project) return <div className="page-content"><div className="loading-state">Loading QA workspace...</div></div>;
  if (!project && !loading) return <div className="page-content"><div className="alert">Project not found or access denied.</div><Link to="/dashboard">Back to projects</Link></div>;

  return <div className="page-content workflow-page">
    <div className="welcome-row workflow-heading">
      <div><Link className="back-link" to="/dashboard"><ArrowLeft size={13}/> Back to projects</Link><span className="eyebrow">QUALITY WORKSPACE</span><h1>{project?.name}</h1><p className="muted">Plan testing, execute test cases, track defects and review quality.</p></div>
      <button className="btn btn-quiet" onClick={load}><RefreshCw size={15}/> Refresh</button>
    </div>
    {error && <div className="alert page-alert">{error}</div>}
    <div className="workflow-tabs">{tabs.map(item => <button key={item} className={tab === item ? "workflow-tab active" : "workflow-tab"} onClick={() => setTab(item)}>{item}</button>)}</div>

    {tab === "Plans" && <section>
      <div className="section-heading"><div><h2>Test plans</h2><p className="muted">Define scope, objectives and the test cases included in a cycle.</p></div><button className="btn btn-primary" onClick={() => setShowPlanForm(v => !v)}><Plus size={15}/> New plan</button></div>
      {showPlanForm && <form className="workflow-form" onSubmit={submitPlan}>
        <label>Plan name<input required maxLength={180} value={planForm.name} onChange={e=>setPlanForm({...planForm,name:e.target.value})} placeholder="Regression test cycle 1"/></label>
        <label>Objective<textarea rows="2" value={planForm.objective} onChange={e=>setPlanForm({...planForm,objective:e.target.value})} placeholder="What should this plan validate?"/></label>
        <label>Scope<textarea rows="2" value={planForm.scope} onChange={e=>setPlanForm({...planForm,scope:e.target.value})} placeholder="Features, platforms and areas covered"/></label>
        <div className="form-two-col"><label>Status<select value={planForm.status} onChange={e=>setPlanForm({...planForm,status:e.target.value})}>{["Draft","Approved","In Progress","Completed","Archived"].map(v=><option key={v}>{v}</option>)}</select></label><label>Start date<input type="date" value={planForm.start_date} onChange={e=>setPlanForm({...planForm,start_date:e.target.value})}/></label><label>End date<input type="date" value={planForm.end_date} onChange={e=>setPlanForm({...planForm,end_date:e.target.value})}/></label></div>
        <div><b className="field-heading">Include test cases</b><div className="case-picker">{cases.map(item=><label key={item.id}><input type="checkbox" checked={planForm.test_case_ids.includes(item.id)} onChange={e=>setPlanForm({...planForm,test_case_ids:e.target.checked?[...planForm.test_case_ids,item.id]:planForm.test_case_ids.filter(id=>id!==item.id)})}/><span>TC-{String(item.id).padStart(3,"0")} · {item.title}</span></label>)}</div></div>
        <div className="modal-actions"><button type="button" className="btn btn-quiet" onClick={()=>setShowPlanForm(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving?"Saving...":"Save test plan"}</button></div>
      </form>}
      {plans.length ? <div className="workflow-grid">{plans.map(plan=><article className="workflow-card" key={plan.id}><div className="workflow-card-top"><span className="workflow-icon"><ClipboardList size={18}/></span><span className="status-pill">{plan.status}</span></div><h3>{plan.name}</h3><p>{plan.objective || "No objective provided."}</p><div className="workflow-meta">{plan.test_case_ids.length} test cases · {plan.start_date || "No start date"} – {plan.end_date || "No end date"}</div><div className="workflow-actions"><button className="btn btn-quiet" onClick={()=>{setRunForm({name:plan.name+" - Run",plan_id:String(plan.id),environment:"Staging"});setShowRunForm(true);setTab("Runs");}}>Create run</button><button className="icon-btn danger-hover" onClick={()=>removePlan(plan.id)} title="Delete plan"><Trash2 size={15}/></button></div></article>)}</div> : <div className="empty-state"><ClipboardList size={25}/><h3>No test plans yet</h3><p>Create a plan to group test cases into a test cycle.</p></div>}
    </section>}

    {tab === "Runs" && <section>
      <div className="section-heading"><div><h2>Test execution</h2><p className="muted">Record outcomes for each test case and monitor the run.</p></div><button className="btn btn-primary" onClick={()=>setShowRunForm(v=>!v)}><Plus size={15}/> New run</button></div>
      {showRunForm && <form className="workflow-form compact-form" onSubmit={submitRun}><label>Run name<input required value={runForm.name} onChange={e=>setRunForm({...runForm,name:e.target.value})} placeholder="Sprint 4 regression"/></label><div className="form-two-col"><label>Test plan<select value={runForm.plan_id} onChange={e=>setRunForm({...runForm,plan_id:e.target.value})}><option value="">All project test cases</option>{plans.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Environment<input value={runForm.environment} onChange={e=>setRunForm({...runForm,environment:e.target.value})} placeholder="Staging / Production"/></label></div><div className="modal-actions"><button type="button" className="btn btn-quiet" onClick={()=>setShowRunForm(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>Create run</button></div></form>}
      {selectedRun && <div className="run-detail workflow-card"><div className="section-heading"><div><span className="eyebrow">RUN #{selectedRun.id}</span><h2>{selectedRun.name}</h2><p className="muted">{selectedRun.environment || "Environment not set"} · {selectedRun.status}</p></div><button className="btn btn-quiet" onClick={()=>setSelectedRun(null)}>Close</button></div><div className="run-progress"><span>{selectedRun.counts.Passed} passed</span><span>{selectedRun.counts.Failed} failed</span><span>{selectedRun.counts.Blocked} blocked</span><span>{selectedRun.counts["Not Run"]} not run</span></div>{selectedRun.results.map(result=><div className="result-row" key={result.id}><div><b>{caseMap[result.test_case_id] || "Test case"}</b><small>TC-{String(result.test_case_id).padStart(3,"0")}</small></div><select value={result.status} onChange={e=>saveResult(result,e.target.value)}>{["Not Run","Passed","Failed","Blocked"].map(v=><option key={v}>{v}</option>)}</select></div>)}<div className="modal-actions"><button className="btn btn-quiet" onClick={()=>changeRunStatus(selectedRun,"In Progress")}>Reopen</button><button className="btn btn-primary" onClick={()=>changeRunStatus(selectedRun,"Completed")}>Complete run</button></div></div>}
      {runs.length ? <div className="workflow-list">{runs.map(run=><button className="workflow-list-row" key={run.id} onClick={()=>openRun(run)}><span className="workflow-icon"><Play size={16}/></span><span className="workflow-list-copy"><b>{run.name}</b><small>{run.environment || "No environment"} · {run.total} test cases</small></span><span className="run-counts">{run.counts.Passed} passed · {run.counts.Failed} failed</span><span className="status-pill">{run.status}</span></button>)}</div> : <div className="empty-state"><Play size={25}/><h3>No test runs yet</h3><p>Create a run from a test plan or all project test cases.</p></div>}
    </section>}

    {tab === "Defects" && <section>
      <div className="section-heading"><div><h2>Defect tracking</h2><p className="muted">Capture reproducible issues and track their resolution.</p></div><button className="btn btn-primary" onClick={()=>{setEditingDefect(null);setDefectForm(blankDefect);setShowDefectForm(v=>!v);}}><Plus size={15}/> Report defect</button></div>
      {showDefectForm && <form className="workflow-form" onSubmit={submitDefect}><label>Title<input required maxLength={200} value={defectForm.title} onChange={e=>setDefectForm({...defectForm,title:e.target.value})} placeholder="Checkout button does not respond"/></label><label>Description<textarea rows="2" value={defectForm.description} onChange={e=>setDefectForm({...defectForm,description:e.target.value})}/></label><div className="form-two-col"><label>Severity<select value={defectForm.severity} onChange={e=>setDefectForm({...defectForm,severity:e.target.value})}>{["Low","Medium","High","Critical"].map(v=><option key={v}>{v}</option>)}</select></label><label>Priority<select value={defectForm.priority} onChange={e=>setDefectForm({...defectForm,priority:e.target.value})}>{["Low","Medium","High","Critical"].map(v=><option key={v}>{v}</option>)}</select></label><label>Status<select value={defectForm.status} onChange={e=>setDefectForm({...defectForm,status:e.target.value})}>{["Open","In Progress","Resolved","Closed","Reopened"].map(v=><option key={v}>{v}</option>)}</select></label><label>Assigned to<input value={defectForm.assigned_to || ""} onChange={e=>setDefectForm({...defectForm,assigned_to:e.target.value})} placeholder="Email or team member"/></label></div><label>Steps to reproduce<textarea rows="3" value={defectForm.steps_to_reproduce || ""} onChange={e=>setDefectForm({...defectForm,steps_to_reproduce:e.target.value})}/></label><div className="form-two-col"><label>Expected result<textarea rows="2" value={defectForm.expected_result || ""} onChange={e=>setDefectForm({...defectForm,expected_result:e.target.value})}/></label><label>Actual result<textarea rows="2" value={defectForm.actual_result || ""} onChange={e=>setDefectForm({...defectForm,actual_result:e.target.value})}/></label><label>Related test case<select value={defectForm.test_case_id} onChange={e=>setDefectForm({...defectForm,test_case_id:e.target.value})}><option value="">Not linked</option>{cases.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>Related test run<select value={defectForm.test_run_id} onChange={e=>setDefectForm({...defectForm,test_run_id:e.target.value})}><option value="">Not linked</option>{runs.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="btn btn-quiet" onClick={()=>setShowDefectForm(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving?"Saving...":editingDefect?"Update defect":"Save defect"}</button></div></form>}
      {defects.length ? <div className="workflow-list">{defects.map(item=><article className="defect-row" key={item.id}><span className="defect-symbol"><AlertTriangle size={17}/></span><div className="workflow-list-copy"><b>BUG-{String(item.id).padStart(4,"0")} · {item.title}</b><small>{item.description || "No description"} · {item.assigned_to || "Unassigned"}</small><div className="test-case-meta"><span className={"priority-pill "+item.severity.toLowerCase()}>{item.severity} severity</span><span className="priority-pill">{item.priority} priority</span><span className="status-pill">{item.status}</span></div></div><div className="workflow-actions"><button className="btn btn-quiet" onClick={()=>editDefect(item)}>Edit</button><button className="icon-btn danger-hover" onClick={()=>removeDefect(item.id)}><Trash2 size={15}/></button></div></article>)}</div> : <div className="empty-state"><AlertTriangle size={25}/><h3>No defects reported</h3><p>When a test fails, record the issue here with reproducible steps.</p></div>}
    </section>}

    {tab === "Reports" && <section><div className="section-heading"><div><h2>Quality overview</h2><p className="muted">A live summary of your projects and this project's QA activity.</p></div></div><div className="stat-grid"><div className="stat-card"><div className="stat-top">Test cases</div><strong>{cases.length}</strong><small>In this project</small></div><div className="stat-card"><div className="stat-top">Test plans</div><strong>{plans.length}</strong><small>Created plans</small></div><div className="stat-card"><div className="stat-top">Test runs</div><strong>{runs.length}</strong><small>Execution cycles</small></div><div className="stat-card"><div className="stat-top">Defects</div><strong>{defects.length}</strong><small>{defects.filter(d=>["Open","In Progress","Reopened"].includes(d.status)).length} still active</small></div></div><div className="workflow-card report-card"><h3>Defects by severity</h3>{["Critical","High","Medium","Low"].map(level=><div className="report-bar-row" key={level}><span>{level}</span><div className="report-track"><i style={{width:(defects.length ? defects.filter(d=>d.severity===level).length/defects.length*100 : 0)+"%"}}/></div><b>{defects.filter(d=>d.severity===level).length}</b></div>)}</div><div className="workflow-card report-card"><h3>Execution results · all your projects</h3>{["Passed","Failed","Blocked","Not Run"].map(level=><div className="report-bar-row" key={level}><span>{level}</span><div className="report-track"><i style={{width:(summary?.results && Object.values(summary.results).reduce((a,b)=>a+b,0) ? summary.results[level]/Object.values(summary.results).reduce((a,b)=>a+b,0)*100 : 0)+"%"}}/></div><b>{summary?.results?.[level] ?? 0}</b></div>)}</div></section>}

    {tab === "Activity" && <section><div className="section-heading"><div><h2>Recent activity</h2><p className="muted">A history of changes made in this project.</p></div></div>{activity.length ? <div className="workflow-list">{activity.map(item=><div className="workflow-list-row" key={item.id}><span className="workflow-icon"><Activity size={16}/></span><span className="workflow-list-copy"><b>{item.action} {item.entity_type}</b><small>{item.details || "No additional details"} · {new Date(item.created_at).toLocaleString()}</small></span></div>)}</div> : <div className="empty-state"><Activity size={25}/><h3>No activity yet</h3><p>Actions such as creating plans, runs and defects will appear here.</p></div>}</section>}
    <footer className="page-footer"><span>TestFlow · QA Management System</span><span><CheckCircle2 size={12}/> Project workspace</span></footer>
  </div>;
}
