import { useState, type FormEvent, type ChangeEvent } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import type { NewTodo, Priority } from '../../types';

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (todo: NewTodo) => void;
}

interface FormData {
  title: string;
  description: string;
  tags: string;
  priority: Priority;
  dueDate: string;
  dueTime: string;
}

export default function AddTodoModal({ isOpen, onClose, onAdd }: AddTodoModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    tags: '',
    priority: 'Medium',
    dueDate: '',
    dueTime: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onAdd({
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      tags: formData.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== ''),
      completed: false,
      dueDateTime: formData.dueDate
        ? new Date(
            `${formData.dueDate}T${formData.dueTime || '00:00'}`,
          ).toISOString()
        : null,
    });
    // Reset form
    setFormData({
      title: '',
      description: '',
      tags: '',
      priority: 'Medium',
      dueDate: '',
      dueTime: '',
    });
    onClose();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all'>
      <div className='w-full max-w-lg bg-white dark:bg-stone-800 rounded-xl shadow-2xl transform transition-all'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-stone-100 dark:border-stone-700'>
          <h2 className='text-xl font-bold text-stone-900 dark:text-white'>
            Add New Task
          </h2>
          <button
            type='button'
            onClick={onClose}
            className='text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-stone-800 rounded-lg'
            aria-label='Close modal'
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          {/* Title */}
          <div>
            <label
              htmlFor='title'
              className='block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1'
            >
              Title <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              id='title'
              name='title'
              required
              className='w-full px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all'
              placeholder='What needs to be done?'
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor='description'
              className='block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1'
            >
              Description
            </label>
            <textarea
              id='description'
              name='description'
              rows={3}
              className='w-full px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all resize-none'
              placeholder='Add some details...'
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor='tags'
              className='block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1'
            >
              Tags (comma separated)
            </label>
            <input
              type='text'
              id='tags'
              name='tags'
              className='w-full px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all'
              placeholder='Work, Urgent, Design'
              value={formData.tags}
              onChange={handleChange}
            />
          </div>

          {/* Priority */}
          <div>
            <label className='block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2'>
              Priority
            </label>
            <div className='flex gap-3'>
              {(['Low', 'Medium', 'High'] as const).map((p) => (
                <button
                  key={p}
                  type='button'
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, priority: p }))
                  }
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all border hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-stone-800 ${
                    formData.priority === p
                      ? p === 'High'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-900'
                        : p === 'Medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900'
                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Time */}
          <div>
            <label className='block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2'>
              Due Date
            </label>
            <div className='flex flex-col md:flex-row gap-3'>
              <div className='relative flex-1'>
                <input
                  type='date'
                  id='dueDate'
                  name='dueDate'
                  aria-label='Due date'
                  className='w-full h-11 px-4 py-2 pl-10 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all dark:[color-scheme:dark]'
                  value={formData.dueDate}
                  onChange={handleChange}
                />
                <Calendar className='absolute left-3 top-3 h-5 w-5 text-stone-500 pointer-events-none' />
              </div>

              <div className='relative flex-1'>
                <input
                  type='time'
                  id='dueTime'
                  name='dueTime'
                  aria-label='Due time'
                  className='w-full h-11 px-4 py-2 pl-10 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none transition-all dark:[color-scheme:dark]'
                  value={formData.dueTime}
                  onChange={handleChange}
                />
                <Clock className='absolute left-3 top-3 h-5 w-5 text-stone-500 pointer-events-none' />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className='mt-8 flex justify-end gap-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='px-5 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-white dark:focus:ring-offset-stone-800 transition-all hover:scale-105 active:scale-95'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-5 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 focus:ring-offset-white dark:focus:ring-offset-stone-800 transition-all hover:scale-105 active:scale-95'
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
