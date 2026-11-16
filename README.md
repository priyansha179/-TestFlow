# QA Management System

A full-stack QA Management System currently under development. The backend provides authentication and project management APIs for organizing QA work. Planned modules include test cases, test execution, and defect tracking.

## Current Backend Features

- User registration and login.
- JWT bearer-token authentication.
- Bcrypt password hashing for new accounts.
- Automatic upgrade of existing SHA-256 password hashes to bcrypt after a successful login.
- Create, list, view, update, and delete projects.
- Project data is scoped to the authenticated owner.
- Create, list, view, update, and delete test cases within each owned project.
- Test cases include preconditions, steps, expected results, priority, and Draft/Ready status.
- Test case access is restricted to the owner of the parent project.
- Record Pass, Fail, and Blocked test executions with actual results, notes, tester, and timestamp.
- View execution history by test case or project.
- Create, view, update, and delete defects with severity, priority, status, reproduction steps, and optional links to failed executions.
- Defect and execution access is scoped through the authenticated project owner.
- SQLite database with SQLAlchemy ORM.
- Safe startup migration for the older projects table; existing records are preserved.
- Interactive API documentation through Swagger UI and ReDoc.

## Why GitHub Shows JavaScript

This is a **full-stack project**, so it uses more than one programming language:

- **Python** powers the backend: FastAPI, authentication, database models, and REST API endpoints are implemented in Python inside `backend/`.
- **JavaScript** powers the frontend: the browser interface is built with React and Vite inside `frontend/`. React components use the `.jsx` extension, while frontend configuration and API helper files use `.js`.

GitHub's language summary detects languages from files across the entire repository. It may therefore show JavaScript even though the backend is written in Python. This is expected and is not, by itself, a project error. The two parts communicate through HTTP API requests.

## Technology Stack

| Category | Technology |
|---|---|
| Backend language | Python 3 |
| Frontend language | JavaScript (ES modules / JSX) |
| Backend | FastAPI |
| Database | SQLite |
| ORM | SQLAlchemy |
| Authentication | JWT (python-jose) |
| Password hashing | Passlib and bcrypt |
| API server | Uvicorn |
| API documentation | Swagger UI / ReDoc |

## Project Structure

```text
QA-Management-System/
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   └── requirements.txt
├── .gitignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── AuthContext.jsx
│   │   ├── api.js
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── .gitignore
├── .gitignore
└── README.md
```

The SQLite database file is created in the backend directory when the application runs. It is intentionally excluded from Git because it contains local application data.

## Getting Started

### Prerequisites

- Python 3.10 or newer
- Git
- VS Code or another code editor

### 1. Clone the repository

```bash
git clone https://github.com/priyansha179/QA-Management-System.git
cd QA-Management-System
```

### 2. Create and activate a virtual environment

From the repository root:

**Windows PowerShell**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
python -m venv venv
source venv/bin/activate
```

### 3. Install backend dependencies

```bash
cd backend
python -m pip install -r requirements.txt
```

### 4. Configure the JWT secret

**Windows PowerShell**
```powershell
$env:JWT_SECRET_KEY = "replace-this-with-a-long-random-secret"
```

**macOS / Linux**
```bash
export JWT_SECRET_KEY="replace-this-with-a-long-random-secret"
```

The application includes a development-only fallback secret so it can start locally, but you should set your own secret. Never commit a real secret to GitHub or use the development fallback in production.

### 5. Start the backend

Run this from inside the `backend` directory:

```bash
uvicorn main:app --reload
```

The API will be available at:

- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

On startup, the backend creates missing tables and adds the `owner_id` and `created_at` columns to an older `projects` table when needed. Existing user and project rows are retained. Projects created before ownership was introduced remain unassigned and are not returned in users' project lists.

## Frontend

The React frontend is built with Vite and React Router. It currently includes:

- Registration and login screens connected to the backend API.
- JWT session storage and protected dashboard access.
- Responsive QA workspace layout.
- Project dashboard with total, active, and completed project counts.
- Project listing, search, and status filtering.
- Project-specific test case management screens.
- Test execution form with Pass/Fail/Blocked results and execution history.
- Defect register with severity, priority, status updates, and failed-execution linking.
- Create, edit, view, search, filter, and delete test cases.
- Test case priorities (Low, Medium, High, Critical) and Draft/Ready status.
- Create, edit, and delete project actions.
- Loading, empty, and API error states.

### Run the frontend

Open a second terminal from the repository root:

```bash
cd frontend
npm install
```

Copy `.env.example` to `.env` if your backend is running at a different address, then set `VITE_API_URL` to the backend base URL. The default is `http://127.0.0.1:8000`.

Start the Vite development server:

```bash
npm run dev
```

Open http://localhost:5173 in your browser. Keep the FastAPI server running in the first terminal. The backend allows the default Vite development origins; set `FRONTEND_ORIGINS` to a comma-separated list of allowed origins when hosting the frontend elsewhere.

Create a production build with:

```bash
npm run build
```

## API Endpoints

| Method | Endpoint | Auth required | Description |
|---|---|---:|---|
| GET | `/health` | No | Check API status |
| POST | `/register` | No | Create a user account |
| POST | `/login` | No | Receive a JWT access token |
| POST | `/projects` | Yes | Create a project |
| GET | `/projects` | Yes | List your projects |
| GET | `/projects/{project_id}` | Yes | Get one of your projects |
| PUT | `/projects/{project_id}` | Yes | Update one of your projects |
| DELETE | `/projects/{project_id}` | Yes | Delete one of your projects and its test cases |
| POST | `/projects/{project_id}/test-cases` | Yes | Create a test case in a project |
| GET | `/projects/{project_id}/test-cases` | Yes | List test cases in a project |
| GET | `/test-cases/{test_case_id}` | Yes | Get one test case |
| PUT | `/test-cases/{test_case_id}` | Yes | Update a test case |
| DELETE | `/test-cases/{test_case_id}` | Yes | Delete a test case and its execution history (linked defects are retained without the execution link) |
| POST | `/test-cases/{test_case_id}/executions` | Yes | Record a Pass, Fail, or Blocked execution |
| GET | `/test-cases/{test_case_id}/executions` | Yes | List execution history for a test case |
| GET | `/projects/{project_id}/executions` | Yes | List execution history for a project |
| POST | `/projects/{project_id}/defects` | Yes | Create a defect; optional execution link must reference a failed run in the project |
| GET | `/projects/{project_id}/defects` | Yes | List project defects |
| GET | `/defects/{defect_id}` | Yes | Get one defect |
| PUT | `/defects/{defect_id}` | Yes | Update defect details or status |
| DELETE | `/defects/{defect_id}` | Yes | Delete a defect |

### Register

`POST /register`

Request JSON:
```json
{
  "email": "tester@example.com",
  "password": "your-password"
}
```

Passwords must be at least 8 characters. New accounts receive the `Tester` role by default; the public registration endpoint does not allow users to assign themselves privileged roles.

### Login

`POST /login`

Request JSON:
```json
{
  "email": "tester@example.com",
  "password": "your-password"
}
```

Successful response:
```json
{
  "access_token": "<your-jwt-access-token>",
  "token_type": "bearer",
  "role": "Tester"
}
```

The token expires after 30 minutes. For protected endpoints, send:

```http
Authorization: Bearer <your-jwt-access-token>
```

In Swagger UI, click **Authorize** and enter the token. If the UI asks for the scheme, use `Bearer` followed by the token.

### Create a project

`POST /projects`

```json
{
  "name": "E-Commerce Website Testing",
  "description": "Manage test activities for the e-commerce application.",
  "status": "Active"
}
```

Allowed statuses: `Active`, `Completed`, and `On Hold`.

### Update a project

`PUT /projects/{project_id}`

Send only the fields you want to change:

```json
{
  "status": "Completed"
}
```

### Record a test execution

`POST /test-cases/{test_case_id}/executions`

```json
{
  "status": "Fail",
  "actual_result": "The page displayed an unexpected error after submitting the form.",
  "notes": "Chrome, Windows 11"
}
```

Allowed results: `Pass`, `Fail`, and `Blocked`. Execution history is available from the test-case endpoint or the project executions endpoint.

### Report a defect

`POST /projects/{project_id}/defects`

```json
{
  "title": "Submit button does not show validation message",
  "description": "The form stays on the same page without explaining the invalid input.",
  "steps_to_reproduce": "1. Open the form.\n2. Leave the required field empty.\n3. Click Submit.",
  "severity": "Medium",
  "priority": "High",
  "test_execution_id": 12
}
```

Severity and priority values: `Low`, `Medium`, `High`, `Critical`. Defect status values: `Open`, `In Progress`, `Resolved`, `Closed`. When a test execution is supplied, it must belong to the same project and have a `Fail` result.

### Project access

Users can view, update, or delete only projects they own. Requests for projects owned by another user return `404 Not Found`.

## Security Notes

- Protected project routes require a valid JWT bearer token.
- New passwords are hashed with bcrypt.
- Legacy SHA-256 password hashes are supported for login and upgraded after successful authentication.
- The JWT secret must be configured securely before deployment.
- This is a learning project and needs further security review and automated testing before production use.

## Roadmap

- [x] FastAPI backend setup.
- [x] SQLite database integration.
- [x] User registration and login.
- [x] JWT authentication.
- [x] Bcrypt password hashing and legacy hash upgrade.
- [x] Project create, read, update, and delete APIs.
- [x] Ownership checks for project access.
- [x] Startup migration for existing project databases.
- [ ] Team and project member management.
- [x] Test case management CRUD and project ownership checks.
- [x] Test execution and result tracking.
- [x] Bug and defect tracking.
- [x] React frontend foundation with authentication and project management dashboard.
- [x] Automated CI checks for backend imports and frontend production builds.
- [ ] Dedicated automated API and end-to-end test coverage.
- [ ] Deployment.


