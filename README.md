# Modern React Todo App

A powerful, feature-rich task management application built with modern web technologies. This app goes beyond simple todo lists by integrating productivity tools like a Pomodoro timer, weather updates, and AI-powered assistance.

![Todo App Screenshot](public/screenshot.png) _(Note: Add a screenshot to your public folder if you have one)_

## 🚀 Features

### Core Task Management

- **Smart Todo Creation**: Create tasks with titles, descriptions, priorities, due dates, and tags.
- **Subtasks**: Break complex tasks into smaller, manageable subtasks.
- **Organization**: Drag-and-drop reordering for custom prioritization.
- **Filtering & Sorting**: Filter by status (Important, Completed, Today) and sort by Priority, Date, or Custom order.

### Productivity Tools

- **Pomodoro Timer**: Built-in focus timer to work in intervals.
- **Weather Widget**: Real-time weather updates to plan your day efficiently.
- **Dark Mode**: Fully supported dark/light theme switching.

### Intelligent Features

- **AI Chat Assistant**: Integrated AI helper to assist with task breakdown and productivity tips.
- **Natural Language Search**: Quickly find tasks using a powerful search bar.

### User Experience

- **Authentication**: Secure Login, Registration, and Password Reset flows via Supabase.
- **Responsive Design**: Optimized for all screen sizes using Tailwind CSS.
- **Drag & Drop**: Smooth, accessible drag-and-drop interactions using `dnd-kit`.

## 🛠️ Tech Stack

**Frontend**

- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State/Data**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Drag & Drop**: [dnd-kit](https://dndkit.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router](https://reactrouter.com/)

**Backend & Services**

- **Backend-as-a-Service**: [Supabase](https://supabase.com/) (Database, Auth, Realtime)
- **AI Integration**: OpenAI API (for AI Chat)

**Testing**

- **Unit Testing**: [Vitest](https://vitest.dev/)
- **Testing Library**: [React Testing Library](https://testing-library.com/)

## 🏃‍♂️ Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Supabase account

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/danielrees8743/todo-app.git
   cd todo-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your credentials:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

4. **Run the Development Server**

   ```bash
   npm run dev
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AddTodoModal/    # Task creation modal
│   ├── TodoCard/        # Individual task display
│   ├── PomodoroTimer/   # Productivity timer
│   └── ...
├── hooks/               # Custom React hooks (useTodos, useTheme)
├── lib/                 # Service configurations (Supabase)
├── App.jsx              # Main application layout
└── main.jsx             # Entry point
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
