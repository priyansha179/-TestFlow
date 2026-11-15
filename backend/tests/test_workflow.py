import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
import qa_modules
import models
from database import Base


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[main.get_db] = override_db
    main.app.dependency_overrides[qa_modules.get_db] = override_db
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def register_and_login(client, email="qa@example.com"):
    response = client.post("/register", json={"email": email, "password": "StrongPass123"})
    assert response.status_code == 201
    login = client.post("/login", json={"email": email, "password": "StrongPass123"})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_health_and_authentication(client):
    assert client.get("/health").status_code == 200
    assert client.get("/projects").status_code == 401


def test_complete_qa_workflow(client):
    headers = register_and_login(client)
    project = client.post("/projects", headers=headers, json={
        "name": "Demo shop", "description": "QA practice project", "status": "Active"
    })
    assert project.status_code == 201
    project_id = project.json()["id"]

    case = client.post(f"/projects/{project_id}/test-cases", headers=headers, json={
        "title": "Valid login", "steps": "Open login; enter valid credentials",
        "expected_result": "Dashboard is displayed", "priority": "High", "status": "Ready"
    })
    assert case.status_code == 201
    case_id = case.json()["id"]

    plan = client.post(f"/projects/{project_id}/test-plans", headers=headers, json={
        "name": "Smoke test", "objective": "Verify critical paths", "test_case_ids": [case_id]
    })
    assert plan.status_code == 201
    plan_id = plan.json()["id"]

    run = client.post(f"/projects/{project_id}/test-runs", headers=headers, json={
        "name": "Smoke run 1", "plan_id": plan_id, "environment": "Staging"
    })
    assert run.status_code == 201
    run_id = run.json()["id"]
    assert run.json()["total"] == 1

    result = client.post(f"/test-runs/{run_id}/results", headers=headers, json={
        "test_case_id": case_id, "status": "Failed",
        "actual_result": "Login returns an error"
    })
    assert result.status_code == 200
    assert result.json()["status"] == "Failed"

    defect = client.post(f"/projects/{project_id}/defects", headers=headers, json={
        "title": "Login fails with valid account", "test_case_id": case_id,
        "test_run_id": run_id, "severity": "High", "priority": "Critical",
        "steps_to_reproduce": "Open login and submit valid account"
    })
    assert defect.status_code == 201
    assert defect.json()["status"] == "Open"

    summary = client.get("/dashboard/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["projects"] == 1
    assert summary.json()["defects"] == 1
    assert summary.json()["results"]["Failed"] == 1

    activity = client.get(f"/projects/{project_id}/activity", headers=headers)
    assert activity.status_code == 200
    assert len(activity.json()) >= 4


def test_users_cannot_access_other_users_projects(client):
    owner_headers = register_and_login(client, "owner@example.com")
    project = client.post("/projects", headers=owner_headers, json={"name": "Private project"})
    project_id = project.json()["id"]

    other_headers = register_and_login(client, "other@example.com")
    assert client.get(f"/projects/{project_id}", headers=other_headers).status_code == 404
    assert client.get(f"/projects/{project_id}/test-plans", headers=other_headers).status_code == 404
    assert client.get(f"/projects/{project_id}/defects", headers=other_headers).status_code == 404
