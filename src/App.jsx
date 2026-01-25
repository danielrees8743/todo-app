import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Plus, Filter, ChevronDown, Check, Wrench, X } from 'lucide-react';
import Header from './components/Header';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import TodoCard from './components/TodoCard';
import SortableTodoCard from './components/SortableTodoCard';
import AddTodoModal from './components/AddTodoModal';
import AIChat from './components/AIChat';
import WeatherWidget from './components/WeatherWidget';
import DataMigration from './components/DataMigration';
import UserProfile from './components/UserProfile';
import PomodoroTimer from './components/PomodoroTimer';
import { useTodos } from './hooks/useTodos';
import { supabase } from './lib/supabase';

function TodoApp() {
  const {
    todos,
    toggleTodo,
    deleteTodo,
    addTodo,
    updateTags,
    updatePosition,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    loading,
  } = useTodos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All Tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Custom');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setIsSortMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredTodos.findIndex((t) => t.id === active.id);
      const newIndex = filteredTodos.findIndex((t) => t.id === over.id);

      const newOrder = arrayMove(filteredTodos, oldIndex, newIndex);

      // Current logic: take position between prev and next
      // newIndex is the index in the *filtered* list.
      // Be careful: if we are filtering, drag and drop might behave weirdly if we don't have the full list context.
      // But assuming 'All Tasks', newOrder[newIndex] is the item we moved.

      const prevItem = newOrder[newIndex - 1];
      const nextItem = newOrder[newIndex + 1];

      let newPosition;

      // Helper to safely get position
      const getPos = (item) => item?.position || 0;

      if (!prevItem) {
        // Moved to the top
        newPosition = nextItem ? getPos(nextItem) - 1000 : 0;
      } else if (!nextItem) {
        // Moved to the bottom
        newPosition = getPos(prevItem) + 1000;
      } else {
        // In between
        newPosition = (getPos(prevItem) + getPos(nextItem)) / 2;
      }

      updatePosition(active.id, newPosition);
    }
  };

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900'>
        <div className='h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent'></div>
      </div>
    );
  }

  const getFilteredTodos = () => {
    let filtered = [...todos]; // Create a copy to avoid mutating the original query cache

    // First apply search if exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (todo) =>
          todo.title.toLowerCase().includes(query) ||
          (todo.description &&
            todo.description.toLowerCase().includes(query)) ||
          (todo.tags &&
            todo.tags.some((tag) => tag.toLowerCase().includes(query))),
      );
    }

    // Then apply category filters
    switch (activeFilter) {
      case 'Important':
        filtered = filtered.filter(
          (todo) => todo.priority === 'High' && !todo.completed,
        );
        break;
      case 'Completed':
        filtered = filtered.filter((todo) => todo.completed);
        break;
      case 'Today': {
        const today = new Date().toDateString();
        filtered = filtered.filter((todo) => {
          const created = new Date(todo.createdAt).toDateString();
          const due = todo.dueDateTime
            ? new Date(todo.dueDateTime).toDateString()
            : null;
          return (created === today || due === today) && !todo.completed;
        });
        break;
      }
      default:
        // 'All Tasks' - no extra filtering needed
        break;
    }

    // Finally apply sorting
    switch (sortBy) {
      case 'Newest':
        return filtered.sort((a, b) => b.createdAt - a.createdAt);
      case 'Oldest':
        return filtered.sort((a, b) => a.createdAt - b.createdAt);
      case 'Priority': {
        const priorityWeight = { High: 3, Medium: 2, Low: 1 };
        return filtered.sort((a, b) => {
          const pA = priorityWeight[a.priority] || 0;
          const pB = priorityWeight[b.priority] || 0;
          return pB - pA;
        });
      }
      case 'Due Date':
        return filtered.sort((a, b) => {
          if (!a.dueDateTime) return 1;
          if (!b.dueDateTime) return -1;
          return new Date(a.dueDateTime) - new Date(b.dueDateTime);
        });
      case 'Custom':
      default:
        // Already sorted by position/created_at in useTodos query
        return filtered;
    }
  };

  const getFilterCount = (filterType) => {
    // For counts, we generally want the total count regardless of search,
    // OR we can make counts reflect search result. Usually raw count is better for sidebar.
    // Let's keep raw count for now as per previous implementation.
    switch (filterType) {
      case 'All Tasks': // All active/completed
        return todos.length;
      case 'Important':
        return todos.filter(
          (todo) => todo.priority === 'High' && !todo.completed,
        ).length;
      case 'Completed':
        return todos.filter((todo) => todo.completed).length;
      case 'Today': {
        const today = new Date().toDateString();
        return todos.filter((todo) => {
          const created = new Date(todo.createdAt).toDateString();
          const due = todo.dueDateTime
            ? new Date(todo.dueDateTime).toDateString()
            : null;
          return (created === today || due === today) && !todo.completed;
        }).length;
      }
      default:
        return 0;
    }
  };

  const filteredTodos = getFilteredTodos();

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col'>
      <Header searchQuery={searchQuery} onSearch={setSearchQuery} />

      <main className='flex-1 max-w-7xl w-full mx-auto p-6'>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
          {/* Left Sidebar / Filters */}
          <div className='lg:col-span-1 space-y-6'>
            <WeatherWidget />

            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6'>
              <div className='flex gap-2 mb-6'>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className='flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors shadow-sm'
                >
                  <Plus size={20} />
                  Add New Task
                </button>
                <button
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  className={`px-4 rounded-lg border transition-colors flex items-center justify-center ${
                    isToolsOpen
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                  }`}
                  title='Tools'
                >
                  {isToolsOpen ? <X size={20} /> : <Wrench size={20} />}
                </button>
              </div>

              {isToolsOpen && (
                <div className='mb-6 animate-in slide-in-from-top-2 duration-200'>
                  <div className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>
                    Tools
                  </div>
                  <div className='grid grid-cols-1 gap-1'>
                    <button
                      onClick={() =>
                        setActiveTool(
                          activeTool === 'pomodoro' ? null : 'pomodoro',
                        )
                      }
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        activeTool === 'pomodoro'
                          ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-medium'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      Pomodoro Timer
                      {activeTool === 'pomodoro' && <Check size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {activeTool === 'pomodoro' && (
                <div className='mb-6 animate-in fade-in duration-300'>
                  <PomodoroTimer />
                </div>
              )}

              <div className='space-y-2'>
                <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3'>
                  Filters
                </h3>
                {['All Tasks', 'Important', 'Completed', 'Today'].map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${
                        activeFilter === filter
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      {filter}
                      <span
                        className={`text-xs py-0.5 px-2 rounded-full transition-colors ${
                          activeFilter === filter
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                        }`}
                      >
                        {getFilterCount(filter)}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className='bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-900/30'>
              <h3 className='text-blue-800 dark:text-blue-200 font-semibold mb-2'>
                Pro Tip
              </h3>
              <p className='text-sm text-blue-600 dark:text-blue-300/80'>
                Break down large tasks into smaller subtasks to maintain
                momentum and track progress better.
              </p>
            </div>
          </div>

          {/* Right Content - Todo Grid */}
          <div className='lg:col-span-3'>
            <AIChat
              todos={todos}
              onAddTodo={addTodo}
              onAddSubtask={addSubtask}
              onToggleTodo={toggleTodo}
            />

            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-2xl font-bold text-gray-800 dark:text-white'>
                {activeFilter}
              </h2>
              <div className='relative' ref={sortMenuRef}>
                <button
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  className='flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800'
                >
                  <Filter size={16} />
                  Sort by:{' '}
                  <span className='font-medium text-gray-700 dark:text-gray-300'>
                    {sortBy}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isSortMenuOpen && (
                  <div className='absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-10 animate-in fade-in zoom-in-95 duration-100'>
                    {['Custom', 'Newest', 'Oldest', 'Priority', 'Due Date'].map(
                      (option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSortBy(option);
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                            sortBy === option
                              ? 'text-blue-600 dark:text-blue-400 font-medium'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {option}
                          {sortBy === option && <Check size={14} />}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>

            {filteredTodos.length > 0 ? (
              sortBy === 'Custom' ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredTodos}
                    strategy={rectSortingStrategy}
                  >
                    <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
                      {filteredTodos.map((todo) => (
                        <SortableTodoCard
                          key={todo.id}
                          todo={todo}
                          onToggle={toggleTodo}
                          onDelete={deleteTodo}
                          onUpdateTags={updateTags}
                          onAddSubtask={addSubtask}
                          onToggleSubtask={toggleSubtask}
                          onDeleteSubtask={deleteSubtask}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'>
                  {filteredTodos.map((todo) => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={toggleTodo}
                      onDelete={deleteTodo}
                      onUpdateTags={updateTags}
                      onAddSubtask={addSubtask}
                      onToggleSubtask={toggleSubtask}
                      onDeleteSubtask={deleteSubtask}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className='text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-dashed border-gray-200 dark:border-gray-700'>
                <div className='bg-gray-50 dark:bg-gray-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <Plus size={24} className='text-gray-400' />
                </div>
                <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
                  No tasks yet
                </h3>
                <p className='text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2'>
                  Get started by creating a new task to track your progress and
                  stay organized.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors'
                >
                  Create Task
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <AddTodoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={addTodo}
      />
      <DataMigration />
    </div>
  );
}

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className='flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900'>
        <div className='h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent'></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path='/login'
          element={isAuthenticated ? <Navigate to='/' replace /> : <Login />}
        />
        <Route path='/register' element={<Register />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route
          path='/'
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <TodoApp />
            </ProtectedRoute>
          }
        />
        <Route
          path='/profile'
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <UserProfile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
