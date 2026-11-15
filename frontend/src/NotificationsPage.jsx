import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Bell, CheckCircle2 } from "lucide-react";
import { api } from "./api";
import { useAuth } from "./AuthContext";

export default function NotificationsPage() {
  const { session } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api.notifications(session.token)
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  return <div className="page-content notification-page">
    <div className="welcome-row"><div><Link className="back-link" to="/dashboard"><ArrowLeft size={13}/> Back to dashboard</Link><span className="eyebrow">WORKSPACE UPDATES</span><h1>Notifications</h1><p className="muted">Recent activity across your QA projects.</p></div><span className="workflow-icon"><Bell size={19}/></span></div>
    {error && <div className="alert page-alert">{error}</div>}
    {loading ? <div className="loading-state">Loading notifications...</div> : items.length ? <div className="workflow-list">{items.map(item=><Link className="workflow-list-row notification-row" to={`/projects/${item.project_id}/workflow`} key={item.id}><span className="workflow-icon"><Activity size={16}/></span><span className="workflow-list-copy"><b>{item.action} {item.entity_type} · {item.project_name}</b><small>{item.details || "QA workspace activity"} · {new Date(item.created_at).toLocaleString()}</small></span><CheckCircle2 size={15}/></Link>)}</div> : <div className="empty-state"><Bell size={25}/><h3>You're all caught up</h3><p>New plan, execution and defect activity will appear here.</p></div>}
  </div>;
}
