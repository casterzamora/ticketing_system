---
name: frontend-development
description: "Use when: developing frontend components, managing state, handling routing, or styling with Tailwind CSS in React/Vite environments."
---

# Frontend Development Skill

## Standards & Best Practices

- **Component Architecture**: Use functional components with hooks. Prefer composition over inheritance.
- **State Management**: Use React hooks (useState, useReducer, useContext) for local/feature state.
- **Styling**: Use utility-first CSS with Tailwind CSS. Follow the existing design tokens.
- **Performance**: Use `React.memo`, `useMemo`, and `useCallback` strategically to prevent unnecessary re-renders.
- **Data Fetching**: Use standard patterns for fetching data from the Laravel API, ensuring proper loading/error states.
- **Form Handling**: Validate inputs on the client-side before submission.

## Tools to Use
- Vite for building and HMR.
- React Router for client-side navigation.
- Axios for API requests.

## Workflow
1. Check existing components in `resources/js/components` before creating new ones.
2. Ensure components are responsive and accessible.
3. Test layout changes across different screen sizes.
