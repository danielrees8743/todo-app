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
      <div className='w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl transform transition-all'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700'>
          <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
            Add New Task
          </h2>
          <button
            type='button'
            onClick={onClose}
            className='text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors'
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
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Title <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              id='title'
              name='title'
              required
              className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all'
              placeholder='What needs to be done?'
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor='description'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Description
            </label>
            <textarea
              id='description'
              name='description'
              rows={3}
              className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none'
              placeholder='Add some details...'
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor='tags'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
            >
              Tags (comma separated)
            </label>
            <input
              type='text'
              id='tags'
              name='tags'
              className='w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all'
              placeholder='Work, Urgent, Design'
              value={formData.tags}
              onChange={handleChange}
            />
          </div>

          {/* Priority */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
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
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                    formData.priority === p
                      ? p === 'High'
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900'
                        : p === 'Medium'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-900'
                          : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date & Time */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label
                htmlFor='dueDate'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                Due Date
              </label>
              <div className='relative'>
                <input
                  type='date'
                  id='dueDate'
                  name='dueDate'
                  className='w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:scheme-dark'
                  value={formData.dueDate}
                  onChange={handleChange}
                />
                <Calendar className='absolute left-3 top-2.5 h-5 w-5 text-gray-500 pointer-events-none' />
              </div>
            </div>

            <div>
              <label
                htmlFor='dueTime'
                className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
              >
                Time
              </label>
              <div className='relative'>
                <input
                  type='time'
                  id='dueTime'
                  name='dueTime'
                  className='w-full px-4 py-2 pl-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:scheme-dark'
                  value={formData.dueTime}
                  onChange={handleChange}
                />
                <Clock className='absolute left-3 top-2.5 h-5 w-5 text-gray-500 pointer-events-none' />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className='mt-8 flex justify-end gap-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors'
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
