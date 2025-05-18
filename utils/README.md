# Utilities

This directory contains utility functions and helper methods used throughout the Vibecheck application.

## Directory Structure

```
utils/
├── api/           # API utility functions
├── formatting/    # Data formatting utilities
├── validation/    # Validation functions
└── analytics/     # Analytics helper functions
```

## Categories

1. **API Utilities**
   - Request helpers
   - Response transformers
   - Error handlers

2. **Formatting Utilities**
   - Date formatters
   - Number formatters
   - Text transformers

3. **Validation Utilities**
   - Input validators
   - Schema validators
   - Type guards

4. **Analytics Utilities**
   - Event tracking helpers
   - Data aggregation functions
   - Metrics calculators

## Best Practices

1. **Function Design**
   - Write pure functions when possible
   - Use TypeScript for type safety
   - Keep functions small and focused
   - Add proper error handling

2. **Documentation**
   - Add JSDoc comments
   - Include usage examples
   - Document parameters and return types

3. **Testing**
   - Write unit tests for all utilities
   - Test edge cases
   - Include error scenarios

## Example Usage

```typescript
// Date formatter utility
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Validation utility
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
```

## Importing Utilities

```typescript
import { formatDate, isValidEmail } from '@/utils'
// or
import { formatDate } from '@/utils/formatting'
import { isValidEmail } from '@/utils/validation'
``` 