# Constants

This directory contains constant values, configuration settings, and shared enums used throughout the Vibecheck application.

## Directory Structure

```
constants/
├── api/           # API-related constants
├── config/        # Configuration constants
├── enums/         # Shared enums
└── ui/            # UI-related constants
```

## Categories

1. **API Constants**
   ```typescript
   // api/endpoints.ts
   export const API_ENDPOINTS = {
     AUTH: '/api/auth',
     FEEDBACK: '/api/feedback',
     ANALYTICS: '/api/analytics'
   } as const
   ```

2. **Configuration Constants**
   ```typescript
   // config/app.ts
   export const APP_CONFIG = {
     MAX_RETRIES: 3,
     TIMEOUT_MS: 5000,
     BATCH_SIZE: 100
   } as const
   ```

3. **UI Constants**
   ```typescript
   // ui/theme.ts
   export const COLORS = {
     PRIMARY: '#0070f3',
     SECONDARY: '#0ea5e9',
     ERROR: '#ef4444'
   } as const
   ```

4. **Enum Constants**
   ```typescript
   // enums/common.ts
   export enum UserRole {
     ADMIN = 'ADMIN',
     USER = 'USER',
     GUEST = 'GUEST'
   }
   ```

## Best Practices

1. **Constant Design**
   - Use UPPER_CASE for primitive constants
   - Use PascalCase for enums
   - Use `as const` for object literals
   - Group related constants together

2. **Type Safety**
   - Use TypeScript's const assertions
   - Define proper types for constants
   - Export types when needed
   - Use literal types when appropriate

3. **Organization**
   - Group constants by domain
   - Use descriptive names
   - Document complex constants
   - Keep constants immutable

## Usage Examples

```typescript
import { API_ENDPOINTS } from '@/constants/api'
import { APP_CONFIG } from '@/constants/config'
import { COLORS } from '@/constants/ui'
import { UserRole } from '@/constants/enums'

// Using constants
fetch(API_ENDPOINTS.FEEDBACK)
  .then(response => response.json())
  .catch(error => {
    if (retries < APP_CONFIG.MAX_RETRIES) {
      // retry logic
    }
  })

// Using enums
function hasAdminAccess(role: UserRole): boolean {
  return role === UserRole.ADMIN
}
```

## Importing Constants

```typescript
// Recommended import style
import { API_ENDPOINTS } from '@/constants/api'
import { APP_CONFIG } from '@/constants/config'

// Alternative barrel import
import { API_ENDPOINTS, APP_CONFIG } from '@/constants'
``` 