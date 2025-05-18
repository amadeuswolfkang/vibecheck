# Types

This directory contains TypeScript type definitions, interfaces, and type utilities used throughout the Vibecheck application.

## Organization

```
types/
├── api/           # API related types
├── components/    # Component prop types
├── hooks/         # Hook parameter and return types
└── models/        # Data model types
```

## Type Categories

1. **API Types**
   ```typescript
   // Example API response type
   export interface ApiResponse<T> {
     data: T
     status: number
     message: string
   }
   ```

2. **Component Types**
   ```typescript
   // Example component props
   export interface ButtonProps {
     variant: 'primary' | 'secondary'
     size: 'sm' | 'md' | 'lg'
     onClick: () => void
     children: React.ReactNode
   }
   ```

3. **Hook Types**
   ```typescript
   // Example hook types
   export interface UseAuthReturn {
     user: User | null
     loading: boolean
     error: Error | null
   }
   ```

4. **Model Types**
   ```typescript
   // Example data model
   export interface User {
     id: string
     email: string
     name: string
     role: UserRole
   }
   ```

## Best Practices

1. **Type Design**
   - Keep types focused and single-purpose
   - Use descriptive names
   - Leverage TypeScript utility types
   - Document complex types with JSDoc

2. **Type Organization**
   - Group related types in separate files
   - Use index files for exports
   - Keep type definitions close to their usage
   - Use barrel exports for convenience

3. **Type Safety**
   - Use strict type checking
   - Avoid `any` type
   - Use generics when appropriate
   - Implement proper type guards

## Usage Examples

```typescript
// Importing types
import type { User, ApiResponse } from '@/types'
import type { ButtonProps } from '@/types/components'

// Using utility types
type Nullable<T> = T | null
type UserResponse = ApiResponse<User>

// Type guards
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  )
}
```

## Type Exports

Use the `index.ts` file in each subdirectory to export types:

```typescript
// types/index.ts
export * from './api'
export * from './components'
export * from './hooks'
export * from './models'
``` 