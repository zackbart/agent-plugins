# Context Packet Schema

Required fields the orchestrator must populate before spawning a session. The spawned session cannot run autonomously without all of these. If any field cannot be determined from the user's request, the orchestrator must ask before spawning.

## Required Fields

| Field | Description | Example |
|---|---|---|
| `task` | Clear description of what needs to be done | "Add email validation to the signup form" |
| `project_dir` | Absolute path to the project directory | `/Users/zack/Dev/projects/myapp` |
| `success_criteria` | What done looks like — observable outcomes | "Signup rejects invalid emails, existing tests pass, new validation test passes" |
| `constraints` | Anything the session must not do | "Do not modify the User model schema, do not change the API contract" |
| `branch_name` | Feature branch to work on | `feat/email-validation` |
| `test_command` | How to run the test suite | `npm test` or `pytest` |
| `pr_target` | Branch the PR should target | `main` |

## Format

The context packet is passed as structured text in the spawn command's task argument:

```
TASK: Add email validation to the signup form
PROJECT_DIR: /Users/zack/Dev/projects/myapp
SUCCESS_CRITERIA: Signup rejects invalid emails, existing tests pass, new validation test passes
CONSTRAINTS: Do not modify the User model schema, do not change the API contract
BRANCH_NAME: feat/email-validation
TEST_COMMAND: npm test
PR_TARGET: main
```

## Field Guidelines

**task**: Write as a clear, specific instruction. "Add email validation to the signup form" is good. "Fix the form" is not — too ambiguous.

**success_criteria**: Must be verifiable by the session. "Tests pass" is verifiable. "Code is clean" is not.

**constraints**: Include anything that would be surprising to violate. If a session should not touch the database schema, say so. If certain files are off-limits, list them. An empty constraints field means "no special restrictions beyond normal best practices."

**test_command**: Must be a single command that runs the relevant test suite. If the project has multiple test commands, provide the one most relevant to the task, or chain them: `npm run lint && npm test`.
