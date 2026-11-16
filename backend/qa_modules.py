from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import SessionLocal

router = APIRouter(tags=["QA workflow"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def current_user(email: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")
    return user


def owned_project(project_id: int, db: Session, user: models.User):
    project = db.query(models.Project).filter(
        models.Project.id == project_id, models.Project.owner_id == user.id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def owned_plan(plan_id: int, db: Session, user: models.User):
    plan = db.query(models.TestPlan).join(
        models.Project, models.TestPlan.project_id == models.Project.id
    ).filter(models.TestPlan.id == plan_id, models.Project.owner_id == user.id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Test plan not found")
    return plan


def owned_run(run_id: int, db: Session, user: models.User):
    run = db.query(models.TestRun).join(
        models.Project, models.TestRun.project_id == models.Project.id
    ).filter(models.TestRun.id == run_id, models.Project.owner_id == user.id).first()
    if run is None:
        raise HTTPException(status_code=404, detail="Test run not found")
    return run


def owned_defect(defect_id: int, db: Session, user: models.User):
    defect = db.query(models.Defect).join(
        models.Project, models.Defect.project_id == models.Project.id
    ).filter(models.Defect.id == defect_id, models.Project.owner_id == user.id).first()
    if defect is None:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect


def audit(db: Session, project_id: int, user_id: int, action: str, entity: str, entity_id: int | None, details: str = ""):
    db.add(models.AuditLog(
        project_id=project_id, user_id=user_id, action=action,
        entity_type=entity, entity_id=entity_id, details=details
    ))


class PlanIn(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    objective: str | None = None
    scope: str | None = None
    status: Literal["Draft", "Approved", "In Progress", "Completed", "Archived"] = "Draft"
    start_date: str | None = None
    end_date: str | None = None
    test_case_ids: list[int] = []


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    objective: str | None = None
    scope: str | None = None
    status: Literal["Draft", "Approved", "In Progress", "Completed", "Archived"] | None = None
    start_date: str | None = None
    end_date: str | None = None
    test_case_ids: list[int] | None = None


class RunIn(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    plan_id: int | None = None
    environment: str | None = Field(default=None, max_length=100)


class ResultIn(BaseModel):
    test_case_id: int
    status: Literal["Passed", "Failed", "Blocked", "Not Run"]
    actual_result: str | None = None
    notes: str | None = None


class RunStatusIn(BaseModel):
    status: Literal["In Progress", "Completed", "Aborted"]


class DefectIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    test_case_id: int | None = None
    test_run_id: int | None = None
    steps_to_reproduce: str | None = None
    expected_result: str | None = None
    actual_result: str | None = None
    severity: Literal["Low", "Medium", "High", "Critical"] = "Medium"
    priority: Literal["Low", "Medium", "High", "Critical"] = "Medium"
    status: Literal["Open", "In Progress", "Resolved", "Closed", "Reopened"] = "Open"
    assigned_to: str | None = Field(default=None, max_length=254)


class DefectUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    test_case_id: int | None = None
    test_run_id: int | None = None
    steps_to_reproduce: str | None = None
    expected_result: str | None = None
    actual_result: str | None = None
    severity: Literal["Low", "Medium", "High", "Critical"] | None = None
    priority: Literal["Low", "Medium", "High", "Critical"] | None = None
    status: Literal["Open", "In Progress", "Resolved", "Closed", "Reopened"] | None = None
    assigned_to: str | None = Field(default=None, max_length=254)


def plan_payload(plan, db):
    case_ids = [row.test_case_id for row in db.query(models.TestPlanCase).filter(models.TestPlanCase.plan_id == plan.id).all()]
    return {
        "id": plan.id, "project_id": plan.project_id, "name": plan.name,
        "objective": plan.objective, "scope": plan.scope, "status": plan.status,
        "start_date": plan.start_date, "end_date": plan.end_date,
        "test_case_ids": case_ids, "created_at": plan.created_at
    }


def run_payload(run, db):
    results = db.query(models.TestResult).filter(models.TestResult.run_id == run.id).all()
    counts = {key: sum(1 for item in results if item.status == key) for key in ["Passed", "Failed", "Blocked", "Not Run"]}
    return {
        "id": run.id, "project_id": run.project_id, "plan_id": run.plan_id,
        "name": run.name, "environment": run.environment, "status": run.status,
        "started_at": run.started_at, "completed_at": run.completed_at,
        "total": len(results), "counts": counts, "results": results
    }


@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    project_ids = [row.id for row in db.query(models.Project.id).filter(models.Project.owner_id == user.id).all()]
    if not project_ids:
        return {"projects": 0, "test_cases": 0, "plans": 0, "runs": 0, "defects": 0,
                "open_defects": 0, "results": {"Passed": 0, "Failed": 0, "Blocked": 0, "Not Run": 0}}
    case_count = db.query(func.count(models.TestCase.id)).filter(models.TestCase.project_id.in_(project_ids)).scalar() or 0
    plan_count = db.query(func.count(models.TestPlan.id)).filter(models.TestPlan.project_id.in_(project_ids)).scalar() or 0
    run_count = db.query(func.count(models.TestRun.id)).filter(models.TestRun.project_id.in_(project_ids)).scalar() or 0
    defect_count = db.query(func.count(models.Defect.id)).filter(models.Defect.project_id.in_(project_ids)).scalar() or 0
    open_count = db.query(func.count(models.Defect.id)).filter(
        models.Defect.project_id.in_(project_ids), models.Defect.status.in_(["Open", "In Progress", "Reopened"])
    ).scalar() or 0
    results = {}
    for key in ["Passed", "Failed", "Blocked", "Not Run"]:
        results[key] = db.query(func.count(models.TestResult.id)).join(
            models.TestRun, models.TestResult.run_id == models.TestRun.id
        ).filter(models.TestRun.project_id.in_(project_ids), models.TestResult.status == key).scalar() or 0
    return {"projects": len(project_ids), "test_cases": case_count, "plans": plan_count,
            "runs": run_count, "defects": defect_count, "open_defects": open_count, "results": results}


@router.get("/projects/{project_id}/test-plans")
def list_plans(project_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    owned_project(project_id, db, user)
    rows = db.query(models.TestPlan).filter(models.TestPlan.project_id == project_id).order_by(models.TestPlan.created_at.desc()).all()
    return [plan_payload(row, db) for row in rows]


@router.post("/projects/{project_id}/test-plans", status_code=201)
def create_plan(project_id: int, payload: PlanIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    owned_project(project_id, db, user)
    plan = models.TestPlan(project_id=project_id, name=payload.name.strip(), objective=payload.objective,
        scope=payload.scope, status=payload.status, start_date=payload.start_date, end_date=payload.end_date)
    db.add(plan); db.flush()
    ids = set(payload.test_case_ids)
    if ids:
        valid = {row.id for row in db.query(models.TestCase).filter(
            models.TestCase.project_id == project_id, models.TestCase.id.in_(ids)).all()}
        if valid != ids:
            db.rollback(); raise HTTPException(status_code=400, detail="All selected test cases must belong to this project")
        db.add_all([models.TestPlanCase(plan_id=plan.id, test_case_id=case_id) for case_id in ids])
    audit(db, project_id, user.id, "created", "test_plan", plan.id, plan.name)
    db.commit(); db.refresh(plan)
    return plan_payload(plan, db)


@router.put("/test-plans/{plan_id}")
def update_plan(plan_id: int, payload: PlanUpdate, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    plan = owned_plan(plan_id, db, user)
    data = payload.model_dump(exclude_unset=True)
    case_ids = data.pop("test_case_ids", None)
    for key, value in data.items():
        setattr(plan, key, value.strip() if key == "name" and value else value)
    if case_ids is not None:
        ids = set(case_ids)
        valid = {row.id for row in db.query(models.TestCase).filter(
            models.TestCase.project_id == plan.project_id, models.TestCase.id.in_(ids)).all()} if ids else set()
        if valid != ids:
            raise HTTPException(status_code=400, detail="All selected test cases must belong to this project")
        db.query(models.TestPlanCase).filter(models.TestPlanCase.plan_id == plan.id).delete()
        db.add_all([models.TestPlanCase(plan_id=plan.id, test_case_id=case_id) for case_id in ids])
    audit(db, plan.project_id, user.id, "updated", "test_plan", plan.id, plan.name)
    db.commit(); db.refresh(plan)
    return plan_payload(plan, db)


@router.delete("/test-plans/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    plan = owned_plan(plan_id, db, user)
    audit(db, plan.project_id, user.id, "deleted", "test_plan", plan.id, plan.name)
    db.query(models.TestRun).filter(models.TestRun.plan_id == plan.id).update({models.TestRun.plan_id: None}, synchronize_session=False)
    db.query(models.TestPlanCase).filter(models.TestPlanCase.plan_id == plan.id).delete()
    db.delete(plan); db.commit()
    return {"message": "Test plan deleted"}


@router.get("/projects/{project_id}/test-runs")
def list_runs(project_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    owned_project(project_id, db, user)
    rows = db.query(models.TestRun).filter(models.TestRun.project_id == project_id).order_by(models.TestRun.started_at.desc()).all()
    return [run_payload(row, db) for row in rows]


@router.post("/projects/{project_id}/test-runs", status_code=201)
def create_run(project_id: int, payload: RunIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    owned_project(project_id, db, user)
    case_ids = []
    if payload.plan_id is not None:
        plan = owned_plan(payload.plan_id, db, user)
        if plan.project_id != project_id:
            raise HTTPException(status_code=400, detail="Test plan belongs to another project")
        case_ids = [row.test_case_id for row in db.query(models.TestPlanCase).filter(models.TestPlanCase.plan_id == plan.id).all()]
    else:
        case_ids = [row.id for row in db.query(models.TestCase).filter(models.TestCase.project_id == project_id).all()]
    run = models.TestRun(project_id=project_id, plan_id=payload.plan_id, name=payload.name.strip(), environment=payload.environment)
    db.add(run); db.flush()
    db.add_all([models.TestResult(run_id=run.id, test_case_id=case_id) for case_id in case_ids])
    audit(db, project_id, user.id, "created", "test_run", run.id, run.name)
    db.commit(); db.refresh(run)
    return run_payload(run, db)


@router.get("/test-runs/{run_id}")
def get_run(run_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    return run_payload(owned_run(run_id, db, user), db)


@router.patch("/test-runs/{run_id}")
def update_run_status(run_id: int, payload: RunStatusIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    run = owned_run(run_id, db, user)
    run.status = payload.status
    run.completed_at = datetime.now(timezone.utc) if payload.status in ["Completed", "Aborted"] else None
    audit(db, run.project_id, user.id, "status_changed", "test_run", run.id, run.status)
    db.commit(); db.refresh(run)
    return run_payload(run, db)


@router.post("/test-runs/{run_id}/results")
def record_result(run_id: int, payload: ResultIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    run = owned_run(run_id, db, user)
    case = db.query(models.TestCase).filter(
        models.TestCase.id == payload.test_case_id, models.TestCase.project_id == run.project_id
    ).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Test case not found in this project")
    result = db.query(models.TestResult).filter(
        models.TestResult.run_id == run.id, models.TestResult.test_case_id == case.id
    ).first()
    if result is None:
        result = models.TestResult(run_id=run.id, test_case_id=case.id)
        db.add(result)
    result.status = payload.status
    result.actual_result = payload.actual_result
    result.notes = payload.notes
    result.executed_at = datetime.now(timezone.utc)
    db.flush()
    if run.status != "In Progress":
        run.status = "In Progress"; run.completed_at = None
    audit(db, run.project_id, user.id, "result_recorded", "test_result", result.id, f"{case.title}: {payload.status}")
    db.commit(); db.refresh(result)
    return result


@router.get("/projects/{project_id}/defects")
def list_defects(project_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    owned_project(project_id, db, user)
    return db.query(models.Defect).filter(models.Defect.project_id == project_id).order_by(models.Defect.created_at.desc()).all()


@router.post("/projects/{project_id}/defects", status_code=201)
def create_defect(project_id: int, payload: DefectIn, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    owned_project(project_id, db, user)
    data = payload.model_dump()
    if data["test_case_id"] is not None:
        case = db.query(models.TestCase).filter(models.TestCase.id == data["test_case_id"], models.TestCase.project_id == project_id).first()
        if case is None: raise HTTPException(status_code=400, detail="Test case must belong to this project")
    if data["test_run_id"] is not None:
        run = db.query(models.TestRun).filter(models.TestRun.id == data["test_run_id"], models.TestRun.project_id == project_id).first()
        if run is None: raise HTTPException(status_code=400, detail="Test run must belong to this project")
    defect = models.Defect(project_id=project_id, **data)
    db.add(defect); db.flush()
    audit(db, project_id, user.id, "created", "defect", defect.id, defect.title)
    db.commit(); db.refresh(defect)
    return defect


@router.put("/defects/{defect_id}")
def update_defect(defect_id: int, payload: DefectUpdate, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    defect = owned_defect(defect_id, db, user)
    data = payload.model_dump(exclude_unset=True)
    if data.get("test_case_id") is not None:
        case = db.query(models.TestCase).filter(models.TestCase.id == data["test_case_id"], models.TestCase.project_id == defect.project_id).first()
        if case is None: raise HTTPException(status_code=400, detail="Test case must belong to this project")
    if data.get("test_run_id") is not None:
        run = db.query(models.TestRun).filter(models.TestRun.id == data["test_run_id"], models.TestRun.project_id == defect.project_id).first()
        if run is None: raise HTTPException(status_code=400, detail="Test run must belong to this project")
    for key, value in data.items(): setattr(defect, key, value)
    audit(db, defect.project_id, user.id, "updated", "defect", defect.id, defect.title)
    db.commit(); db.refresh(defect)
    return defect


@router.delete("/defects/{defect_id}")
def delete_defect(defect_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    defect = owned_defect(defect_id, db, user)
    audit(db, defect.project_id, user.id, "deleted", "defect", defect.id, defect.title)
    db.delete(defect); db.commit()
    return {"message": "Defect deleted"}


@router.get("/projects/{project_id}/activity")
def project_activity(project_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    owned_project(project_id, db, user)
    return db.query(models.AuditLog).filter(models.AuditLog.project_id == project_id).order_by(models.AuditLog.created_at.desc()).limit(100).all()


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    """Return recent QA activity for the authenticated user's projects."""
    rows = db.query(models.AuditLog, models.Project.name).join(
        models.Project, models.AuditLog.project_id == models.Project.id
    ).filter(models.Project.owner_id == user.id).order_by(
        models.AuditLog.created_at.desc()
    ).limit(50).all()
    return [
        {
            "id": log.id,
            "project_id": log.project_id,
            "project_name": project_name,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "details": log.details,
            "created_at": log.created_at,
        }
        for log, project_name in rows
    ]
