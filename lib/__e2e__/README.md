# End-to-End Tests

This repository contains two distinct sets of end-to-end (E2E) tests.  
Although both make real network requests, they serve very different purposes and intentionally test different things.

---

## Test Suites Overview

| Folder                | Purpose                                            | Commands (from lib directory)  |
| --------------------- | -------------------------------------------------- | ------------------------------ |
| `flows`               | Validate full user flows using mocked dependencies | `test:e2e:flows`               |
| `backendConnectivity` | Verify requests reach the real backend             | `test:e2e:backendConnectivity` |

---

## `flows` — Full Flow E2E Tests (Mocked Backend)

The tests in the `flows` folder validate complete user journeys such as:

- Sell

### How these tests work

- **Mock Backend API**  
  These tests run against a mock backend API that returns controlled, predictable responses.

  The real backend is not suitable for flow testing, as it will always error regardless of the request payload.  
  Using a mock backend allows us to:

  - Make real HTTP requests
  - Control response data
  - Reliably test full flows end-to-end

  _Please Note_ we are restricted by what endpoints have been mocked

- **Wallet API Simulator**  
  A simulator is used for the `wallet-api`, which mimics responses from a Ledger device.  
  This removes the need for real hardware while still exercising the full flow logic.

### What these tests validate

- End-to-end request/response behavior
- Multi-step business logic
- Integration between SDK, wallet API, and backend (in a controlled environment)

---

## `backendConnectivity` — Backend Connectivity Tests (Real Backend)

The tests in the `backendConnectivity` folder exist to ensure that the SDK is correctly configured to talk to the **real backend**.

### Why these tests exist

We have previously encountered issues where:

- The backend URL was updated incorrectly in the SDK
- Requests silently failed because they were pointing to the wrong environment

These tests act as a safety net to catch configuration issues early.

### How these tests work

- Requests are sent to the **real backend**
- The backend is expected to return a **`400` response**
  - A `400` response confirms that the request reached the correct backend
  - A `404` response would indicate an incorrect or missing endpoint

A failing response is expected — as long as it is **not a 404**, the test passes.

### What these tests validate

- Backend URL configuration
- Correct routing to the intended backend environment

### What these tests do _not_ validate

- Business logic
- Successful API responses
- End-to-end user flows

---

## Summary

- Use **`flows`** tests to validate full application behavior using mocked dependencies.
- Use **`backendConnectivity`** tests to ensure the SDK is still pointing at the correct backend.

Both test suites are intentionally different and complementary, and both are required for confidence in the system.
