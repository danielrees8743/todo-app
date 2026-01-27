import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'https://esm.sh/openai@4.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const { action, messages, taskDescription, todoContext } = await req.json();

    if (action === 'suggestions') {
      // Get AI suggestions for subtasks
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful productivity assistant. When given a task description, suggest 3-5 concrete, actionable subtasks to complete it. Return ONLY a valid JSON array of strings, e.g. ["Buy milk", "Check expiration date"]',
          },
          { role: 'user', content: taskDescription },
        ],
        model: 'gpt-4o-mini',
      });

      const content = completion.choices[0].message.content;
      let suggestions = [];
      try {
        suggestions = JSON.parse(content || '[]');
      } catch {
        console.error('Failed to parse AI response', content);
      }

      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'chat') {
      // Chat with Bear assistant
      const systemMessage = {
        role: 'system',
        content: `You are Bear, a friendly and helpful productivity assistant. You help the user manage their tasks, give motivation, and answer questions. Keep your responses concise and encouraging.

        The current date and time is: ${new Date().toISOString()}

        Here is the user's current todo list context:
        ${todoContext || ''}

        IMPORTANT: When referencing tasks, always use their Title and other user-visible details, and omit any internal identifiers or database keys from your responses.

        When the user asks you to add a new task, you MUST ask for the following information if it hasn't been provided yet:
        1. Title
        2. Description
        3. Priority (Low, Medium, High)
        4. Tags (if any)
        5. Due Time and Date

        Do NOT call the "add_todo" tool until you have confirmed these details with the user or if the user explicitly tells you to skip some details.

        Refer to the existing tasks when relevant. You can add new tasks or subtasks using the available tools.`,
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

      const completion = await openai.chat.completions.create({
        messages: [systemMessage, ...messages],
        model: 'gpt-3.5-turbo',
        tools: tools,
        tool_choice: 'auto',
      });

      const message = completion.choices[0].message;
      return new Response(JSON.stringify({ message }), {
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
