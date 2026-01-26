# Features List

This document tracks application features, implementation notes, and completion status.

## Feature Table

| #   | Feature Name           | Description                          | Implementation Details                                                                                         | Done |
| --- | ---------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | Core App Setup         | Initialize project with modern stack | React 19, Vite, Tailwind CSS v4, Lucide Icons                                                                  | ✅   |
| 2   | Authentication         | Secure user access                   | Supabase Auth (Sign Up, Sign In, Sign Out), Protected Routes                                                   | ✅   |
| 3   | Task Management        | CRUD operations for tasks            | Create, Read, Update, Delete tasks with Supabase Database                                                      | ✅   |
| 4   | Task Metadata          | Rich task details                    | Title, description, priority levels (High/Medium/Low), due dates & times                                       | ✅   |
| 5   | Filtering & Search     | Organize tasks                       | Filter by Status (Completed), Priority (Important), and Due Date (Today)                                       | ✅   |
| 6   | Dark Mode              | System-wide dark theme               | Tailwind dark mode class strategy, persisted in LocalStorage                                                   | ✅   |
| 7   | State Management       | Efficient data handling              | TanStack Query (React Query) for caching, background updates, and loading states                               | ✅   |
| 8   | Responsive UI          | Mobile-friendly design               | Responsive grid layout, mobile-optimized forms and modals                                                      | ✅   |
| 9   | Data Migration         | Legacy support                       | Tool to migrate pre-existing LocalStorage data to Supabase account                                             | ✅   |
| 10  | Search Functionality   | Find tasks quickly                   | Real-time text search bar in header to filter by title/description                                             | ✅   |
| 11  | User Profile           | Manage account settings              | Page to update display name, change password, and view account stats                                           | ✅   |
| 12  | Tags & Categories      | Custom organization                  | Allow users to create custom lists (e.g. Work, Personal)                                                       | ✅   |
| 13  | Subtasks               | Granular task tracking               | Progress bars and checklist items within a single task card                                                    | ✅   |
| 14  | Drag & Drop            | Manual sorting                       | Sort tasks via drag-and-drop using dnd-kit                                                                     | ✅   |
| 15  | AI Integration         | AI Assistant                         | Integrate AI into the app (Bear Chatbot & Subtask Suggestions)                                                 | ✅   |
| 16  | Weather Widget         | Weather forecasting                  | Local weather + city search using Open-Meteo API. Includes temperature, condition icons, and rain probability. | ✅   |
| 17  | Productivity Dashboard | Analyze productivity stats           | Charts for completion rates, focus minutes (Pomodoro), and streaks. (Recharts/Chart.js)                        | ⬜   |
| 18  | Calendar View          | Visual deadline planning             | Monthly/Weekly calendar with drag-and-drop rescheduling. (react-big-calendar/FullCalendar)                     | ⬜   |
| 19  | Collaborative Lists    | Real-time sharing                    | Share lists with other users, invite via email, see live updates. (Supabase Realtime)                          | ⬜   |

## Status Legend

- ⬜ Not started
- 🟨 In progress
- ✅ Done

## Tech Stack

- **Frontend**: React 19, Vite, React Router v6
- **Styling**: Tailwind CSS v4, Lucide React
- **Backend**: Supabase (Auth & Database)
- **State**: TanStack Query (@tanstack/react-query)
