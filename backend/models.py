from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint

from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="Tester", nullable=False)


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="Active", nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class TestCase(Base):
    __tablename__ = "test_cases"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    preconditions = Column(Text, nullable=True)
    steps = Column(Text, nullable=False)
    expected_result = Column(Text, nullable=False)
    priority = Column(String(20), default="Medium", nullable=False)
    status = Column(String(20), default="Draft", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class TestPlan(Base):
    __tablename__ = "test_plans"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    name = Column(String(180), nullable=False)
    objective = Column(Text, nullable=True)
    scope = Column(Text, nullable=True)
    status = Column(String(24), default="Draft", nullable=False)
    start_date = Column(String(10), nullable=True)
    end_date = Column(String(10), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class TestPlanCase(Base):
    __tablename__ = "test_plan_cases"
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("test_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    __table_args__ = (UniqueConstraint("plan_id", "test_case_id", name="uq_plan_test_case"),)


class TestRun(Base):
    __tablename__ = "test_runs"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("test_plans.id"), nullable=True, index=True)
    name = Column(String(180), nullable=False)
    environment = Column(String(100), nullable=True)
    status = Column(String(24), default="In Progress", nullable=False)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class TestResult(Base):
    __tablename__ = "test_results"
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=False, index=True)
    status = Column(String(20), default="Not Run", nullable=False)
    actual_result = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    executed_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    __table_args__ = (UniqueConstraint("run_id", "test_case_id", name="uq_run_test_case"),)


class Defect(Base):
    __tablename__ = "defects"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id"), nullable=True, index=True)
    test_run_id = Column(Integer, ForeignKey("test_runs.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    steps_to_reproduce = Column(Text, nullable=True)
    expected_result = Column(Text, nullable=True)
    actual_result = Column(Text, nullable=True)
    severity = Column(String(20), default="Medium", nullable=False)
    priority = Column(String(20), default="Medium", nullable=False)
    status = Column(String(24), default="Open", nullable=False)
    assigned_to = Column(String(254), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(80), nullable=False)
    entity_type = Column(String(40), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
