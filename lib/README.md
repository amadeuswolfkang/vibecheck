# Library

This directory contains service integrations and API clients for external services used in Vibecheck.

## Files

- `gmail.ts` - Gmail API integration for fetching and analyzing email data
- `apiClient.ts` - Base API client with common functionality

## API Integration Guidelines

1. All API keys should be stored in environment variables
2. Use TypeScript for type safety
3. Implement proper error handling
4. Add rate limiting where necessary
5. Cache responses when appropriate

## Adding New Integrations

1. Create a new file for your service (e.g., `slack.ts`)
2. Export typed functions for API interactions
3. Use the base `apiClient.ts` for common functionality
4. Add proper error handling and logging
5. Document the API methods using JSDoc comments 