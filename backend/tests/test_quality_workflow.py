from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
import models
from database import Base


TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


def override_get_db() -> Generator:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def qa_client():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)

    db = TestingSessionLocal()
    user = models.User(email="qa-test@example.com", hashed_password="test-hash")
    db.add(user)
    db.flush()

    project = models.Project(
        name="Automated QA Test Project",
        description="Temporary project created by pytest.",
        status="Active",
        owner_id=user.id,
    )
    db.add(project)
    db.flush()

    test_case = models.TestCase(
        project_id=project.id,
        title="Verify sample form validation",
        description="API workflow test case.",
        preconditions="The test environment is available.",
        steps="1. Open the form.\n2. Submit invalid data.",
        expected_result="The form should show a validation message.",
        priority="High",
        status="Ready",
    )
    db.add(test_case)
    db.commit()

    project_id = project.id
    test_case_id = test_case.id
    db.close()

    main.app.dependency_overrides[main.get_db] = override_get_db
    main.app.dependency_overrides[main.get_authenticated_user] = lambda: user

    with TestClient(main.app) as client:
        yield client, project_id, test_case_id

    main.app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=TEST_ENGINE)


def test_execution_and_defect_workflow(qa_client):
    client, project_id, test_case_id = qa_client

    failed_run = client.post(
        f"/test-cases/{test_case_id}/executions",
        json={
            "status": "Fail",
            "actual_result": "The form accepted invalid data.",
            "notes": "Automated API test run.",
        },
    )
    assert failed_run.status_code == 201
    execution_id = failed_run.json()["id"]

    history = client.get(f"/test-cases/{test_case_id}/executions")
    assert history.status_code == 200
    assert len(history.json()) == 1
    assert history.json()[0]["status"] == "Fail"

    project_history = client.get(f"/projects/{project_id}/executions")
    assert project_history.status_code == 200
    assert project_history.json()[0]["id"] == execution_id

    defect_response = client.post(
        f"/projects/{project_id}/defects",
        json={
            "title": "Validation message is missing",
            "description": "Invalid data is accepted without feedback.",
            "steps_to_reproduce": "1. Submit invalid data.\n2. Observe the result.",
            "severity": "High",
            "priority": "High",
            "test_execution_id": execution_id,
        },
    )
    assert defect_response.status_code == 201
    defect_id = defect_response.json()["id"]
    assert defect_response.json()["test_execution_id"] == execution_id

    pass_run = client.post(
        f"/test-cases/{test_case_id}/executions",
        json={"status": "Pass", "actual_result": "A separate passing run."},
    )
    assert pass_run.status_code == 201

    rejected_defect = client.post(
        f"/projects/{project_id}/defects",
        json={
            "title": "Must not link a passing run",
            "description": "The API should reject this association.",
            "steps_to_reproduce": "1. Link the passing run.",
            "test_execution_id": pass_run.json()["id"],
        },
    )
    assert rejected_defect.status_code == 400

    updated = client.put(
        f"/defects/{defect_id}",
        json={"status": "In Progress", "priority": "Critical"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "In Progress"
    assert updated.json()["priority"] == "Critical"

    defect_list = client.get(f"/projects/{project_id}/defects")
    assert defect_list.status_code == 200
    assert len(defect_list.json()) == 1

    deleted = client.delete(f"/defects/{defect_id}")
    assert deleted.status_code == 200
    assert client.get(f"/projects/{project_id}/defects").json() == []
