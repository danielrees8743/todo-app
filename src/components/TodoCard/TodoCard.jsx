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
          'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-300 border border-teal-100 dark:border-teal-900/30',
        close: 'text-teal-400 hover:text-teal-600 dark:hover:text-teal-200',
      };
    }
    return {
      badge:
        'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-300 border border-fuchsia-100 dark:border-fuchsia-900/30',
      close: 'text-fuchsia-400 hover:text-fuchsia-600 dark:hover:text-fuchsia-200',
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
      className={`p-5 rounded-2xl shadow-sm border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer
      ${
        todo.completed
          ? 'bg-stone-50 border-stone-200 dark:bg-stone-800/50 dark:border-stone-700'
          : 'bg-white border-stone-100 dark:bg-stone-800 dark:border-stone-700'
      }`}
    >
      <div className='flex justify-between items-start mb-3'>
        <h3
          className={`font-semibold text-lg truncate pr-2 ${
            todo.completed
              ? 'text-stone-500 line-through dark:text-stone-400'
              : 'text-stone-800 dark:text-white'
          }`}
        >
          {todo.title}
        </h3>
        <span
          className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
            todo.priority === 'High'
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
              : todo.priority === 'Medium'
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}
        >
          {todo.priority || 'Low'}
        </span>
      </div>

      <p
        className={`text-sm mb-4 line-clamp-2 ${
          todo.completed ? 'text-stone-400' : 'text-stone-600 dark:text-stone-300'
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
              className={`group flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg ${styles.badge}`}
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
              className='w-20 px-2 py-1 text-xs border border-violet-200 rounded-lg outline-none dark:bg-stone-800 dark:border-stone-600 dark:text-white'
              placeholder='New tag...'
            />
            <button
              type='submit'
              className='text-violet-500 hover:text-violet-600 hidden'
              aria-label='Save tag'
            >
              <Check size={12} />
            </button>
            <button
              type='button'
              onClick={() => setIsAddingTag(false)}
              className='text-stone-500 hover:text-stone-700'
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
                ? 'p-0.5 text-stone-400 hover:text-violet-500'
                : 'px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-violet-600 bg-stone-50 hover:bg-violet-50 rounded-lg border border-dashed border-stone-300 hover:border-violet-300 dark:bg-stone-800/50 dark:border-stone-700 dark:text-stone-300 dark:hover:text-violet-400 dark:hover:border-violet-800'
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
            <div className='flex-1 h-2 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden'>
              <div
                className='h-full bg-violet-500 rounded-full transition-all duration-300'
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className='text-xs text-stone-500 font-medium'>
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
                className={`shrink-0 w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                  subtask.completed
                    ? 'bg-violet-500 border-violet-500 text-white'
                    : 'border-stone-300 dark:border-stone-600 hover:border-violet-500 dark:hover:border-violet-400'
                }`}
              >
                {subtask.completed && <Check size={10} strokeWidth={3} />}
              </button>
              <span
                className={`flex-1 text-sm truncate ${
                  subtask.completed
                    ? 'text-stone-400 line-through decoration-stone-300'
                    : 'text-stone-700 dark:text-stone-300'
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
                className='opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 transition-all'
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
              className='flex-1 text-sm px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 focus:outline-none focus:border-violet-500 dark:text-white'
            />
            <button
              type='submit'
              className='p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg'
              disabled={!subtaskTitle.trim()}
              aria-label='Add subtask'
            >
              <Check size={14} />
            </button>
            <button
              type='button'
              onClick={() => setIsAddingSubtask(false)}
              className='p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg'
              aria-label='Cancel adding subtask'
            >
              <X size={14} />
            </button>
          </form>
        ) : (
          <div className='flex items-center gap-3 mt-2'>
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingSubtask(true);
              }}
              className='flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-violet-600 dark:text-stone-400 dark:hover:text-violet-400 transition-colors'
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
                  ? 'text-fuchsia-400 cursor-wait'
                  : 'text-fuchsia-500 hover:text-fuchsia-600 dark:text-fuchsia-400 dark:hover:text-fuchsia-300'
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

      <div className='flex flex-col gap-3 mt-auto pt-3 border-t border-stone-100 dark:border-stone-700'>
        <div className='flex items-center justify-between text-xs text-stone-500 dark:text-stone-400'>
          <div className='flex items-center' title='Created date'>
            <span className='mr-1'>Created:</span>
            {new Date(todo.createdAt).toLocaleDateString()}
          </div>

          {todo.dueDateTime && (
            <div
              className='flex items-center text-amber-600 dark:text-amber-400 font-medium'
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
            className={`p-2 rounded-xl transition-all ${
              todo.completed
                ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-stone-100 text-stone-500 hover:bg-violet-100 hover:text-violet-600 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-violet-900/30 dark:hover:text-violet-400'
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
            className='p-2 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-500 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 transition-all'
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
