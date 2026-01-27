// src/lib/openai.ts
// OpenAI calls are proxied through Supabase Edge Functions to keep API keys secure
import type { ChatCompletionMessageParam, ChatCompletionMessage } from 'openai/resources/chat/completions';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

// Helper function for exponential backoff retry
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getAISuggestions = async (
  taskDescription: string,
  retryCount: number = 0
): Promise<string[]> => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/openai-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        action: 'suggestions',
        taskDescription,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle 429 rate limit with retry
      if (response.status === 429 || error.isQuotaError) {
        if (retryCount < MAX_RETRIES) {
          const backoffTime = INITIAL_BACKOFF * Math.pow(2, retryCount);
          console.log(`Rate limited. Retrying subtask suggestions in ${backoffTime}ms...`);

          await sleep(backoffTime);
          return getAISuggestions(taskDescription, retryCount + 1);
        }

        // Max retries exceeded, use offline fallback
        console.log('Max retries exceeded, using offline fallback suggestions');
        return generateOfflineSuggestions(taskDescription);
      }

      throw new Error(error.error || 'Failed to get AI suggestions');
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);

    // Retry on network errors
    if (retryCount < MAX_RETRIES && error instanceof Error &&
        (error.message.includes('fetch') || error.message.includes('network'))) {
      const backoffTime = INITIAL_BACKOFF * Math.pow(2, retryCount);
      console.log(`Network error. Retrying in ${backoffTime}ms...`);

      await sleep(backoffTime);
      return getAISuggestions(taskDescription, retryCount + 1);
    }

    return generateOfflineSuggestions(taskDescription);
  }
};

export const chatWithBear = async (
  messages: ChatCompletionMessageParam[],
  todoContext: string = '',
  retryCount: number = 0
): Promise<ChatCompletionMessage & { model_used?: 'ollama' | 'openai' }> => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/openai-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        action: 'chat',
        messages,
        todoContext,
      }),
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle 429 rate limit with retry
      if (response.status === 429 || error.isQuotaError) {
        if (retryCount < MAX_RETRIES) {
          const backoffTime = INITIAL_BACKOFF * Math.pow(2, retryCount);
          console.log(`Rate limited. Retrying in ${backoffTime}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);

          await sleep(backoffTime);
          return chatWithBear(messages, todoContext, retryCount + 1);
        }

        // Max retries exceeded
        return {
          role: 'assistant',
          content: "I'm currently experiencing high demand and couldn't process your request. Please try again in a few moments.",
          refusal: null,
        };
      }

      throw new Error(error.error || 'Failed to chat with Bear');
    }

    const data = await response.json();
    return { ...data.message, model_used: data.model_used };

  } catch (error) {
    console.error('Error chatting with Bear:', error);

    // Retry on network errors
    if (retryCount < MAX_RETRIES && error instanceof Error &&
        (error.message.includes('fetch') || error.message.includes('network'))) {
      const backoffTime = INITIAL_BACKOFF * Math.pow(2, retryCount);
      console.log(`Network error. Retrying in ${backoffTime}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);

      await sleep(backoffTime);
      return chatWithBear(messages, todoContext, retryCount + 1);
    }

    return {
      role: 'assistant',
      content: "Sorry, I'm having trouble connecting right now. Please check your internet connection and try again.",
      refusal: null,
    };
  }
};

const generateOfflineSuggestions = (text: string): string[] => {
  const lower = text.toLowerCase();

  // Simple heuristic fallback
  if (lower.includes('buy') || lower.includes('shop')) {
    return [
      'Make a shopping list',
      'Check budget',
      'Go to store',
      'Unpack items',
    ];
  }
  if (lower.includes('clean') || lower.includes('tidy')) {
    return [
      'Gather cleaning supplies',
      'Remove declutter',
      'Wipe surfaces',
      'Take out trash',
    ];
  }
  if (
    lower.includes('email') ||
    lower.includes('write') ||
    lower.includes('report')
  ) {
    return [
      'Draft outline',
      'Research key points',
      'Write first draft',
      'Proofread and edit',
    ];
  }
  if (
    lower.includes('workout') ||
    lower.includes('exercise') ||
    lower.includes('run')
  ) {
    return ['Prepare gear', 'Warm up', 'Main workout', 'Cool down & stretch'];
  }
  if (lower.includes('meet') || lower.includes('plan')) {
    return [
      'Set agenda',
      'Invite participants',
      'Prepare materials',
      'Send follow-up notes',
    ];
  }

  // Generic fallback
  return [
    'Research requirements',
    'Break down into steps',
    'Execute first step',
    'Review progress',
  ];
};
