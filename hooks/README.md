# Custom Hooks

This directory contains all custom React hooks used in the Vibecheck application. These hooks encapsulate reusable stateful logic.

## Usage Guidelines

1. **Naming Conventions**
   - Prefix all hook files with `use`
   - Use camelCase for hook names
   - Suffix test files with `.test.ts`

2. **Hook Structure**
   ```typescript
   import { useState, useEffect } from 'react'

   export const useHookName = (params: ParamType): ReturnType => {
     // Hook implementation
   }
   ```

3. **Type Safety**
   - Define proper TypeScript interfaces for params and return types
   - Export types when they might be needed elsewhere
   - Use generics when appropriate

## Common Hooks

- `useAuth` - Authentication state management
- `useFeedback` - Feedback data fetching and processing
- `useAnalytics` - Analytics tracking and reporting
- `useToast` - Toast notification management

## Best Practices

1. **Hook Design**
   - Keep hooks focused on a single concern
   - Implement proper cleanup in useEffect
   - Handle loading and error states
   - Cache results when appropriate

2. **Testing**
   - Write comprehensive tests for each hook
   - Test different states and edge cases
   - Mock external dependencies

3. **Documentation**
   - Add JSDoc comments for complex hooks
   - Include usage examples
   - Document side effects

## Example Usage

```typescript
const useDataFetching = <T>(url: string) => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url)
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [url])

  return { data, loading, error }
}
``` 