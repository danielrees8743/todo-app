import { useState } from 'react';
import { Check, Trash2, Clock, Plus, X, Tag, Sparkles } from 'lucide-react';
import { getAISuggestions } from '../../lib/openai';

export default function TodoCard({
  todo,
  onToggle,
  onDelete,
  onUpdateTags,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onClick,
}) {
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleAddSubtask = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (subtaskTitle.trim()) {
      onAddSubtask(todo.id, subtaskTitle);
      setSubtaskTitle('');
      setIsAddingSubtask(false);
    }
  };

  const handleGenerateSubtasks = async (e) => {
    e?.stopPropagation();
    if (!todo.title) return;

    setIsGeneratingAI(true);
    try {
      const suggestions = await getAISuggestions(
        todo.title + (todo.description ? `: ${todo.description}` : ''),
      );
      suggestions.forEach((suggestion) => {
        onAddSubtask(todo.id, suggestion);
      });
    } catch (error) {
      console.error('AI Error:', error);
      alert('Failed to generate suggestions. Check your API key.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // ... rest of component

  const handleAddTag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (newTag.trim()) {
      const updatedTags = [...(todo.tags || []), newTag.trim()];
      onUpdateTags(todo.id, updatedTags);
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    const updatedTags = todo.tags.filter((tag) => tag !== tagToRemove);
    onUpdateTags(todo.id, updatedTags);
  };

  const getTagStyles = (tag) => {
    if (tag.toLowerCase() === 'work') {
      return {
        badge:
          'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300 border border-green-100 dark:border-green-900/30',
        close: 'text-green-400 hover:text-green-600 dark:hover:text-green-200',
      };
    }
    return {
      badge:
        'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-900/30',
      close: 'text-red-400 hover:text-red-600 dark:hover:text-red-200',
    };
  };

  const completedSubtasks =
    todo.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = todo.subtasks?.length || 0;
  const progress =
    totalSubtasks === 0 ? 0 : (completedSubtasks / totalSubtasks) * 100;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer 
      ${
        todo.completed
          ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'
          : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'
      }`}
    >
      <div className='flex justify-between items-start mb-2'>
        <h3
          className={`font-semibold text-lg truncate pr-2 ${
            todo.completed
              ? 'text-gray-600 line-through dark:text-gray-400'
              : 'text-gray-800 dark:text-white'
          }`}
        >
          {todo.title}
        </h3>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            todo.priority === 'High'
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              : todo.priority === 'Medium'
                ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
          }`}
        >
          {todo.priority || 'Low'}
        </span>
      </div>

      <p
        className={`text-sm mb-4 line-clamp-2 ${
          todo.completed ? 'text-gray-500' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {todo.description || 'No description provided'}
      </p>

      {/* Tags Section */}
      <div className='flex flex-wrap items-center gap-1.5 mb-3'>
        {todo.tags?.map((tag, index) => {
          const styles = getTagStyles(tag);
          return (
            <span
              key={index}
              className={`group flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${styles.badge}`}
            >
              #{tag}
              <button
                type='button'
                aria-label='Remove tag'
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(tag);
                }}
                className={`hidden group-hover:block ml-1 ${styles.close}`}
              >
                <X size={10} />
              </button>
            </span>
          );
        })}

        {isAddingTag ? (
          <form
            onSubmit={handleAddTag}
            onClick={(e) => e.stopPropagation()}
            className='flex items-center gap-1'
          >
            <input
              type='text'
              autoFocus
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className='w-20 px-1 py-0.5 text-xs border border-blue-200 rounded outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white'
              placeholder='New tag...'
            />
            <button
              type='submit'
              className='text-blue-500 hover:text-blue-600 hidden'
              aria-label='Save tag'
            >
              <Check size={12} />
            </button>
            <button
              type='button'
              onClick={() => setIsAddingTag(false)}
              className='text-gray-500 hover:text-gray-700'
              aria-label='Cancel adding tag'
            >
              <X size={12} />
            </button>
          </form>
        ) : (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              setIsAddingTag(true);
            }}
            className={`flex items-center gap-1 transition-colors ${
              todo.tags && todo.tags.length > 0
                ? 'p-0.5 text-gray-500 hover:text-blue-500'
                : 'px-2 py-0.5 text-xs font-medium text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-md border border-dashed border-gray-300 hover:border-blue-300 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:border-blue-800'
            }`}
            title='Add tag'
            aria-label='Add tag'
          >
            <Plus size={14} />
            {(!todo.tags || todo.tags.length === 0) && 'Add tag'}
          </button>
        )}
      </div>

      {/* Subtasks */}
      <div className='mt-3 mb-3'>
        {/* Progress Bar */}
        {totalSubtasks > 0 && (
          <div className='flex items-center gap-2 mb-3'>
            <div className='flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden'>
              <div
                className='h-full bg-blue-500 rounded-full transition-all duration-300'
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className='text-xs text-gray-500 font-medium'>
              {completedSubtasks}/{totalSubtasks}
            </span>
          </div>
        )}

        {/* List */}
        <div className='space-y-2'>
          {todo.subtasks?.map((subtask) => (
            <div key={subtask.id} className='flex items-center gap-2 group'>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSubtask(subtask.id, subtask.completed);
                }}
                aria-label={`Mark subtask "${subtask.title}" as ${subtask.completed ? 'incomplete' : 'complete'}`}
                className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  subtask.completed
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'
                }`}
              >
                {subtask.completed && <Check size={10} strokeWidth={3} />}
              </button>
              <span
                className={`flex-1 text-sm truncate ${
                  subtask.completed
                    ? 'text-gray-500 line-through decoration-gray-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {subtask.title}
              </span>
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSubtask(subtask.id);
                }}
                className='opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-all'
                aria-label={`Delete subtask "${subtask.title}"`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Add Subtask Input */}
        {isAddingSubtask ? (
          <form
            onSubmit={handleAddSubtask}
            onClick={(e) => e.stopPropagation()}
            className='mt-2 flex items-center gap-2'
          >
            <input
              type='text'
              autoFocus
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder='Subtask title...'
              className='flex-1 text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:border-blue-500 dark:text-white'
            />
            <button
              type='submit'
              className='p-1 text-blue-600 hover:bg-blue-50 rounded'
              disabled={!subtaskTitle.trim()}
              aria-label='Add subtask'
            >
              <Check size={14} />
            </button>
            <button
              type='button'
              onClick={() => setIsAddingSubtask(false)}
              className='p-1 text-gray-500 hover:bg-gray-100 rounded'
              aria-label='Cancel adding subtask'
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <div className='flex items-center gap-2 mt-2'>
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingSubtask(true);
              }}
              className='flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors'
            >
              <Plus size={14} />
              Add Subtask
            </button>

            <button
              type='button'
              onClick={handleGenerateSubtasks}
              disabled={isGeneratingAI}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                isGeneratingAI
                  ? 'text-purple-400 cursor-wait'
                  : 'text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300'
              }`}
              title='Generate subtasks with AI'
            >
              <Sparkles
                size={12}
                className={isGeneratingAI ? 'animate-spin' : ''}
              />
              {isGeneratingAI ? 'Generating...' : 'AI Suggest'}
            </button>
          </div>
        )}
      </div>

      <div className='flex flex-col gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700'>
        <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
          <div className='flex items-center' title='Created date'>
            <span className='mr-1'>Created:</span>
            {new Date(todo.createdAt).toLocaleDateString()}
          </div>

          {todo.dueDateTime && (
            <div
              className='flex items-center text-orange-500 dark:text-orange-400 font-medium'
              title='Due date'
            >
              <Clock size={12} className='mr-1' />
              {new Date(todo.dueDateTime).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onToggle(todo.id);
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              todo.completed
                ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
            title={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
            aria-label={
              todo.completed
                ? `Mark "${todo.title}" as incomplete`
                : `Mark "${todo.title}" as complete`
            }
          >
            <Check size={16} />
          </button>

          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todo.id);
            }}
            className='p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-500 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors'
            title='Delete task'
            aria-label={`Delete task "${todo.title}"`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
