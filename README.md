# TestFlow – QA Management System

A full-stack QA workspace for organizing software testing from planning through execution and defect tracking. Built as a learning and portfolio project with a React frontend and a FastAPI backend.

> Project status: active development. The core QA workflow is implemented on the `feature/complete-qa-workflow` branch. Automated checks are included; review the GitHub Actions result before treating a change as verified.

## Features

### Authentication and project workspace
- User registration and JWT-based login.
- Bcrypt password hashing, with upgrade support for legacy SHA-256 hashes.
- Protected project and test-case APIs.
- Per-user project ownership checks.
- Project create, read, update and delete.
- Responsive dashboard, project search and status filtering.

### Test case management
- Create, view, update and delete test cases.
- Record description, preconditions, steps and expected results.
- Priority levels: Low, Medium, High and Critical.
- Draft and Ready states.
- Search and priority filtering.

### Test planning
- Create and update test plans with objectives, scope, status and dates.
- Select project test cases to include in a plan.
- Validate that selected cases belong to the same project.
- Preserve existing test run history if a plan is deleted.

### Test execution
- Create a test run from a test plan or all project test cases.
- Record Passed, Failed, Blocked and Not Run outcomes.
- Track execution environment, run status and timestamps.
- Review execution totals and reopen or complete a run.

### Defect tracking
- Create, update and delete defects.
- Record reproduction steps, expected and actual results.
- Set severity, priority, status and assignee.
- Link a defect to a test case and/or test run.
- Validate linked records against project ownership.

### Reports and activity
- Dashboard totals for projects, test cases, plans, runs and defects.
- Execution outcome counts and defect severity breakdown.
- Project activity history for plans, runs, results and defects.

### Engineering quality
- Backend API integration tests using pytest and FastAPI TestClient.
- GitHub Actions workflow for backend tests and frontend production build.
- Dockerfiles and Docker Compose for local demonstration.
- Configurable database URL (SQLite locally; PostgreSQL can be configured).
- Manual regression checklist in `docs/TESTING_CHECKLIST.md`.

## Technology stack

| Layer | Tools |
|---|---|
| Frontend | React 18, Vite, React Router, Lucide |
| Backend | Python, FastAPI, Pydantic |
| Database | SQLite by default, PostgreSQL supported through DATABASE_URL |
| ORM | SQLAlchemy |
| Authentication | JWT, python-jose, bcrypt via Passlib |
| API documentation | Swagger UI and ReDoc |
| Testing | pytest, FastAPI TestClient, httpx |
| UI automation foundation | Playwright can be added for browser end-to-end coverage |
| CI | GitHub Actions |
| Containers | Docker and Docker Compose |

## Repository structure

```text
QA-Management-System/
├── .github/workflows/quality.yml
├── backend/
│   ├── tests/test_workflow.py
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── qa_modules.py
│   ├── requirements.txt
│   └── Dockerfile
├── docs/
│   ├── DOCKER.md
│   └── TESTING_CHECKLIST.md
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── AuthContext.jsx
│   │   ├── WorkflowPage.jsx
│   │   ├── api.js
│   │   └── styles.css
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

## Run locally

### Prerequisites
- Python 3.10+
- Node.js 20+
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/priyansha179/QA-Management-System.git
cd QA-Management-System
```

### 2. Configure the backend

From the repository root:

**Windows PowerShell**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
cd backend
python -m pip install -r requirements.txt
$env:JWT_SECRET_KEY = "replace-with-a-long-random-secret"
uvicorn main:app --reload
```

**macOS / Linux**
```bash
python3 -m venv .venv
source .venv/bin/activate
cd backend
python -m pip install -r requirements.txt
export JWT_SECRET_KEY="replace-with-a-long-random-secret"
uvicorn main:app --reload
```

Backend URLs:
- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc
- Health check: http://127.0.0.1:8000/health

The default database is `backend/qa_system.db`. Set `DATABASE_URL` to use PostgreSQL, for example `postgresql+psycopg2://user:password@localhost:5432/qa_management`. Never commit credentials or a real JWT secret.

### 3. Run the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend defaults to the local API at http://127.0.0.1:8000. To change it, create `frontend/.env` with:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Build the production frontend:

```bash
npm run build
```

### 4. Run backend tests

From the repository root:

```bash
cd backend
pytest -q
```

The tests cover authentication, protected routes, a full plan-to-run-to-defect workflow, dashboard aggregation and cross-user project isolation.

### 5. Run with Docker

See [docs/DOCKER.md](docs/DOCKER.md). In short:

```bash
cp .env.example .env
# Edit .env and set a unique JWT_SECRET_KEY
docker compose up --build
```

Open the frontend at http://localhost:8080 and API documentation at http://localhost:8000/docs.

## API overview

All endpoints except health, registration and login require `Authorization: Bearer <token>`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | API health |
| POST | `/register` | Register user |
| POST | `/login` | Get JWT |
| GET/POST | `/projects` | List/create projects |
| GET/PUT/DELETE | `/projects/{project_id}` | Read/update/delete project |
| GET/POST | `/projects/{project_id}/test-cases` | List/create test cases |
| GET/PUT/DELETE | `/test-cases/{test_case_id}` | Read/update/delete test case |
| GET | `/dashboard/summary` | Workspace metrics |
| GET/POST | `/projects/{project_id}/test-plans` | List/create test plans |
| PUT/DELETE | `/test-plans/{plan_id}` | Update/delete test plan |
| GET/POST | `/projects/{project_id}/test-runs` | List/create test runs |
| GET/PATCH | `/test-runs/{run_id}` | Read/update run status |
| POST | `/test-runs/{run_id}/results` | Record a test result |
| GET/POST | `/projects/{project_id}/defects` | List/create defects |
| PUT/DELETE | `/defects/{defect_id}` | Update/delete defect |
| GET | `/projects/{project_id}/activity` | Project audit activity |

Open Swagger UI to inspect request schemas and try the APIs interactively.

## Security and deployment notes

- Project, test-plan, test-run and defect operations check the authenticated user's project ownership.
- Public registration always assigns the default Tester role; users cannot self-assign elevated roles.
- New passwords use bcrypt. Existing SHA-256 password hashes are verified and upgraded after successful login.
- Set a strong, unique `JWT_SECRET_KEY` in every non-local environment.
- Restrict `FRONTEND_ORIGINS` to the exact frontend origins you control.
- Use HTTPS, a managed PostgreSQL database, secret management, backups and a proper migration tool before production deployment.
- The current app is a portfolio/learning implementation, not a security-audited production SaaS. Review the OWASP API Security Top 10 and perform additional authorization, rate-limit, upload and deployment reviews before exposing it publicly.

## Learning and QA portfolio

Recommended demonstration:
1. Create an account and a project called "E-Commerce Website Testing".
2. Add login, product search, cart and checkout test cases.
3. Group the cases into a smoke or regression test plan.
4. Create a test run and record both passing and failing outcomes.
5. File a defect from a failed test, including reproducible steps.
6. Review the dashboard and activity history.
7. Run the automated tests and include screenshots plus a test summary in your portfolio.

Use `docs/TESTING_CHECKLIST.md` as the manual regression checklist. Import `postman/TestFlow-QA-Management-System.postman_collection.json` into Postman, set its collection variables, then run the requests in order for an API workflow smoke test. Browser smoke tests are in `frontend/e2e/auth.spec.js` and run with `npm run test:e2e`.

## Roadmap

- [x] Authentication and per-user project isolation.
- [x] Project and test-case CRUD.
- [x] Test plan management and test-case selection.
- [x] Test run creation and result recording.
- [x] Defect tracking with severity, priority and status.
- [x] Dashboard metrics and project activity history.
- [x] Backend integration tests and GitHub Actions workflow.
- [x] Docker-based local deployment configuration.
- [x] Browser smoke automation with Playwright (login, registration and protected-route checks).
- [ ] Team invitations, shared project membership and granular role permissions.
- [ ] File attachments for defect evidence.
- [ ] Email/in-app notification preferences.
- [ ] Cloud deployment with managed PostgreSQL, HTTPS and backups.
- [ ] Production security review and database migrations.

