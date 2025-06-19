# Stats Store Testing

This project uses multiple testing approaches to ensure reliability:

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
  - `setup.node.ts`: Node environment setup for API tests
  - `setup.ts`: Browser environment setup for component tests

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

This tests the actual HTTP endpoint with real requests.

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

Configure in `.github/workflows/test.yml` or your CI platform.
