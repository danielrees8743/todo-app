# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Location

The main application is in `Todo/todo/` - all commands should be run from that directory.

## Commands

```bash
cd Todo/todo

npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm test         # Run all tests (Vitest in watch mode)
npm test -- --run               # Run tests once without watch
npm test -- TodoCard            # Run tests matching a pattern
npm test -- --coverage          # Run tests with coverage report
```

## Architecture

### Tech Stack
- **React 19** with **Vite 7** for fast development
- **Tailwind CSS v4** (using `@tailwindcss/vite` plugin)
- **TanStack Query** for server state management and caching
- **Supabase** for authentication and database
- **dnd-kit** for drag-and-drop functionality
- **Vitest + React Testing Library** for testing

### Data Flow
- `src/lib/supabase.js` - Supabase client initialization
- `src/hooks/useTodos.js` - Central data hook using TanStack Query mutations for all todo/subtask CRUD operations with optimistic updates
- Components consume the `useTodos` hook for data access and mutations

### Routing & Auth
- React Router handles routes (`/`, `/login`, `/register`, `/forgot-password`, `/profile`, `/calendar`)
- `ProtectedRoute` component in App.jsx gates authenticated routes
- Auth state managed via `supabase.auth.onAuthStateChange` listener

### Component Structure
Components are organized in `src/components/` with colocated test files:
```
src/components/
├── ComponentName/
│   ├── ComponentName.jsx
│   └── ComponentName.test.jsx
```

### Environment Variables
Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

## Coding Conventions

- Use functional components with hooks and arrow function syntax
- Use Tailwind CSS utility classes for styling
- Custom hooks must be prefixed with "use" and placed in `src/hooks/`
- Prefer strict equality (`===`)
- Mark completed features in `features.md`
- If temorary files are needed, put them in a clearly marked `temp/` folder and remove them later.
- Always check the `features.md` file to see if a feature is already planned or implemented, if the feature you are working on is not listed there, add it.


## Testing

Tests use Vitest with jsdom environment. Global test setup is in `src/test/setup.js` which includes `@testing-library/jest-dom` matchers and a `matchMedia` mock. Wrap components needing routing in `<BrowserRouter>` for tests.

## AI Integration
- OpenAI API calls are in `src/lib/openai.js`
- AI chat component is in `src/components/AIChat/`
- AI-related features and roadmap are detailed in `features.md` under "AI Enhancement Roadmap" section.
- Ensure to follow the roadmap and mark progress in `features.md`.
- Use gpt-4o-mini model for all AI features for consistency and cost efficiency.

## Other Notes
- When adding new features, update `features.md` to reflect the current status.
- Follow the established project structure and coding guidelines for consistency.
- Refer to `features.md` for detailed feature descriptions and implementation details.
- Always create pull requests for code reviews before merging changes.
- Always check the branch before making changes to ensure you are working on the correct feature branch.
- Name the branches according to the feature being worked on, using kebab-case (e.g., `feature/dark-mode`, `bugfix/login-issue`). 