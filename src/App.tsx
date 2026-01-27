import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useState, useEffect, useRef, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Plus, Filter, ChevronDown, Check, Wrench, X } from 'lucide-react';
import Header from './components/Header/Header';
import Login from './components/Login/Login';
import Register from './components/Register/Register';
import ForgotPassword from './components/ForgotPassword/ForgotPassword';
import TodoCard from './components/TodoCard/TodoCard';
import SortableTodoCard from './components/SortableTodoCard/SortableTodoCard';
import AddTodoModal from './components/AddTodoModal/AddTodoModal';
import TodoDetailsModal from './components/TodoDetailsModal/TodoDetailsModal';
import AIChat from './components/AIChat/AIChat';
import WeatherWidget from './components/WeatherWidget/WeatherWidget';
import DataMigration from './components/DataMigration/DataMigration';
import UserProfile from './components/UserProfile/UserProfile';
import PomodoroTimer from './components/PomodoroTimer/PomodoroTimer';
import CalendarView from './components/CalendarView/CalendarView';
import { useTodos } from './hooks/useTodos';
import { supabase } from './lib/supabase';
import type { Todo, Priority } from './types';

type FilterType = 'All Tasks' | 'Important' | 'Completed' | 'Today';
type SortType = 'Custom' | 'Newest' | 'Oldest' | 'Priority' | 'Due Date';

function TodoApp() {
  const {
    todos,
    toggleTodo,
    deleteTodo,
    addTodo,
    updateTags,
    updatePosition,
    updateTodoDetails,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtaskPosition,
    loading,
  } = useTodos();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All Tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('Custom');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredTodos.findIndex((t) => t.id === active.id);
      const newIndex = filteredTodos.findIndex((t) => t.id === over.id);

      const newOrder = arrayMove(filteredTodos, oldIndex, newIndex);

      const prevItem = newOrder[newIndex - 1];
      const nextItem = newOrder[newIndex + 1];

      let newPosition: number;

      const getPos = (item: Todo | undefined) => item?.position || 0;

      if (!prevItem) {
        newPosition = nextItem ? getPos(nextItem) - 1000 : 0;
      } else if (!nextItem) {
        newPosition = getPos(prevItem) + 1000;
      } else {
        newPosition = (getPos(prevItem) + getPos(nextItem)) / 2;
      }

      updatePosition(active.id as string, newPosition);
    }
  };

  if (loading) {
    return (
      <div className='flex h-screen items-center justify-center bg-stone-50 dark:bg-stone-900'>
        <div className='h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent'></div>
      </div>
    );
  }

  const getFilteredTodos = (): Todo[] => {
    let filtered = [...todos];

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
        break;
    }

    switch (sortBy) {
      case 'Newest':
        return filtered.sort((a, b) => b.createdAt - a.createdAt);
      case 'Oldest':
        return filtered.sort((a, b) => a.createdAt - b.createdAt);
      case 'Priority': {
        const priorityWeight: Record<Priority, number> = { High: 3, Medium: 2, Low: 1 };
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
          return new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime();
        });
      case 'Custom':
      default:
        return filtered;
    }
  };

  const getFilterCount = (filterType: FilterType): number => {
    switch (filterType) {
      case 'All Tasks':
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
  const selectedTodo = todos.find((t) => t.id === selectedTodoId);

  return (
    <div className='min-h-screen bg-stone-50 dark:bg-stone-900 transition-colors duration-200 flex flex-col'>
      <Header searchQuery={searchQuery} onSearch={setSearchQuery} />

      <main className='flex-1 max-w-7xl w-full mx-auto p-6'>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
          {/* Left Sidebar / Filters */}
          <div className='lg:col-span-1 space-y-6'>
            <WeatherWidget />

            <div className='bg-white dark:bg-stone-800 rounded-2xl shadow-sm p-6 border border-stone-100 dark:border-stone-700'>
              <div className='flex gap-2 mb-6'>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className='flex-1 min-w-0 flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5'
                >
                  <Plus size={18} className='shrink-0' />
                  <span className='truncate'>Add New Task</span>
                </button>
                <button
                  onClick={() => setIsToolsOpen(!isToolsOpen)}
                  className={`shrink-0 px-4 py-3 rounded-xl border transition-all flex items-center justify-center ${
                    isToolsOpen
                      ? 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-900/30 dark:border-violet-800 dark:text-violet-300'
                      : 'border-stone-200 text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-700'
                  }`}
                  title='Tools'
                >
                  {isToolsOpen ? <X size={20} /> : <Wrench size={20} />}
                </button>
              </div>

              {isToolsOpen && (
                <div className='mb-6 animate-in slide-in-from-top-2 duration-200'>
                  <div className='text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2'>
                    Tools
                  </div>
                  <div className='grid grid-cols-1 gap-1'>
                    <button
                      onClick={() =>
                        setActiveTool(
                          activeTool === 'pomodoro' ? null : 'pomodoro',
                        )
                      }
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                        activeTool === 'pomodoro'
                          ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-medium'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/50'
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

              <div className='space-y-1.5'>
                <h3 className='text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3'>
                  Filters
                </h3>
                {(['All Tasks', 'Important', 'Completed', 'Today'] as const).map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${
                        activeFilter === filter
                          ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 font-medium shadow-sm'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/50'
                      }`}
                    >
                      {filter}
                      <span
                        className={`text-xs py-0.5 px-2.5 rounded-full transition-colors font-medium ${
                          activeFilter === filter
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-800 dark:text-violet-200'
                            : 'bg-stone-100 dark:bg-stone-700 text-stone-500 group-hover:bg-stone-200 dark:group-hover:bg-stone-600'
                        }`}
                      >
                        {getFilterCount(filter)}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className='bg-linear-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 rounded-2xl p-6 border border-violet-100 dark:border-violet-900/30'>
              <h3 className='text-violet-800 dark:text-violet-200 font-semibold mb-2'>
                Pro Tip
              </h3>
              <p className='text-sm text-violet-600 dark:text-violet-300/80'>
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
              <h2 className='text-2xl font-bold text-stone-800 dark:text-white tracking-tight'>
                {activeFilter}
              </h2>
              <div className='relative' ref={sortMenuRef}>
                <button
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  className='flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition-colors px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800'
                >
                  <Filter size={16} />
                  Sort by:{' '}
                  <span className='font-medium text-stone-700 dark:text-stone-300'>
                    {sortBy}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isSortMenuOpen && (
                  <div className='absolute right-0 top-full mt-2 w-48 bg-white dark:bg-stone-800 rounded-2xl shadow-lg border border-stone-100 dark:border-stone-700 py-2 z-10 animate-in fade-in zoom-in-95 duration-100'>
                    {(['Custom', 'Newest', 'Oldest', 'Priority', 'Due Date'] as const).map(
                      (option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSortBy(option);
                            setIsSortMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors ${
                            sortBy === option
                              ? 'text-violet-600 dark:text-violet-400 font-medium'
                              : 'text-stone-700 dark:text-stone-300'
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
                          onClick={() => setSelectedTodoId(todo.id)}
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
                      onClick={() => setSelectedTodoId(todo.id)}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className='text-center py-20 bg-white dark:bg-stone-800 rounded-2xl shadow-sm border-2 border-dashed border-stone-200 dark:border-stone-700'>
                <div className='bg-violet-50 dark:bg-violet-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                  <Plus size={24} className='text-violet-500' />
                </div>
                <h3 className='text-lg font-semibold text-stone-900 dark:text-white'>
                  No tasks yet
                </h3>
                <p className='text-stone-500 dark:text-stone-400 max-w-sm mx-auto mt-2'>
                  Get started by creating a new task to track your progress and
                  stay organized.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className='mt-6 px-5 py-2.5 bg-violet-500 text-white rounded-xl text-sm font-medium hover:bg-violet-600 transition-all hover:shadow-md hover:-translate-y-0.5'
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

      <TodoDetailsModal
        isOpen={!!selectedTodo}
        onClose={() => setSelectedTodoId(null)}
        todo={selectedTodo}
        onUpdateTodo={updateTodoDetails}
        onAddSubtask={addSubtask}
        onToggleSubtask={toggleSubtask}
        onDeleteSubtask={deleteSubtask}
        onUpdateSubtaskPosition={updateSubtaskPosition}
      />

      <DataMigration />
    </div>
  );
}

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  children: ReactNode;
}

function ProtectedRoute({ isAuthenticated, children }: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to='/login' replace />;
  }
  return <>{children}</>;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
      <div className='flex h-screen items-center justify-center bg-stone-50 dark:bg-stone-900'>
        <div className='h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent'></div>
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
          path='/calendar'
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <div className='min-h-screen bg-stone-50 dark:bg-stone-900 transition-colors duration-200'>
                <Header />
                <main className='flex-1 max-w-7xl w-full mx-auto p-6 h-[calc(100vh-100px)]'>
                  <CalendarView />
                </main>
              </div>
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
