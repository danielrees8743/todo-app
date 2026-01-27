import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, type Event } from 'react-big-calendar';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import withDragAndDrop, { type EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useTodos } from '../../hooks/useTodos';
import TodoDetailsModal from '../TodoDetailsModal/TodoDetailsModal';
import type { Todo } from '../../types';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent extends Event {
  id: string;
  resource: Todo;
}

const DnDCalendar = withDragAndDrop<CalendarEvent>(Calendar);

const CalendarView = () => {
  const {
    todos,
    updateTodoDetails,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtaskPosition,
  } = useTodos();
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  const events: CalendarEvent[] = useMemo(() => {
    return todos
      .filter((todo) => todo.dueDateTime) // Only show tasks with due dates
      .map((todo) => {
        const start = new Date(todo.dueDateTime!);
        // Default to 1 hour duration if end time not specified (our todos only have one timestamp usually)
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        return {
          id: todo.id,
          title: todo.title,
          start,
          end,
          allDay: false,
          resource: todo,
        };
      });
  }, [todos]);

  const onEventDrop = ({ event, start }: EventInteractionArgs<CalendarEvent>) => {
    updateTodoDetails(event.id, { due_datetime: (start as Date).toISOString() });
  };

  const onEventResize = ({ event, start }: EventInteractionArgs<CalendarEvent>) => {
    updateTodoDetails(event.id, { due_datetime: (start as Date).toISOString() });
  };

  const onSelectEvent = (event: CalendarEvent) => {
    setSelectedTodoId(event.id);
  };

  const selectedTodo = useMemo(
    () => todos.find((t) => t.id === selectedTodoId),
    [todos, selectedTodoId],
  );

  return (
    <div className='h-full flex flex-col p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'>
      <h2 className='text-2xl font-bold mb-4'>Calendar View</h2>
      <div className='flex-1 min-h-0 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg shadow p-2'>
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor='start'
          endAccessor='end'
          style={{ height: '100%', minHeight: '500px' }}
          onEventDrop={onEventDrop}
          onEventResize={onEventResize}
          onSelectEvent={onSelectEvent}
          resizable
          defaultView='month'
          views={['month', 'week', 'day', 'agenda']}
          popup
        />
      </div>

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
    </div>
  );
};

export default CalendarView;
