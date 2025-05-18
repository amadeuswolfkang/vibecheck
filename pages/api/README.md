# API Routes

This directory contains all API routes for the Vibecheck application.

## Current Endpoints

### Gmail Integration
- `POST /api/gmail`
  - Requires authentication
  - Accepts Gmail access token
  - Returns analyzed feedback from Gmail

## Authentication

All API routes are protected by NextAuth.js authentication. Make sure to:
1. Validate the session in each API route
2. Handle authentication errors appropriately
3. Return proper HTTP status codes

## Error Handling

All API routes should:
1. Return consistent error formats
2. Use appropriate HTTP status codes
3. Include helpful error messages
4. Log errors for debugging

## Response Format

```typescript
// Success Response
{
  status: number;
  data: T;
  message?: string;
}

// Error Response
{
  status: number;
  error: string;
}
```

## Adding New Routes

1. Create a new file in the appropriate directory
2. Implement proper authentication checks
3. Add input validation
4. Handle errors consistently
5. Document the endpoint in this README 