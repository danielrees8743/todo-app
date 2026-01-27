import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Send,
  Minimize2,
  Maximize2,
  User,
  Loader2,
  Dog,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { chatWithBear } from '../../lib/openai';
import { fetchWeatherByCity, getWeatherDescription } from '../../lib/weather';
import { useWeather } from '../../hooks/useWeather';
import type { Todo, NewTodo } from '../../types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface AIChatProps {
  todos?: Todo[];
  onAddTodo: (todo: NewTodo) => void;
  onAddSubtask: (todoId: string, title: string) => void;
  onToggleTodo: (id: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model_used?: 'ollama' | 'openai';
}

export default function AIChat({
  todos = [],
  onAddTodo,
  onAddSubtask,
  onToggleTodo,
}: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm Bear. How can I help you get things done today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rate limiting config
  const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests

  // Get current weather data
  const { weatherData } = useWeather();

  // Get Current User
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch Profile for Avatar
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user!.id)
        .single();
      return data;
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Rate limiting: Check time since last request
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = Math.ceil((MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Please wait ${waitTime} more second${waitTime > 1 ? 's' : ''} before sending another message.`,
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setLastRequestTime(now);

    try {
      // Format todos for context
      const todoContext = todos
        .map((t) => {
          const status = t.completed ? 'Completed' : 'Active';
          const priority = t.priority
            ? `Priority: ${t.priority}`
            : 'Priority: Normal';
          const tags =
            t.tags && t.tags.length > 0 ? `Tags: ${t.tags.join(', ')}` : '';
          const subtasks =
            t.subtasks && t.subtasks.length > 0
              ? `\n    Subtasks: ${t.subtasks.map((s) => `${s.title} (${s.completed ? 'Done' : 'Todo'})`).join(', ')}`
              : '';

          return `- [${status}] ${t.title} (${priority}) ${tags}${subtasks}`;
        })
        .join('\n\n');

      // Format weather context
      const weatherContext = weatherData && weatherData.city
        ? `Current weather in ${weatherData.city}: ${weatherData.temp}°${weatherData.unit || 'C'}, ${getWeatherDescription(weatherData.code)}`
        : '';

      // Combine contexts
      const fullContext = weatherContext
        ? `${todoContext}\n\nWEATHER:\n${weatherContext}`
        : todoContext;

      // Send context of last few messages
      const recentMessages: ChatCompletionMessageParam[] = [...messages, userMessage]
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));
      const responseMessage = await chatWithBear(recentMessages, fullContext);

      // Handle Tool Calls
      if (responseMessage.tool_calls) {
        const toolResults: string[] = [];

        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);

          if (functionName === 'add_todo') {
            onAddTodo({
              title: args.title,
              priority: args.priority || 'Medium',
              description: args.description || '',
              tags: args.tags || [],
              dueDateTime: args.due_datetime || null,
            });
            toolResults.push(`Added task: ${args.title}`);
          } else if (functionName === 'add_subtask') {
            const titleToFind = args.todo_title;
            const todo = todos.find(
              (t) => t.title.toLowerCase() === titleToFind.toLowerCase(),
            );

            if (todo) {
              onAddSubtask(todo.id, args.title);
              toolResults.push(
                `Added subtask "${args.title}" to "${todo.title}"`,
              );
            } else {
              toolResults.push(
                `Could not find a task with the title: "${titleToFind}"`,
              );
            }
          } else if (functionName === 'toggle_todo') {
            const titleToFind = args.todo_title;
            const todo = todos.find(
              (t) => t.title.toLowerCase() === titleToFind.toLowerCase(),
            );

            if (todo) {
              onToggleTodo(todo.id);
              toolResults.push(`Updated task status for: ${todo.title}`);
            } else {
              toolResults.push(
                `Could not find a task with the title: "${titleToFind}"`,
              );
            }
          } else if (functionName === 'get_weather') {
            try {
              const weather = await fetchWeatherByCity(args.city);
              const desc = getWeatherDescription(weather.code);
              toolResults.push(
                `Weather in ${weather.city}: ${weather.temp}°C, ${desc}, ${weather.precipChance}% chance of rain.`,
              );
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              toolResults.push(
                `Failed to get weather for ${args.city}: ${errorMessage}`,
              );
            }
          }
        }

        const content = responseMessage.content
          ? `${responseMessage.content}\n\n${toolResults.join('\n')}`
          : toolResults.join('\n');

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: content, model_used: responseMessage.model_used },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: responseMessage.content || '', model_used: responseMessage.model_used },
        ]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent toggling the chat window
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm Bear. How can I help you get things done today?",
      },
    ]);
  };

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 border border-indigo-100 dark:border-indigo-900/30 overflow-hidden transition-all duration-300'>
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className='w-full flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer'
      >
        <div className='flex items-center gap-2.5'>
          <div className='w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xl overflow-hidden'>
            <Dog className='w-5 h-5 text-black dark:text-gray-200' />
          </div>
          <div className='text-left'>
            <h3 className='font-semibold text-gray-900 dark:text-gray-100 text-sm'>
              Chat with Bear
            </h3>
            <p className='text-xs text-indigo-600 dark:text-indigo-400'>
              AI Productivity Assistant
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2 text-gray-500'>
          {isOpen && (
            <button
              type='button'
              onClick={handleClearChat}
              className='p-1.5 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mr-2'
              title='Clear Chat History'
              aria-label='Clear Chat History'
            >
              <Trash2 size={16} />
            </button>
          )}
          {isOpen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </div>
      </div>

      {/* Content */}
      <div
        className={`transition-all duration-300 ease-in-out ${isOpen ? 'h-80 opacity-100' : 'h-0 opacity-0'}`}
      >
        <div className='h-full flex flex-col'>
          {/* Messages */}
          <div className='flex-1 overflow-y-auto p-4 space-y-4'>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className='flex flex-col items-center gap-0.5'>
                    <div className='w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 text-sm overflow-hidden'>
                      <Dog className='w-5 h-5 text-black dark:text-gray-200' />
                    </div>
                    {msg.model_used && (
                      <span className='text-xs' title={msg.model_used === 'ollama' ? 'Llama 3.2' : 'GPT-4o Mini'}>
                        {msg.model_used === 'ollama' ? '🦙' : '🧸'}
                      </span>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className='w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0 overflow-hidden'>
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt='User'
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <User className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className='flex gap-3 justify-start'>
                <div className='w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 text-sm overflow-hidden'>
                  <Dog className='w-5 h-5 text-black dark:text-gray-200' />
                </div>
                <div className='bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-none px-4 py-2 flex items-center'>
                  <Loader2 size={16} className='animate-spin text-gray-600' />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className='p-3 border-t border-gray-100 dark:border-gray-700 flex gap-2'
          >
            <input
              type='text'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ask Bear for help...'
              aria-label='Chat message'
              className='flex-1 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border-none focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm dark:text-white transition-all'
            />
            <button
              type='submit'
              disabled={!input.trim() || isLoading}
              className='p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              aria-label='Send message'
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
