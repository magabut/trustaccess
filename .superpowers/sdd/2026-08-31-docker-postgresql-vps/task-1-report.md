# Task 1 Report

## Status

Task 1 implemented: PostgreSQL client dependencies and a Vitest PostgreSQL adapter contract harness were added. No PostgreSQL server was available, so the integration contract test skips when `TEST_DATABASE_URL` is unset.

## Files Changed

- `app/package.json`: added runtime dependency `pg` and development dependency `@types/pg`.
- `app/package-lock.json`: regenerated with Node 22 through npm installs.
- `app/tests/test-db.ts`: added a test-only helper that reads `TEST_DATABASE_URL`, delegates construction to the future `initDb` adapter, and closes it when supported.
- `app/tests/db-adapter.test.ts`: added the parameterized insert/select and generated-ID adapter contract, skipped without `TEST_DATABASE_URL`.

## Commands and Outputs

Node/npm:

```text
v22.23.2
10.9.8
```

Dependency installation:

```text
added 14 packages, and audited 495 packages in 1s
found 0 vulnerabilities
added 1 package, and audited 496 packages in 1s
found 0 vulnerabilities
```

Required focused test without a database:

```text
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test -- tests/db-adapter.test.ts
Test Files  1 skipped (1)
Tests       1 skipped (1)
```

Red-phase check with a dummy `TEST_DATABASE_URL` against the existing SQLite implementation:

```text
TEST_DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/test" ... npm test -- tests/db-adapter.test.ts
FAIL ... db.close is not a function
```

This run reached teardown and exposed that the current SQLite session has no `close()` method; it did not establish PostgreSQL connectivity or execute the intended PostgreSQL query contract. The dummy URL was not used to fabricate or provision PostgreSQL.

Full baseline test run:

```text
FAIL tests/db.test.ts (2 tests)
  (0 , seedDemo) is not a function
PASS 4 other test files
SKIP tests/db-adapter.test.ts (1 test)
2 failed, 14 passed, 1 skipped
```

## Baseline Failure

The pre-existing `app/tests/db.test.ts` imports `seedDemo` from `app/src/lib/db.ts`, but that export is absent in the current worktree. This is unrelated to Task 1 and was not modified. The adapter harness does not require changing it.

## Concerns and Limitations

- The PostgreSQL adapter itself is intentionally not implemented in Task 1; it is the scope of Task 3. Consequently, the integration test can only run after that adapter exists and a disposable PostgreSQL URL is supplied.
- Without `TEST_DATABASE_URL`, Vitest reports the adapter contract as skipped rather than executing against a server.
- The helper now requires the future adapter's `close()` contract and fails clearly if it is absent; it avoids changing production database configuration.

## Review Fixes

- `app/tests/test-db.ts` now narrows `DBSession` through a runtime `close()` contract check instead of an unsafe cast.
- Teardown requires a validated `TestDBSession` and always calls `close()`.
- Removed the unrelated `hasInstallScript` lockfile metadata change from the existing `better-sqlite3` entry while retaining all `pg` and `@types/pg` dependency changes.

Review-fix focused run without a database:

```text
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test -- tests/db-adapter.test.ts
Test Files  1 skipped (1)
Tests       1 skipped (1)
```

Review-fix check with a dummy URL (no PostgreSQL server provisioned):

```text
TEST_DATABASE_URL="postgresql://user:pass@127.0.0.1:5432/test" ... npm test -- tests/db-adapter.test.ts
FAIL ... PostgreSQL test adapter must provide DBSession.close()
```

## TypeScript Narrowing Fix

The lifecycle guard now captures the narrowed callable `close` property and returns a concrete `TestDBSession` wrapper. This removes the TypeScript error caused by returning an object whose `close` property remained `unknown`, without using an unsafe cast.

Focused test after the narrowing fix:

```text
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test -- tests/db-adapter.test.ts
Test Files  1 skipped (1)
Tests       1 skipped (1)
```

TypeScript check:

```text
PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx tsc --noEmit
TypeScript: 20 errors in 11 files
```

The reported errors are pre-existing baseline errors in application files and `tests/db.test.ts`; no error was reported for `tests/test-db.ts`.
