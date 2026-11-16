# TestFlow — QA Management System

<p align="center">
  <strong>A practical workspace for planning, executing, and tracking software testing.</strong>
  <br />
  Built with React, FastAPI, and SQLAlchemy.
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react&logoColor=20232A" />
  <img alt="Vite" src="https://img.shields.io/badge/Build-Vite-646CFF?logo=vite&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white" />
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white" />
  <img alt="Tests" src="https://img.shields.io/badge/Testing-pytest%20%7C%20Playwright-2EAD33" />
</p>

---

## Overview

**TestFlow** is a full-stack Quality Assurance (QA) Management System that brings the main stages of a software testing workflow into one place. It helps testers organize projects, prepare test cases and plans, execute test runs, record results, and track defects.

The project is designed as a hands-on QA and software engineering portfolio project. It includes a React frontend, a FastAPI backend, a relational database layer, API documentation, automated tests, and local Docker configuration.

> **Project status:** The core portfolio workflow is implemented. Backend integration tests and the frontend production build have passed; Playwright browser smoke tests are included in the CI workflow. TestFlow is a learning/portfolio application and has not undergone a full production security audit.

## Key capabilities

| Area | What you can do |
|---|---|
| Authentication | Register, log in, and access protected features using JWT authentication |
| Project management | Create, view, edit, delete, search, and filter QA projects |
| Test case management | Maintain test descriptions, preconditions, steps, expected results, priority, and status |
| Test planning | Create test plans and select the project test cases included in each plan |
| Test execution | Create test runs and record **Passed**, **Failed**, **Blocked**, or **Not Run** results |
| Defect tracking | Record reproduction steps, expected and actual results, severity, priority, status, and related test records |
| Dashboard | Review project, test, execution, and defect summaries |
| Activity and notifications | Review project activity and QA workflow notifications |

### Quality and developer tooling

- Backend API integration tests using **pytest** and FastAPI TestClient.
- Browser smoke tests using **Playwright**.
- Postman collection for exercising the API workflow.
- GitHub Actions workflow for automated quality checks.
- Dockerfiles and Docker Compose for local demonstration.
- Swagger UI and ReDoc API documentation.
- SQLite for the default local database, with PostgreSQL configurable through `DATABASE_URL`.

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Lucide |
| Backend | Python, FastAPI, Pydantic |
| Database | SQLite (default), PostgreSQL (configurable) |
| ORM | SQLAlchemy |
| Authentication | JWT, python-jose, Passlib, bcrypt |
| API documentation | Swagger UI, ReDoc |
| Backend testing | pytest, FastAPI TestClient, httpx |
| Browser testing | Playwright |
| API testing | Postman |
| CI | GitHub Actions |
| Containers | Docker, Docker Compose |

## Application architecture

```text
                 ┌──────────────────────────┐
                 │       TestFlow UI        │
                 │      React + Vite        │
                 └────────────┬─────────────┘
                              │ HTTP / JSON
                              ▼
                 ┌──────────────────────────┐
                 │       FastAPI API        │
                 │ Authentication & routes │
                 └────────────┬─────────────┘
                              │ SQLAlchemy
                              ▼
                 ┌──────────────────────────┐
                 │       Database           │
                 │ SQLite / PostgreSQL      │
                 └──────────────────────────┘
```

The frontend communicates with the backend through the API client in `frontend/src/api.js`. By default, API requests are sent to `http://127.0.0.1:8000`. The URL can be overridden with the frontend environment variable `VITE_API_URL`.

## Getting started

### Prerequisites

Install the following before running TestFlow:

- Python 3.10 or newer
- Node.js 20 or newer
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/priyansha179/QA-Management-System.git
cd QA-Management-System
```

### 2. Set up and run the backend

Create a virtual environment from the repository root.

**Windows PowerShell**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
cd backend
python -m pip install -r requirements.txt
$env:JWT_SECRET_KEY = "replace-with-a-long-random-secret"
python -m uvicorn main:app --reload
```

**macOS / Linux**

```bash
python3 -m venv .venv
source .venv/bin/activate
cd backend
python -m pip install -r requirements.txt
export JWT_SECRET_KEY="replace-with-a-long-random-secret"
python -m uvicorn main:app --reload
```

Keep this terminal running. The backend is available at:

| Resource | URL |
|---|---|
| API base URL | http://127.0.0.1:8000 |
| Swagger UI | http://127.0.0.1:8000/docs |
| ReDoc | http://127.0.0.1:8000/redoc |
| Health check | http://127.0.0.1:8000/health |

The default local database is `backend/qa_system.db`. To use PostgreSQL, configure `DATABASE_URL` with a valid connection string, for example:

```text
postgresql+psycopg2://username:password@localhost:5432/qa_management
```

### 3. Set up and run the frontend

Open a **second terminal** at the repository root:

```bash
cd frontend
npm install
npm run dev
```

Vite prints the local frontend URL in the terminal. Usually it is:

- http://localhost:5173

If port 5173 is already occupied, Vite automatically selects another available port (for example, 5174). Open the exact URL printed by Vite.

The frontend defaults to the backend URL `http://127.0.0.1:8000`. To change it, create `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

**Keep both backend and frontend terminals running** while using the application.

### 4. Run backend tests

From the repository root:

```bash
cd backend
python -m pytest tests -v
```

### 5. Build the frontend

From the repository root:

```bash
cd frontend
npm run build
```

### 6. Run Playwright browser tests

From the frontend directory, install the required browser once:

```bash
npx playwright install
npm run test:e2e
```

### 7. Run with Docker

Docker Compose is also available for a local demonstration:

```bash
cp .env.example .env
```

Set a unique `JWT_SECRET_KEY` in `.env`, then run:

```bash
docker compose up --build
```

Open the frontend at http://localhost:8080 and the API documentation at http://localhost:8000/docs.

For more details, see [Docker instructions](docs/DOCKER.md).

## API reference

The API is documented interactively through Swagger UI at `/docs`. The main endpoints are summarized below.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API health |
| POST | `/register` | Register a user |
| POST | `/login` | Authenticate and receive a JWT |
| GET, POST | `/projects` | List and create projects |
| GET, PUT, DELETE | `/projects/{project_id}` | Retrieve, update, or delete a project |
| GET, POST | `/projects/{project_id}/test-cases` | List and create test cases |
| GET, PUT, DELETE | `/test-cases/{test_case_id}` | Retrieve, update, or delete a test case |
| GET | `/dashboard/summary` | Retrieve dashboard metrics |
| GET, POST | `/projects/{project_id}/test-plans` | List and create test plans |
| PUT, DELETE | `/test-plans/{plan_id}` | Update or delete a test plan |
| GET, POST | `/projects/{project_id}/test-runs` | List and create test runs |
| GET, PATCH | `/test-runs/{run_id}` | Retrieve a run or update its status |
| POST | `/test-runs/{run_id}/results` | Record a test execution result |
| GET, POST | `/projects/{project_id}/defects` | List and create defects |
| PUT, DELETE | `/defects/{defect_id}` | Update or delete a defect |
| GET | `/projects/{project_id}/activity` | Retrieve project activity |
| GET | `/notifications` | Retrieve the current user's notifications |

All endpoints other than health, registration, and login require a bearer token:

```http
Authorization: Bearer <access_token>
```

Use Swagger UI to inspect request schemas and try endpoints interactively. You can also import the Postman collection at `postman/TestFlow-QA-Management-System.postman_collection.json` and configure its collection variables.

## Repository structure

```text
QA-Management-System/
├── .github/
│   └── workflows/
│       └── quality.yml
├── backend/
│   ├── tests/
│   │   └── test_workflow.py
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
│   ├── e2e/
│   ├── Dockerfile
│   └── nginx.conf
├── postman/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Security notes

- Protected project workflows enforce per-user project ownership checks.
- Public registration assigns the default Tester role; users cannot self-assign elevated roles.
- New passwords use bcrypt; legacy SHA-256 hashes are upgraded after successful login.
- Use a strong, unique `JWT_SECRET_KEY` outside local development.
- Restrict `FRONTEND_ORIGINS` to the frontend origins you trust.
- Do not commit secrets, access tokens, or real database credentials.
- Before public production deployment, add HTTPS, managed database backups, migrations, rate limiting, and a full security review.

TestFlow is a portfolio and learning project, not a production-audited SaaS application.

## Suggested QA demonstration

A useful end-to-end portfolio walkthrough:

1. Register a TestFlow account and log in.
2. Create a project named **E-Commerce Website Testing**.
3. Add test cases for login, product search, cart, and checkout.
4. Create a smoke or regression test plan and select test cases.
5. Start a test run and record passed, failed, and blocked results.
6. Create a defect for a failed test and include clear reproduction steps.
7. Review dashboard metrics, project activity, and notifications.
8. Run the backend tests, frontend build, and Playwright browser checks.

Use [the manual testing checklist](docs/TESTING_CHECKLIST.md) as a companion during the walkthrough.

## Roadmap

The core QA workflow is implemented. The following are possible future enhancements:

- [ ] Team invitations, shared project membership, and granular role permissions
- [ ] Evidence and file attachments for defects
- [ ] Email notifications and configurable notification preferences
- [ ] Production deployment with managed PostgreSQL, HTTPS, and backups
- [ ] Database migrations and additional production security hardening

---

## Author

**Priyansha**  
Computer Engineering | QA & Software Testing

If you find TestFlow useful or have suggestions, feel free to open an issue or submit a pull request.

---

<p align="center">
  <strong>TestFlow — Plan smarter. Test better. Track every defect.</strong>
</p>
