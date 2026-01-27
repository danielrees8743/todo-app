# Claude Code Instructions

A simple, maintainable Todo application built with modern React.

## Tech Stack

- React 19
- Vite 7
- Tailwind CSS v4
- React Router v7
- TanStack Query v5
- lucide-react (icons)
- Supabase (Auth & Database)
- Vitest + React Testing Library
- dnd-kit (drag and drop)
- date-fns (date formatting)
- react-big-calendar (calendar view)
- OpenAI integration

## Project Structure

```
src/
├── components/     # React components organized by feature
│   ├── AIChat/
│   ├── AddTodoModal/
│   ├── CalendarView/
│   ├── DataMigration/
│   ├── ForgotPassword/
│   ├── Header/
│   ├── Login/
│   ├── PomodoroTimer/
│   ├── Register/
│   ├── SortableTodoCard/
│   ├── ThemeToggle/
│   ├── TodoCard/
│   ├── TodoDetailsModal/
│   ├── UserProfile/
│   └── WeatherWidget/
├── hooks/          # Custom React hooks (prefix with "use")
├── lib/            # External service integrations (Supabase, OpenAI, weather)
├── utils/          # Utility functions
├── test/           # Test setup
└── assets/         # Static assets
```

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run tests with Vitest
- `npm run preview` - Preview production build

## Coding Guidelines

### Style
- Use functional components with hooks
- Prefer arrow functions for components
- Use explicit return types where helpful
- Use Tailwind CSS utility classes for styling
- Ensure all components are responsive
- Use strict equality (`===`) checks

### Best Practices
- Keep code simple and readable
- Prefer clarity over cleverness
- Avoid premature optimization
- Follow existing project structure
- Write reusable, modular code
- Keep files small and focused
- Use clear, consistent naming
- Custom hooks go in `src/hooks/` with "use" prefix
- Use comments only when necessary
- Avoid deeply nested logic
- Prefer pure functions where possible
- Handle errors gracefully

### Testing
- Write simple, meaningful tests
- Cover critical logic paths
- Avoid over-testing trivial code
- Tests are co-located with components (ComponentName.test.jsx)

### UI
- Keep the UI clean and minimalist
- No unused variables or dead code
- Minimal dependencies
- Consistent formatting

## Out of Scope

- Over-engineered abstractions
- Unused features
- Experimental or unstable libraries unless specified
