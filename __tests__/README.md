# Tests

This directory contains all test files for the Vibecheck application. We follow a structured approach to testing to ensure code quality and reliability.

## Directory Structure

```
__tests__/
├── components/     # Component tests
├── hooks/         # Custom hook tests
├── lib/           # Library and API integration tests
├── utils/         # Utility function tests
└── e2e/           # End-to-end tests
```

## Testing Conventions

1. **File Naming**
   - Test files should be named `[component/function].test.ts(x)`
   - E2E test files should be named `[feature].spec.ts`

2. **Test Structure**
   - Use descriptive test blocks (`describe` and `it`)
   - Follow the Arrange-Act-Assert pattern
   - Mock external dependencies appropriately

3. **Coverage**
   - Unit tests for all components and utilities
   - Integration tests for API functions
   - E2E tests for critical user flows

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run e2e tests
npm test:e2e

# Generate coverage report
npm test:coverage
```

## Best Practices

1. Keep tests focused and atomic
2. Use meaningful test descriptions
3. Avoid test interdependence
4. Mock external services and APIs
5. Maintain test data fixtures in `__fixtures__` directories 