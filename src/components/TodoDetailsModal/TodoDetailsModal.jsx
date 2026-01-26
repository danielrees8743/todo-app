/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check, Trash2, Plus, GripVertical } from 'lucide-react';
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
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSubtaskItem({ subtask, onToggle, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg group transition-colors bg-white dark:bg-gray-800'
    >
        <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
             <GripVertical size={14} />
        </div>
      <button
        onClick={() => onToggle(subtask.id, subtask.completed)}
        className={`shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${
          subtask.completed
            ? 'bg-blue-600 border-blue-600'
            : 'border-gray-300 dark:border-gray-500 hover:border-blue-500'
        }`}
      >
        {subtask.completed && (
          <Check size={12} strokeWidth={3} className='text-white' />
        )}
      </button>
      <span
        className={`flex-1 text-sm ${
          subtask.completed
            ? 'text-gray-500 line-through'
            : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        {subtask.title}
      </span>
      <button
        onClick={() => onDelete(subtask.id)}
        className='opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-all'
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function TodoDetailsModal({
  isOpen,
  onClose,
  todo,
  onUpdateTodo,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onUpdateSubtaskPosition // Need to pass this from usage or hook if we lift state up? 
  // Actually, better to use the hook inside here if we can or pass it down. 
  // Given current architecture, let's assume it's passed or we import the hook.
  // But wait, the modal is generic. Let's pass it in App.jsx or use the hook here?
  // The component props don't have it yet. Let's assume parent passes it.
}) {
    // We can also import the hook here if we want to avoid prop drilling too much, 
    // but the props suggest a container/presentational split pattern. 
    // Let's stick to props for now, but I need to update App.jsx/CalendarView.jsx to pass it.
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    dueTime: '',
  });

  const [newSubtask, setNewSubtask] = useState('');
  // Local state for optimistic UI updates on drag
  const [localSubtasks, setLocalSubtasks] = useState([]);

  useEffect(() => {
    if (todo) {
      const dateObj = todo.dueDateTime ? new Date(todo.dueDateTime) : null;
      setFormData({
        title: todo.title || '',
        description: todo.description || '',
        priority: todo.priority || 'Medium',
        dueDate: dateObj ? dateObj.toISOString().split('T')[0] : '',
        dueTime: dateObj
          ? dateObj.toTimeString().split(' ')[0].substring(0, 5)
          : '',
      });
      setLocalSubtasks(todo.subtasks || []);
    }
  }, [todo]);
  
  // Keep local state in sync if backend updates (e.g. after adding subtask)
  useEffect(() => {
      if (todo?.subtasks) {
          setLocalSubtasks(todo.subtasks);
      }
  }, [todo?.subtasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = localSubtasks.findIndex((s) => s.id === active.id);
      const newIndex = localSubtasks.findIndex((s) => s.id === over.id);
      
      const newSubtasks = arrayMove(localSubtasks, oldIndex, newIndex);
      setLocalSubtasks(newSubtasks);

        // Calculate functionality similar to main todos
        const prevItem = newSubtasks[newIndex - 1];
        const nextItem = newSubtasks[newIndex + 1];

        // Basic positioning logic - similar to TodoList
        // Assuming we have 'position' field on subtasks. 
        // If not, we need to create it in DB.
        const getPos = (item) => item.position || 0;
        
        let newPosition;
         if (!prevItem) {
            newPosition = nextItem ? getPos(nextItem) - 1000 : 0;
         } else if (!nextItem) {
             newPosition = getPos(prevItem) + 1000;
         } else {
             newPosition = (getPos(prevItem) + getPos(nextItem)) / 2;
         }
         
         if (onUpdateSubtaskPosition) {
             onUpdateSubtaskPosition(active.id, newPosition);
         }
    }
  };


  if (!isOpen || !todo) return null;

  const handleUpdate = () => {
    // Construct new dueDateTime
    const dueDateTime = formData.dueDate
      ? new Date(
          `${formData.dueDate}T${formData.dueTime || '00:00'}`,
        ).toISOString()
      : null;

    onUpdateTodo(todo.id, {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      due_datetime: dueDateTime,
    });
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddSubtaskSubmit = (e) => {
    e.preventDefault();
    if (newSubtask.trim()) {
      onAddSubtask(todo.id, newSubtask);
      setNewSubtask('');
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all'>
      <div className='w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl transform transition-all flex flex-col max-h-[90vh]'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 shrink-0'>
          <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
            Task Details
          </h2>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors'
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className='p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6'>
          {/* Title & Description */}
          <div className='space-y-4'>
            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'>
                Title
              </label>
              <input
                type='text'
                name='title'
                value={formData.title}
                onChange={handleChange}
                className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-lg'
              />
            </div>

            <div>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2'>
                Description
              </label>
              <textarea
                name='description'
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none'
                placeholder='Add notes...'
              />
            </div>
          </div>

          <div className='space-y-6'>
            {/* Due Date & Time */}
            <div className='space-y-4'>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                Due Date
              </label>
              <div className='flex gap-2'>
                <div className='relative flex-1'>
                  <Calendar
                    className='absolute left-3 top-2.5 text-gray-500 dark:text-gray-300 pointer-events-none'
                    size={16}
                  />
                  <input
                    type='date'
                    name='dueDate'
                    value={formData.dueDate}
                    onChange={handleChange}
                    className='w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none dark:[color-scheme:dark] transition-colors'
                  />
                </div>
                <div className='relative w-32'>
                  <Clock
                    className='absolute left-3 top-2.5 text-gray-500 dark:text-gray-300 pointer-events-none'
                    size={16}
                  />
                  <input
                    type='time'
                    name='dueTime'
                    value={formData.dueTime}
                    onChange={handleChange}
                    className='w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none dark:[color-scheme:dark] transition-colors'
                  />
                </div>
              </div>
            </div>

            {/* Priority */}
            <div className='space-y-4'>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                Priority
              </label>
              <div className='flex gap-2'>
                {['Low', 'Medium', 'High'].map((p) => (
                  <button
                    key={p}
                    type='button'
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={`flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                      formData.priority === p
                        ? p === 'High'
                          ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                          : p === 'Medium'
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'
                            : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <hr className='border-gray-100 dark:border-gray-700' />

          {/* Subtasks */}
          <div>
            <div className='flex items-center justify-between mb-3'>
              <label className='block text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                Subtasks (
                {localSubtasks.filter((s) => s.completed).length || 0}/
                {localSubtasks.length || 0})
              </label>
            </div>

            <div className='space-y-2 mb-3'>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                  <SortableContext 
                    items={localSubtasks}
                    strategy={verticalListSortingStrategy}
                  >
                    {localSubtasks.map((subtask) => (
                        <SortableSubtaskItem 
                            key={subtask.id} 
                            subtask={subtask} 
                            onToggle={onToggleSubtask} 
                            onDelete={onDeleteSubtask} 
                        />
                    ))}
                  </SortableContext>
              </DndContext>
            </div>

            <form onSubmit={handleAddSubtaskSubmit} className='relative'>
              <input
                type='text'
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                className='w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all'
                placeholder='Add a subtask...'
              />
              <Plus
                className='absolute left-3 top-2.5 text-gray-500'
                size={18}
              />
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className='p-6 border-t border-gray-100 dark:border-gray-700 shrink-0 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors'
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
