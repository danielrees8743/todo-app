# Claude Code Instructions

A simple, maintainable Todo application built with modern React.

## Project Location

The main application is in `Todo/todo/` - all commands should be run from that directory.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm test         # Run all tests (Vitest in watch mode)
npm test -- --run               # Run tests once without watch
npm test -- TodoCard            # Run tests matching a pattern
npm test -- --coverage          # Run tests with coverage report
npm run preview  # Preview production build
```

## Tech Stack

- **React 19** with **Vite 7** for fast development
- **Tailwind CSS v4** (using `@tailwindcss/vite` plugin)
- **React Router v7** for routing
- **TanStack Query v5** for server state management and caching
- **Supabase** for authentication and database
- **dnd-kit** for drag-and-drop functionality
- **Vitest + React Testing Library** for testing
- **lucide-react** for icons
- **date-fns** for date formatting
- **react-big-calendar** for calendar view
- **OpenAI** integration for AI features

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

Components are colocated with tests:
src/components/
├── ComponentName/
│   ├── ComponentName.jsx
│   └── ComponentName.test.jsx
```

## Architecture

### Data Flow
- `src/lib/supabase.js` - Supabase client initialization
- `src/hooks/useTodos.ts` - Central data hook using TanStack Query mutations for all todo/subtask CRUD operations with optimistic updates
- `src/hooks/useWeather.ts` - Weather data hook with TanStack Query caching
- Components consume these hooks for data access and mutations

### Routing & Auth
- React Router handles routes: `/`, `/login`, `/register`, `/forgot-password`, `/profile`, `/calendar`
- `ProtectedRoute` component in App.jsx gates authenticated routes
- Auth state managed via `supabase.auth.onAuthStateChange` listener

### Environment Variables
Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

## Coding Guidelines

### Style
- Use functional components with hooks and arrow function syntax
- Prefer arrow functions for components
- Use Tailwind CSS utility classes for styling
- Ensure all components are responsive
- Use strict equality (`===`) checks
- Use explicit return types where helpful (TypeScript)

### Best Practices
- Keep code simple and readable
- Prefer clarity over cleverness
- Avoid premature optimization
- Follow existing project structure
- Write reusable, modular code
- Keep files small and focused
- Use clear, consistent naming
- Custom hooks must be prefixed with "use" and placed in `src/hooks/`
- Use comments only when necessary
- Avoid deeply nested logic
- Prefer pure functions where possible
- Handle errors gracefully

### Testing
- Tests use Vitest with jsdom environment
- Global test setup is in `src/test/setup.js` which includes `@testing-library/jest-dom` matchers and a `matchMedia` mock
- Write simple, meaningful tests
- Cover critical logic paths
- Avoid over-testing trivial code
- Tests are co-located with components (ComponentName.test.jsx)
- Wrap components needing routing in `<BrowserRouter>` for tests

### UI
- Keep the UI clean and minimalist
- No unused variables or dead code
- Minimal dependencies
- Consistent formatting

## AI Integration

- OpenAI API calls are in `src/lib/openai.ts`
- AI chat component is in `src/components/AIChat/`
- AI-related features and roadmap are detailed in `features.md` under "AI Enhancement Roadmap" section
- Use **gpt-4o-mini** model for all AI features for consistency and cost efficiency
- Rate limiting is implemented at three layers: client throttling, retry logic, and server limits
- Ensure to follow the roadmap and mark progress in `features.md`

## Feature Management

- Always check `features.md` to see if a feature is already planned or implemented
- If the feature you are working on is not listed, add it to `features.md`
- Mark completed features in `features.md` with ✅
- Update feature descriptions when enhancements are added

## Branching & Git Workflow

- Always check the branch before making changes to ensure you are working on the correct feature branch
- Name branches using kebab-case: `feature/feature-name` or `bugfix/issue-name`
  - Examples: `feature/dark-mode`, `bugfix/login-issue`, `feature/ai-rate-limiting`
- Always create pull requests for code reviews before merging changes
- Write clear, descriptive commit messages

## Temporary Files

- If temporary files are needed, put them in a clearly marked `temp/` folder
- Remove temporary files after they are no longer needed
- Do not commit temporary files to the repository

## Out of Scope

- Over-engineered abstractions
- Unused features
- Experimental or unstable libraries unless specified
