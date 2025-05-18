# Components

This directory contains all React components used in the Vibecheck application. Components are organized by their purpose and scope.

## Directory Structure

```
components/
├── common/         # Reusable components (buttons, inputs, cards, etc.)
├── features/       # Feature-specific components
└── layout/         # Layout components (header, footer, navigation, etc.)
```

## Component Guidelines

1. **Component Organization**
   - Keep components small and focused
   - Use TypeScript for type safety
   - Implement proper prop validation
   - Follow React best practices

2. **Naming Conventions**
   - Use PascalCase for component files and names
   - Suffix test files with `.test.tsx`
   - Use descriptive names that reflect component purpose

3. **Component Structure**
   ```typescript
   // Import statements
   import { FC } from 'react'
   import styles from './ComponentName.module.css'

   // Types
   interface ComponentNameProps {
     // prop types
   }

   // Component
   export const ComponentName: FC<ComponentNameProps> = ({ props }) => {
     return (
       // JSX
     )
   }
   ```

4. **Styling**
   - Use Tailwind CSS for styling
   - Create separate CSS modules when needed
   - Follow responsive design principles

## Best Practices

1. Implement proper error boundaries
2. Use React hooks effectively
3. Optimize performance with useMemo and useCallback
4. Document complex component logic
5. Write comprehensive tests

## Reusable Components

- `common/` - Reusable components that can be used across different features
  - `LoadingSpinner.tsx` - Generic loading spinner component
  
## Layout Components

- `layout/` - Components that define the layout structure
  - `Layout.tsx` - Main layout wrapper with common styling and structure
  
## Feature-Specific Components

- `features/` - Feature-specific components
  - `FeedbackDisplay.tsx` - Component for displaying feedback results 