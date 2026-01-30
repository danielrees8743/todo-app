// OpenAI/Ollama Hybrid Proxy - Updated Jan 28, 2026
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'https://esm.sh/openai@4.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Ollama configuration
const OLLAMA_BASE_URL = Deno.env.get('OLLAMA_BASE_URL') || 'http://localhost:11434';
const OLLAMA_MODEL = Deno.env.get('OLLAMA_MODEL') || 'llama3.2:1b';
const USE_OLLAMA = Deno.env.get('USE_OLLAMA') === 'true'; // Default to false (opt-in) for production safety
const OLLAMA_TIMEOUT = 20000; // 20 seconds timeout for Ollama requests

// System prompts
const SUBTASK_SYSTEM_PROMPT = 'You are a helpful productivity assistant. When given a task description, suggest 3-5 concrete, actionable subtasks to complete it. Return ONLY a valid JSON array of strings, e.g. ["Buy milk", "Check expiration date"]';

// Helper function to call Ollama with timeout
async function callOllama(messages: any[], tools?: any[]) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, OLLAMA_TIMEOUT);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        tools: tools || undefined,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Ollama request timed out');
    }
    // Differentiate between configuration errors and other errors
    if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('ECONNREFUSED'))) {
      console.error('⚠️ Ollama configuration error - check OLLAMA_BASE_URL:', error.message);
      throw new Error('Ollama server unreachable - check configuration');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper function to try Ollama with OpenAI fallback
async function tryOllamaWithFallback(
  openaiClient: OpenAI,
  messages: any[],
  tools?: any[],
  model: string = 'gpt-4o-mini'
): Promise<{ completion: any; modelUsed: 'ollama' | 'openai' }> {
  let completion: any;
  let modelUsed: 'ollama' | 'openai' = 'openai';

  // Try Ollama first if enabled
  if (USE_OLLAMA) {
    try {
      console.log(`Trying Ollama at ${OLLAMA_BASE_URL} with model ${OLLAMA_MODEL}`);
      completion = await callOllama(messages, tools);
      modelUsed = 'ollama';
      console.log('Ollama request successful');
    } catch (ollamaError) {
      console.log('Ollama failed, falling back to OpenAI:', ollamaError);
      // Fall through to OpenAI fallback
    }
  }

  // Fallback to OpenAI if Ollama failed or is disabled
  if (!completion) {
    completion = await openaiClient.chat.completions.create({
      messages,
      model,
      tools: tools || undefined,
      tool_choice: tools ? 'auto' : undefined,
    });
    modelUsed = 'openai';
  }

  return { completion, modelUsed };
}

// Helper function to try Ollama with OpenAI fallback
async function tryOllamaWithFallback(
  openaiClient: OpenAI,
  messages: any[],
  model: string = 'gpt-4o-mini',
  tools?: any[]
): Promise<{ completion: any; modelUsed: 'ollama' | 'openai' }> {
  let completion: any;
  let modelUsed: 'ollama' | 'openai' = 'openai';

  // Try Ollama first if enabled
  if (USE_OLLAMA) {
    try {
      console.log(`Trying Ollama at ${OLLAMA_BASE_URL} with model ${OLLAMA_MODEL}`);
      const ollamaResponse = await callOllama(messages, tools);
      completion = ollamaResponse;
      modelUsed = 'ollama';
      console.log('Ollama request successful');
    } catch (ollamaError) {
      console.log('Ollama failed, falling back to OpenAI:', ollamaError);
      // Fall through to OpenAI fallback
    }
  }

  // Fallback to OpenAI if Ollama failed or is disabled
  if (!completion) {
    completion = await openaiClient.chat.completions.create({
      messages,
      model,
      tools,
      tool_choice: tools ? 'auto' : undefined,
    });
    modelUsed = 'openai';
  }

  return { completion, modelUsed };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');

    // Debug log - remove after testing
    console.log('API Key available:', apiKey ? 'Yes' : 'No');
    console.log('API Key length:', apiKey?.length || 0);

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const { action, messages, taskDescription, todoContext } = await req.json();

    if (action === 'suggestions') {
      const { completion, modelUsed } = await tryOllamaWithFallback(
        openai,
        [
          {
            role: 'system',
            content:
              'You are a helpful productivity assistant. When given a task description, suggest 3-5 concrete, actionable subtasks to complete it. Return ONLY a valid JSON array of strings, e.g. ["Buy milk", "Check expiration date"]',
          },
          { role: 'user', content: taskDescription },
        ]
      );

      const content = completion.choices[0].message.content;
      let suggestions = [];
      try {
        suggestions = JSON.parse(content || '[]');
      } catch {
        console.error('Failed to parse AI response', content);
      }

      return new Response(JSON.stringify({ suggestions, model_used: modelUsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'chat') {
      // Chat with Bear assistant
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const formattedDateTime = `${formattedDate} at ${formattedTime}`;

      const systemMessage = {
        role: 'system',
        content: `You are Bear, a friendly and helpful AI assistant for a todo list application.

CURRENT CONTEXT:
- Current date/time: ${formattedDateTime}
- Day of week: ${dayOfWeek}
- User's todo list:
${todoContext || 'No tasks yet'}

YOUR CAPABILITIES:
You can help users manage their tasks through these tools:
1. add_todo - Create a new task
2. add_subtask - Break down existing tasks into smaller steps
3. toggle_todo - Mark tasks complete/incomplete
4. get_weather - Get current weather information

WHEN TO USE TOOLS:
- User explicitly asks to create/add a task → use add_todo
- User wants to break down a task → use add_subtask
- User asks to complete/mark done a task → use toggle_todo
- User asks about weather → use get_weather

WHEN NOT TO USE TOOLS:
- User asks questions about existing tasks → just answer from context
- User wants advice or suggestions → provide guidance without tools
- Ambiguous requests → ask for clarification first

TOOL USAGE GUIDELINES FOR add_todo:
When adding a task, gather this information:
1. Title (required)
2. Priority (Low, Medium, High)
3. Description (optional details)
4. Tags (optional categorization)
5. Due date and time (optional)

If the user provides all details upfront, use the tool immediately.
If information is missing, ask for it conversationally before calling the tool.
If user says "quick task" or similar, create with just title and default Medium priority.

RESPONSE STYLE:
- Be concise and friendly
- Use the user's todo list context to provide relevant answers
- When referencing tasks, use their exact titles
- For temporal queries, calculate relative to current date
- Suggest priorities and scheduling when appropriate
- IMPORTANT: Never mention internal IDs or database keys in your responses

EXAMPLES:

User: "What do I need to finish today?"
Bear: "Looking at your tasks, you have 2 items due today:
- 'Submit report' (High priority)
- 'Call dentist' (Medium priority)
I'd recommend starting with the report since it's high priority."

User: "Add buy groceries to my list"
Bear: [calls add_todo tool with title "buy groceries", priority "Medium"]

User: "Create a high priority task to finish the presentation by Friday at 5pm"
Bear: [calls add_todo tool with title "Finish the presentation", priority "High", due_datetime "2026-01-31T17:00:00"]

User: "What did I complete yesterday?"
Bear: "I can see your current tasks, but I don't have access to completion history yet. However, I can see which tasks are marked as complete now. Would you like me to show you those?"

Remember: You have access to the user's complete todo list and can reference it in your responses.`,
      };

      const tools = [
        {
          type: 'function',
          function: {
            name: 'add_todo',
            description: 'Add a new task to the todo list',
            parameters: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'The title of the task',
                },
                priority: {
                  type: 'string',
                  enum: ['Low', 'Medium', 'High'],
                  description: 'The priority level',
                },
                description: {
                  type: 'string',
                  description: 'Optional details about the task',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of tags for the task',
                },
                due_datetime: {
                  type: 'string',
                  description: 'The due date and time in ISO 8601 format',
                },
              },
              required: ['title'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'add_subtask',
            description: 'Add a subtask to an existing todo',
            parameters: {
              type: 'object',
              properties: {
                todo_title: {
                  type: 'string',
                  description: 'The title of the parent todo task',
                },
                title: {
                  type: 'string',
                  description: 'The title of the subtask',
                },
              },
              required: ['todo_title', 'title'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'toggle_todo',
            description: 'Mark a todo as completed or incomplete',
            parameters: {
              type: 'object',
              properties: {
                todo_title: {
                  type: 'string',
                  description:
                    'The title of the todo task to toggle (exact match preferred)',
                },
              },
              required: ['todo_title'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_weather',
            description: 'Get the current weather for a specific city.',
            parameters: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: 'The name of the city to get weather for',
                },
              },
              required: ['city'],
            },
          },
        },
      ];

      const { completion, modelUsed } = await tryOllamaWithFallback(
        openai,
        [systemMessage, ...messages],
        'gpt-4o-mini',
        tools
      );

      const message = completion.choices[0].message;
      return new Response(JSON.stringify({ message, model_used: modelUsed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('OpenAI proxy error:', err);

    const error = err as { status?: number; code?: string; message?: string };
    const isQuotaError =
      error?.status === 429 || error?.code === 'insufficient_quota';

    return new Response(
      JSON.stringify({
        error: error?.message || 'An error occurred',
        isQuotaError,
      }),
      {
        status: isQuotaError ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
