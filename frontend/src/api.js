const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}, token) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.detail;
    throw new Error(Array.isArray(detail) ? detail.map(item => item.msg).join(", ") : detail || "Something went wrong. Please try again.");
  }
  return data;
}

export const api = {
  register: payload => request("/register", { method: "POST", body: JSON.stringify(payload) }),
  login: payload => request("/login", { method: "POST", body: JSON.stringify(payload) }),
  projects: token => request("/projects", {}, token),
  createProject: (payload, token) => request("/projects", { method: "POST", body: JSON.stringify(payload) }, token),
  updateProject: (id, payload, token) => request(`/projects/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  deleteProject: (id, token) => request(`/projects/${id}`, { method: "DELETE" }, token),
  testCases: (projectId, token) => request(`/projects/${projectId}/test-cases`, {}, token),
  createTestCase: (projectId, payload, token) => request(`/projects/${projectId}/test-cases`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateTestCase: (id, payload, token) => request(`/test-cases/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  deleteTestCase: (id, token) => request(`/test-cases/${id}`, { method: "DELETE" }, token),
  dashboardSummary: token => request("/dashboard/summary", {}, token),
  notifications: token => request("/notifications", {}, token),
  testPlans: (projectId, token) => request(`/projects/${projectId}/test-plans`, {}, token),
  createTestPlan: (projectId, payload, token) => request(`/projects/${projectId}/test-plans`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateTestPlan: (id, payload, token) => request(`/test-plans/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  deleteTestPlan: (id, token) => request(`/test-plans/${id}`, { method: "DELETE" }, token),
  testRuns: (projectId, token) => request(`/projects/${projectId}/test-runs`, {}, token),
  createTestRun: (projectId, payload, token) => request(`/projects/${projectId}/test-runs`, { method: "POST", body: JSON.stringify(payload) }, token),
  getTestRun: (id, token) => request(`/test-runs/${id}`, {}, token),
  updateRunStatus: (id, status, token) => request(`/test-runs/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, token),
  recordResult: (id, payload, token) => request(`/test-runs/${id}/results`, { method: "POST", body: JSON.stringify(payload) }, token),
  defects: (projectId, token) => request(`/projects/${projectId}/defects`, {}, token),
  createDefect: (projectId, payload, token) => request(`/projects/${projectId}/defects`, { method: "POST", body: JSON.stringify(payload) }, token),
  updateDefect: (id, payload, token) => request(`/defects/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  deleteDefect: (id, token) => request(`/defects/${id}`, { method: "DELETE" }, token),
  activity: (projectId, token) => request(`/projects/${projectId}/activity`, {}, token),
};
