// src/lib/openai.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const getAISuggestions = async (taskDescription) => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful productivity assistant. When given a task descriptions, suggest 3-5 concrete, actionable subtasks to complete it. Return ONLY a valid JSON array of strings, e.g. ["Buy milk", "Check expiration date"]',
        },
        { role: 'user', content: taskDescription },
      ],
      model: 'gpt-5-mini',
    });

    const content = completion.choices[0].message.content;
    try {
      return JSON.parse(content);
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      console.error('Failed to parse AI response', content);
      return [];
    }
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);

    // Fallback for demo/dev purposes (or if API quota exceeded)
    // This ensures the feature is testable without a paid API key
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      console.log('Quota exceeded, using offline fallback suggestions');
      return generateOfflineSuggestions(taskDescription);
    }

    return [];
  }
};

export const chatWithBear = async (messages, todoContext = '') => {
  try {
    const systemMessage = {
      role: 'system',
      content: `You are Bear, a friendly and helpful productivity assistant. You help the user manage their tasks, give motivation, and answer questions. Keep your responses concise and encouraging.
      
      The current date and time is: ${new Date().toLocaleString()}
      
      Here is the user's current todo list context (with IDs):
      ${todoContext}
      
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
              todo_id: {
                type: 'string',
                description: 'The ID of the parent todo task',
              },
              title: {
                type: 'string',
                description: 'The title of the subtask',
              },
            },
            required: ['todo_id', 'title'],
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
                description: 'The title of the todo task to toggle (exact match preferred)',
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
    return message; // Return the full message object to handle tool calls
  } catch (error) {
    console.error('Error chatting with Bear:', error);
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      return {
        role: 'assistant',
        content:
          "I'm a bit overwhelmed right now (Rate Limit Exceeded). But I'm still here to cheer you on!",
      };
    }
    return {
      role: 'assistant',
      content: "Sorry, I'm having trouble connecting right now.",
    };
  }
};

const generateOfflineSuggestions = (text) => {
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
