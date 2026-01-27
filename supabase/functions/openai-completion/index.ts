// AI Completion Proxy - Ollama + OpenAI Hybrid - Updated Jan 27, 2026
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'https://esm.sh/openai@4.52.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Ollama configuration
const OLLAMA_URL = Deno.env.get('OLLAMA_URL') || 'http://host.docker.internal:11434';
const OLLAMA_MODEL = 'llama3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Rate limiting configuration
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

// Rate limit check function
const checkRateLimit = (userId: string): { allowed: boolean; retryAfter?: number } => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or create new limit window
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_WINDOW
    });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  userLimit.count++;
  return { allowed: true };
};

// Helper function to call Ollama
const callOllama = async (messages: Array<{ role: string; content: string }>) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Ollama API error:', error);
    throw error;
  }
};

// Helper to detect if a message needs tool calling
const needsToolCalling = (userMessage: string): boolean => {
  const toolKeywords = [
    'add', 'create', 'new task', 'remind me',
    'mark', 'complete', 'done', 'finish',
    'weather in', 'weather for', 'temperature in',
    'break down', 'subtask'
  ];

  const lowerMessage = userMessage.toLowerCase();
  return toolKeywords.some(keyword => lowerMessage.includes(keyword));
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Get user ID from authorization header
    const authHeader = req.headers.get('authorization');
    let userId = 'anonymous';

    if (authHeader) {
      try {
        // Create Supabase client to verify token
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          userId = user.id;
        }
      } catch (error) {
        console.error('Error extracting user ID:', error);
        // Continue with anonymous if token validation fails
      }
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded. You can make ${RATE_LIMIT} requests per minute. Please try again in ${rateLimitCheck.retryAfter} seconds.`,
          isQuotaError: true,
          retry_after: rateLimitCheck.retryAfter
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitCheck.retryAfter)
          }
        }
      );
    }

    // Try both with and without space (there's a trailing space in the secret name)
    const apiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OPENAI_API_KEY ') || Deno.env.get('OPEN_API_KEY');

    // Debug log
    console.log('API Key available:', apiKey ? 'Yes' : 'No');
    console.log('User ID:', userId, 'Requests:', rateLimitMap.get(userId)?.count || 1);

    const openai = new OpenAI({
      apiKey: apiKey || undefined,
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

      // Get last user message to determine routing
      const lastUserMessage = messages[messages.length - 1]?.content || '';
      const requiresTools = needsToolCalling(lastUserMessage);

      console.log('Chat request - Requires tools:', requiresTools, 'Message:', lastUserMessage.substring(0, 50));

      // Use Ollama for general chat, OpenAI for tool calling
      if (!requiresTools) {
        // Use Ollama for general conversation
        try {
          const systemMessage = {
            role: 'system',
            content: `You are Bear, a friendly and helpful AI assistant for a todo list application.

CURRENT CONTEXT:
- Current date/time: ${formattedDateTime}
- Day of week: ${dayOfWeek}
- User's todo list and weather information:
${todoContext || 'No tasks yet'}

RESPONSE STYLE:
- Be concise and friendly
- Use the user's todo list context to provide relevant answers
- Reference current weather from context when relevant
- When referencing tasks, use their exact titles
- For temporal queries, calculate relative to current date
- Suggest priorities and scheduling when appropriate
- IMPORTANT: Never mention internal IDs or database keys in your responses

Remember: You have access to the user's complete todo list and can reference it in your responses.`,
          };

          const ollamaMessages = [systemMessage, ...messages];
          const content = await callOllama(ollamaMessages);

          // Return in OpenAI-compatible format
          const message = {
            role: 'assistant',
            content: content,
          };

          console.log('✓ Ollama response generated (free)');
          return new Response(JSON.stringify({ message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (ollamaError) {
          console.error('Ollama failed, falling back to OpenAI:', ollamaError);
          // Fall through to OpenAI below
        }
      }

      // Use OpenAI for tool calling or if Ollama failed
      console.log('Using OpenAI for tool calling');

      const systemMessage = {
        role: 'system',
        content: `You are Bear, a friendly and helpful AI assistant for a todo list application.

CURRENT CONTEXT:
- Current date/time: ${formattedDateTime}
- Day of week: ${dayOfWeek}
- User's todo list and weather information:
${todoContext || 'No tasks yet'}

YOUR CAPABILITIES:
You can help users manage their tasks through these tools:
1. add_todo - Create a new task
2. add_subtask - Break down existing tasks into smaller steps
3. toggle_todo - Mark tasks complete/incomplete
4. get_weather - Get current weather information for different cities

WHEN TO USE TOOLS:
- User explicitly asks to create/add a task → use add_todo
- User wants to break down a task → use add_subtask
- User asks to complete/mark done a task → use toggle_todo
- User asks about weather in a different city → use get_weather tool

WHEN NOT TO USE TOOLS:
- User asks questions about existing tasks → just answer from context
- User asks about current weather → use the weather info from context (don't call get_weather)
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
- Reference current weather from context when relevant (e.g., suggesting indoor/outdoor tasks)
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

      const completion = await openai.chat.completions.create({
        messages: [systemMessage, ...messages],
        model: 'gpt-4o-mini',
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
