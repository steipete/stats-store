# Stats Store Testing

Vitest tests live under `tests/`; the HTTP integration script runs separately against a configured server.

## Unit Tests (Vitest)

### Running Tests

```bash
# Run all tests
pnpm test

# Run API tests only
pnpm test:api

# Run component tests only
pnpm test:components

# Watch mode for development
pnpm test:watch

# With coverage
pnpm test:coverage

# Interactive UI
pnpm test:ui
```

### Test Structure

- **API Tests** (`tests/api/`): Test API route handlers in isolation
- **Component Tests** (`tests/components/`): Test React components
- **Setup Files**:
  - `setup.node.ts`: Node environment setup for the `api` Vitest project
  - `setup.ts`: jsdom environment setup for the `ui` Vitest project

### Key Test Files

- `appcast.test.ts`: Comprehensive tests for the appcast proxy endpoint including:
  - User-Agent parsing
  - Parameter prioritization (bundleIdentifier > appName > User-Agent)
  - New Sparkle telemetry fields
  - Error handling

## Integration Tests

### Node.js Integration Test

```bash
# Run against local dev server
node tests/appcast-integration.test.mjs

# Run against production
TEST_URL=https://stats.store node tests/appcast-integration.test.mjs
```

This tests the actual HTTP endpoint with real requests. Use a test deployment: successful requests write telemetry, and the suite expects the registered Vibe Tunnel app and its upstream feeds. Do not use the production command for routine validation.

### Shell Script Tests

```bash
# Quick smoke tests
./test-appcast-proxy.sh
```

Useful for:

- Quick manual testing during development
- Debugging with curl output
- Testing against different environments

## Testing the Appcast Proxy

The appcast proxy is the most complex endpoint, handling:

1. **Multiple identification methods**:
   - `bundleIdentifier` parameter (legacy)
   - `appName` parameter (Sparkle standard)
   - User-Agent parsing (fallback for most requests)

2. **Sparkle's "once per week" behavior**:
   - Most requests come without query parameters
   - User-Agent is the only reliable identifier
   - Test both scenarios

3. **Example test scenarios**:

```javascript
// Full system profile (sent once per week)
GET /api/v1/appcast/appcast.xml?appName=MyApp&appVersion=123&osVersion=14.0&cpu64bit=1...
User-Agent: MyApp/2.1.3 Sparkle/2.0.0

// Typical request (no parameters)
GET /api/v1/appcast/appcast.xml
User-Agent: MyApp/2.1.3 Sparkle/2.0.0
```

## Best Practices

1. **Mock External Dependencies**: Database queries and fetch calls
2. **Test Edge Cases**: Missing parameters, malformed User-Agents
3. **Verify Telemetry**: Ensure all data is captured correctly
4. **Test Priority Logic**: bundleIdentifier > appName > User-Agent

## CI/CD Integration

Tests run automatically on:

- Pull requests
- Commits to main branch
- Before deployment

See `.github/workflows/ci.yml`. Linux runs coverage and the lint/type gates; Linux, macOS, and Windows all run the tests and production build.

## Database checks

CI bootstraps every SQL migration in a disposable PostgreSQL 17 database and checks the report triggers and cached aggregates. To run locally with a fresh test database and `psql` installed:

```sh
PGHOST=localhost PGUSER=postgres PGDATABASE=stats_store_test bash scripts/test-database.sh
```

The database name must end in `_test`. Use a newly created disposable database: the script applies the full bootstrap schema before running the transactional checks in `tests/database/`.
