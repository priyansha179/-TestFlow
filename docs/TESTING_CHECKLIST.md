# QA Management System – Test Checklist

Use this checklist during manual regression and when reviewing a pull request.

## Authentication
- [ ] Register with a valid email and password.
- [ ] Reject duplicate email registration.
- [ ] Reject passwords shorter than 8 characters.
- [ ] Login with valid credentials.
- [ ] Reject an incorrect password with a generic error.
- [ ] Reject protected API requests without a bearer token.
- [ ] Reject expired or malformed tokens.
- [ ] Verify a user cannot access another user's project by changing its ID.

## Projects and test cases
- [ ] Create, view, update and delete a project.
- [ ] Search and filter projects in the dashboard.
- [ ] Create a test case with title, preconditions, steps and expected result.
- [ ] Update priority and Draft/Ready status.
- [ ] Verify test cases are isolated by project ownership.
- [ ] Verify deleting a project removes its dependent QA records.

## Test plans
- [ ] Create a plan with objective, scope and dates.
- [ ] Link multiple test cases from the same project.
- [ ] Reject test case IDs belonging to another project.
- [ ] Update plan details and selected test cases.
- [ ] Delete a plan and verify historical runs remain readable.

## Test execution
- [ ] Create a run from a plan.
- [ ] Create a run using all project test cases.
- [ ] Record Passed, Failed, Blocked and Not Run outcomes.
- [ ] Update an outcome and verify counts refresh.
- [ ] Complete and reopen a run.
- [ ] Reject test case IDs outside the run's project.

## Defects and reporting
- [ ] Create a defect with reproduction steps and expected/actual results.
- [ ] Set severity, priority, status and assignee.
- [ ] Link a defect to a project test case and run.
- [ ] Update and delete a defect.
- [ ] Verify dashboard totals and defect severity summaries.
- [ ] Verify project activity records plan, run and defect actions.

## Browser and responsive checks
- [ ] Verify registration, login and logout flows.
- [ ] Verify workflow tabs at desktop and mobile widths.
- [ ] Verify empty, loading and error states.
- [ ] Verify forms prevent missing required fields.
- [ ] Verify browser refresh retains a valid session and protected routes.
