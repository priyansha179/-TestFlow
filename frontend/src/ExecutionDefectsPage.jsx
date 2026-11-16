import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "./api";
import { useAuth } from "./AuthContext";

const blankExecution = { test_case_id: "", status: "Pass", actual_result: "", notes: "" };
const blankDefect = { title: "", description: "", steps_to_reproduce: "", severity: "Medium", priority: "Medium", test_execution_id: "" };

export default function ExecutionDefectsPage() {
  const { projectId } = useParams();
  const { session } = useAuth();
  const [project, setProject] = useState(null);
  const [cases, setCases] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [defects, setDefects] = useState([]);
  const [executionForm, setExecutionForm] = useState(blankExecution);
  const [defectForm, setDefectForm] = useState(blankDefect);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingExecution, setSavingExecution] = useState(false);
  const [savingDefect, setSavingDefect] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [projects, testCases, executionRows, defectRows] = await Promise.all([
        api.projects(session.token),
        api.testCases(projectId, session.token),
        api.executions(projectId, session.token),
        api.defects(projectId, session.token),
      ]);
      const selected = projects.find((item) => String(item.id) === String(projectId));
      if (!selected) throw new Error("Project not found or you do not have access to it.");
      setProject(selected);
      setCases(testCases);
      setExecutions(executionRows);
      setDefects(defectRows);
      setExecutionForm((current) => ({ ...current, test_case_id: current.test_case_id || String(testCases[0]?.id || "") }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  async function submitExecution(event) {
    event.preventDefault();
    if (!executionForm.test_case_id) return;
    setSavingExecution(true);
    setError("");
    try {
      const created = await api.createExecution(executionForm.test_case_id, {
        status: executionForm.status,
        actual_result: executionForm.actual_result,
        notes: executionForm.notes,
      }, session.token);
      setExecutionForm({ ...blankExecution, test_case_id: executionForm.test_case_id });
      await load();
      if (created.status === "Fail") {
        setDefectForm((current) => ({ ...current, test_execution_id: String(created.id) }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingExecution(false);
    }
  }

  async function submitDefect(event) {
    event.preventDefault();
    setSavingDefect(true);
    setError("");
    try {
      await api.createDefect(projectId, {
        ...defectForm,
        test_execution_id: defectForm.test_execution_id ? Number(defectForm.test_execution_id) : null,
      }, session.token);
      setDefectForm(blankDefect);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingDefect(false);
    }
  }

  async function changeDefectStatus(defect, status) {
    try {
      await api.updateDefect(defect.id, { status }, session.token);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeDefect(defect) {
    if (!window.confirm(`Delete defect "${defect.title}"?`)) return;
    try {
      await api.deleteDefect(defect.id, session.token);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const failedExecutions = executions.filter((item) => item.status === "Fail");
  const caseTitle = (id) => cases.find((item) => item.id === id)?.title || `Test case #${id}`;

  return <div className="page-content">
    <div className="welcome-row">
      <div>
        <Link className="back-link" to={`/projects/${projectId}/test-cases`}>← Back to test cases</Link>
        <span className="eyebrow">QUALITY WORKFLOW</span>
        <h1>{project?.name || "Test execution & defects"}</h1>
        <p className="muted">Record test results, review execution history, and track defects.</p>
      </div>
    </div>
    {error && <div className="alert page-alert">{error}</div>}
    {loading ? <div className="loading-state"><span className="spinner"/>Loading quality data...</div> : <>
      <section className="stat-grid">
        <div className="stat-card"><div className="stat-top">Total executions</div><strong>{executions.length}</strong><small>Recorded test runs</small></div>
        <div className="stat-card"><div className="stat-top">Failed executions</div><strong>{failedExecutions.length}</strong><small>Require investigation</small></div>
        <div className="stat-card"><div className="stat-top">Open defects</div><strong>{defects.filter((item) => item.status === "Open" || item.status === "In Progress").length}</strong><small>Awaiting resolution</small></div>
      </section>

      <section className="quality-grid">
        <div className="quality-panel">
          <h2>Record test execution</h2>
          <p className="muted">Choose a test case and record its actual result.</p>
          <form className="project-form" onSubmit={submitExecution}>
            <label>Test case<select required value={executionForm.test_case_id} onChange={(e) => setExecutionForm({ ...executionForm, test_case_id: e.target.value })}>
              <option value="">Select a test case</option>
              {cases.map((item) => <option key={item.id} value={item.id}>TC-{String(item.id).padStart(3, "0")} · {item.title}</option>)}
            </select></label>
            <label>Result<select value={executionForm.status} onChange={(e) => setExecutionForm({ ...executionForm, status: e.target.value })}><option>Pass</option><option>Fail</option><option>Blocked</option></select></label>
            <label>Actual result<textarea rows={3} value={executionForm.actual_result} onChange={(e) => setExecutionForm({ ...executionForm, actual_result: e.target.value })} placeholder="What happened when you performed the test?"/></label>
            <label>Notes <span className="optional">Optional</span><textarea rows={2} value={executionForm.notes} onChange={(e) => setExecutionForm({ ...executionForm, notes: e.target.value })} placeholder="Environment, browser, evidence reference..."/></label>
            <button className="btn btn-primary" disabled={savingExecution || !cases.length}>{savingExecution ? "Saving..." : "Save execution"}</button>
          </form>
        </div>

        <div className="quality-panel">
          <h2>Report a defect</h2>
          <p className="muted">Link a defect to a failed execution when available.</p>
          <form className="project-form" onSubmit={submitDefect}>
            <label>Defect title<input required maxLength={200} value={defectForm.title} onChange={(e) => setDefectForm({ ...defectForm, title: e.target.value })} placeholder="Short, clear bug title"/></label>
            <label>Description<textarea required rows={2} value={defectForm.description} onChange={(e) => setDefectForm({ ...defectForm, description: e.target.value })} placeholder="Describe the observed problem."/></label>
            <label>Steps to reproduce<textarea required rows={3} value={defectForm.steps_to_reproduce} onChange={(e) => setDefectForm({ ...defectForm, steps_to_reproduce: e.target.value })} placeholder={"1. Open the page.\n2. Perform the action.\n3. Observe the issue."}/></label>
            <div className="form-two-col">
              <label>Severity<select value={defectForm.severity} onChange={(e) => setDefectForm({ ...defectForm, severity: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
              <label>Priority<select value={defectForm.priority} onChange={(e) => setDefectForm({ ...defectForm, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
            </div>
            <label>Related failed execution<select value={defectForm.test_execution_id} onChange={(e) => setDefectForm({ ...defectForm, test_execution_id: e.target.value })}><option value="">Not linked</option>{failedExecutions.map((item) => <option key={item.id} value={item.id}>Run #{item.id} · {caseTitle(item.test_case_id)}</option>)}</select></label>
            <button className="btn btn-primary" disabled={savingDefect}>{savingDefect ? "Saving..." : "Create defect"}</button>
          </form>
        </div>
      </section>

      <section className="section-heading"><div><h2>Execution history</h2><p className="muted">Latest test results for this project.</p></div><span className="project-count">{executions.length} runs</span></section>
      {executions.length ? <div className="quality-list">{executions.map((item) => <article className="quality-row" key={item.id}><div><b>Run #{item.id} · {caseTitle(item.test_case_id)}</b><p>{item.actual_result || "No actual result entered."}</p><small>{item.executed_at ? new Date(item.executed_at).toLocaleString() : "Execution date unavailable"}</small></div><span className={`result-pill ${item.status.toLowerCase()}`}>{item.status}</span></article>)}</div> : <div className="empty-state"><h3>No executions yet</h3><p>Record your first test result above.</p></div>}

      <section className="section-heading"><div><h2>Defect register</h2><p className="muted">Track, update, and close reported issues.</p></div><span className="project-count">{defects.length} defects</span></section>
      {defects.length ? <div className="quality-list">{defects.map((item) => <article className="quality-row defect-row" key={item.id}><div className="quality-row-main"><b>BUG-{String(item.id).padStart(3, "0")} · {item.title}</b><p>{item.description}</p><small>Severity: {item.severity} · Priority: {item.priority}{item.test_execution_id ? ` · Run #${item.test_execution_id}` : ""}</small><details className="test-case-details"><summary>Steps to reproduce</summary><p className="repro-steps">{item.steps_to_reproduce}</p></details></div><div className="defect-controls"><select aria-label="Defect status" value={item.status} onChange={(e) => changeDefectStatus(item, e.target.value)}><option>Open</option><option>In Progress</option><option>Resolved</option><option>Closed</option></select><button className="icon-btn danger-hover" title="Delete defect" onClick={() => removeDefect(item)}>×</button></div></article>)}</div> : <div className="empty-state"><h3>No defects reported</h3><p>Use the form above to create a defect record.</p></div>}
    </>}
    <footer className="page-footer"><span>© 2026 TestFlow · QA Management System</span><span><span className="online-dot"/> Connected to your workspace</span></footer>
  </div>;
}
