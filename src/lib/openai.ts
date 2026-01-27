// src/lib/openai.ts
// OpenAI calls are proxied through Supabase Edge Functions to keep API keys secure
import { supabase } from './supabase';
import type { ChatCompletionMessageParam, ChatCompletionMessage } from 'openai/resources/chat/completions';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const getAISuggestions = async (taskDescription: string): Promise<string[]> => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/openai-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'suggestions',
        taskDescription,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 429 || error.isQuotaError) {
        console.log('Quota exceeded, using offline fallback suggestions');
        return generateOfflineSuggestions(taskDescription);
      }
      throw new Error(error.error || 'Failed to get AI suggestions');
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    return generateOfflineSuggestions(taskDescription);
  }
};

export const chatWithBear = async (
  messages: ChatCompletionMessageParam[],
  todoContext: string = ''
): Promise<ChatCompletionMessage> => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/openai-completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'chat',
        messages,
        todoContext,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 429 || error.isQuotaError) {
        return {
          role: 'assistant',
          content: "I'm a bit overwhelmed right now (Rate Limit Exceeded). But I'm still here to cheer you on!",
          refusal: null,
        };
      }
      throw new Error(error.error || 'Failed to chat with Bear');
    }

    const data = await response.json();
    return data.message;

  } catch (error: any) {
    console.error('Error chatting with Bear:', error);

    // Handle rate limit errors
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      return {
        role: 'assistant',
        content: "I'm a bit overwhelmed right now (Rate Limit Exceeded). But I'm still here to cheer you on!",
        refusal: null,
      };
    }

    return {
      role: 'assistant',
      content: "Sorry, I'm having trouble connecting right now.",
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
