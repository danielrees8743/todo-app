# AI Feature Improvement Plan

## Executive Summary

### Current AI Capabilities

Bear currently includes an AI-powered chat assistant with the following features:

- **Interactive Chat**: Natural language conversation with Bear assistant
- **Tool Calling**: Four tools available (add_todo, add_subtask, toggle_todo, get_weather)
- **Subtask Suggestions**: AI-generated recommendations for breaking down tasks
- **Context Awareness**: Access to user's current todo list and recent conversation history
- **Offline Fallback**: Heuristic-based subtask suggestions when API unavailable

**Current Models**:
- Chat: gpt-3.5-turbo
- Subtask suggestions: gpt-4o-mini
- Hosted via Supabase Edge Function proxy

### Key Limitations

**Data & Context**
- No access to task timestamps (creation, completion, due dates)
- No historical analytics or completion patterns
- Limited conversation history (last 6 messages only)
- Missing task IDs in context (relies on fragile title matching)
- No user preferences or work patterns available

**Technical Issues**
- Model inconsistency between features
- Title-based tool call matching breaks with duplicate tasks
- Small context window limits conversation depth
- No semantic search or embeddings
- Tool call instructions sometimes conflict in system prompt

**Feature Gaps**
- Cannot answer temporal queries ("what did I complete yesterday?")
- No priority recommendations or smart scheduling
- No natural language filtering ("show overdue high-priority tasks")
- No learning from user feedback or patterns
- No task relationship understanding

### High-Level Roadmap

This plan organizes improvements into four priority tiers:

1. **Foundation & Context** (Quick Wins) - Enhance existing features with better data
2. **Intelligence & Personalization** (Moderate Effort) - Make AI smarter about individual users
3. **Advanced Features** (Higher Effort) - Sophisticated capabilities requiring significant development
4. **Production & Scale** (Long-term) - Infrastructure for serious deployment

Expected timeline: 3-6 months for Priority 1-2, 6-12 months for Priority 3-4

---

## Priority 1: Foundation & Context (Quick Wins)

### 1.1 Enhanced Todo Context

**Problem**: AI only sees task title, status, priority, tags, and subtasks. Missing critical temporal and identity information.

**Solution**: Expand context to include:
- Task IDs (for reliable tool call matching)
- Timestamps: created_at, completed_at, due_datetime
- Task position/order in list
- Completion count (if task was previously completed)

**Implementation**:

```typescript
// In AIChat.tsx, update formatTodosForAI()
const formatTodosForAI = (todos: Todo[]) => {
  return todos.map(todo => ({
    id: todo.id,
    title: todo.title,
    status: todo.completed ? 'completed' : 'active',
    priority: todo.priority,
    tags: todo.tags,
    due_date: todo.due_datetime,
    created_at: todo.created_at,
    completed_at: todo.completed_at,
    position: todo.position,
    subtasks: todo.subtasks?.map(st => ({
      id: st.id,
      text: st.text,
      completed: st.completed
    }))
  }));
};
```

**Expected Impact**:
- Enables temporal reasoning ("tasks created this week")
- More reliable tool calls (ID-based matching)
- Better context for scheduling suggestions
- Foundation for analytics features

**Effort**: 2-4 hours

---

### 1.2 Model Consistency

**Problem**: Using different models (gpt-3.5-turbo vs gpt-4o-mini) creates inconsistent behavior and complicates maintenance.

**Solution**: Standardize on gpt-4o-mini for all AI features.

**Rationale**:
- gpt-4o-mini: $0.150/1M input tokens, $0.600/1M output tokens
- gpt-3.5-turbo: $0.500/1M input tokens, $2.000/1M output tokens
- gpt-4o-mini is 3x cheaper and more capable
- Better function calling reliability
- More consistent responses

**Implementation**:

```typescript
// In lib/openai.ts and supabase/functions/openai-proxy/index.ts
// Change all instances:
const MODEL = 'gpt-4o-mini'; // was gpt-3.5-turbo or mixed
```

**Configuration**:
- Temperature: 0.7 (balanced creativity/consistency)
- Max tokens: 500 for chat, 200 for subtasks
- Top_p: 1.0

**Expected Impact**:
- Lower costs (3x reduction)
- More reliable function calling
- Consistent user experience
- Simpler codebase

**Effort**: 1 hour

---

### 1.3 System Prompt Optimization

**Problem**: Current system prompt lacks examples, context about user's environment, and clear guidelines.

**Solution**: Enhanced system prompt with:
- Few-shot examples
- Timezone and temporal context
- Clearer tool call decision logic
- Response style guidelines

**Implementation**:

```typescript
const SYSTEM_PROMPT = `You are Bear, a friendly and helpful AI assistant for a todo list application.

CURRENT CONTEXT:
- Current date/time: ${new Date().toLocaleString('en-US', {
    timeZone: userTimezone,
    dateStyle: 'full',
    timeStyle: 'short'
  })}
- Day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
- User timezone: ${userTimezone}

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

RESPONSE STYLE:
- Be concise and friendly
- Use the user's todo list context to provide relevant answers
- When referencing tasks, use their exact titles
- For temporal queries, calculate relative to current date
- Suggest priorities and scheduling when appropriate

EXAMPLES:

User: "What do I need to finish today?"
Bear: "Looking at your tasks, you have 2 items due today:
- 'Submit report' (High priority)
- 'Call dentist' (Medium priority)
I'd recommend starting with the report since it's high priority."

User: "Add buy groceries to my list"
Bear: [calls add_todo tool]

User: "What did I complete yesterday?"
Bear: "Yesterday you completed 3 tasks:
- 'Review PR' (completed at 2:30 PM)
- 'Team meeting notes' (completed at 4:15 PM)
- 'Email follow-ups' (completed at 5:00 PM)
Great productivity!"

Remember: You have access to the user's complete todo list and recent conversation history.`;
```

**Expected Impact**:
- Fewer inappropriate tool calls
- Better understanding of when to use tools
- More contextually aware responses
- Clearer personality and tone

**Effort**: 2-3 hours (including testing)

---

### 1.4 Better Tool Call Matching

**Problem**: Current implementation matches tools to todos by title, which fails with duplicate titles or fuzzy matching.

**Solution**: Use task IDs for all tool call matching.

**Implementation**:

```typescript
// Update tool schemas in supabase/functions/openai-proxy/index.ts

const tools = [
  {
    type: 'function',
    function: {
      name: 'add_todo',
      description: 'Create a new todo item',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The todo title' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Task priority level'
          },
          due_date: {
            type: 'string',
            description: 'Due date in ISO format (YYYY-MM-DD)'
          }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_subtask',
      description: 'Add a subtask to an existing todo. Use the task ID from context.',
      parameters: {
        type: 'object',
        properties: {
          todo_id: {
            type: 'string',
            description: 'The UUID of the parent todo task'
          },
          subtask_text: {
            type: 'string',
            description: 'The subtask description'
          }
        },
        required: ['todo_id', 'subtask_text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'toggle_todo',
      description: 'Mark a todo as complete or incomplete. Use the task ID from context.',
      parameters: {
        type: 'object',
        properties: {
          todo_id: {
            type: 'string',
            description: 'The UUID of the todo task'
          },
          completed: {
            type: 'boolean',
            description: 'New completion status'
          }
        },
        required: ['todo_id', 'completed']
      }
    }
  }
];
```

**Client-side changes**:

```typescript
// In AIChat.tsx, update handleToolCall()
const handleToolCall = async (toolCall: any) => {
  const { name, arguments: args } = toolCall.function;
  const parsedArgs = JSON.parse(args);

  switch (name) {
    case 'add_subtask':
      // Now uses todo_id directly instead of finding by title
      await addSubtask(parsedArgs.todo_id, parsedArgs.subtask_text);
      break;

    case 'toggle_todo':
      // Now uses todo_id directly
      await toggleTodo(parsedArgs.todo_id, parsedArgs.completed);
      break;

    // ... other cases
  }
};
```

**Expected Impact**:
- 100% reliable task matching
- Eliminates ambiguity errors
- Enables future multi-task operations
- Cleaner error handling

**Effort**: 3-4 hours

---

## Priority 2: Intelligence & Personalization (Moderate Effort)

### 2.1 Completion Analytics Context

**Problem**: AI has no understanding of user's productivity patterns or historical performance.

**Solution**: Calculate and provide analytics in AI context.

**Metrics to Include**:
- Daily completion rate (avg tasks/day over last 7, 30 days)
- Weekly completion totals
- Time-of-day patterns (morning/afternoon/evening completion rates)
- Common tags and categories
- Average task duration (created to completed)
- Peak productivity hours

**Implementation**:

```typescript
// New utility: src/utils/analytics.ts
export interface UserAnalytics {
  daily_avg_7d: number;
  daily_avg_30d: number;
  weekly_total: number;
  common_tags: string[];
  peak_hours: number[]; // hours 0-23
  avg_completion_time_hours: number;
  total_completed: number;
}

export const calculateAnalytics = (todos: Todo[]): UserAnalytics => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const completed = todos.filter(t => t.completed && t.completed_at);

  const completed7d = completed.filter(t =>
    new Date(t.completed_at!) >= sevenDaysAgo
  );

  const completed30d = completed.filter(t =>
    new Date(t.completed_at!) >= thirtyDaysAgo
  );

  // Calculate peak hours
  const hourCounts = new Array(24).fill(0);
  completed.forEach(t => {
    const hour = new Date(t.completed_at!).getHours();
    hourCounts[hour]++;
  });
  const maxCount = Math.max(...hourCounts);
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.count >= maxCount * 0.7)
    .map(h => h.hour);

  // Calculate avg completion time
  const durations = completed
    .filter(t => t.created_at && t.completed_at)
    .map(t => {
      const created = new Date(t.created_at!).getTime();
      const completed = new Date(t.completed_at!).getTime();
      return (completed - created) / (1000 * 60 * 60); // hours
    });
  const avgDuration = durations.length > 0
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : 0;

  // Extract common tags
  const tagCounts = new Map<string, number>();
  todos.forEach(t => {
    t.tags?.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });
  const commonTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    daily_avg_7d: completed7d.length / 7,
    daily_avg_30d: completed30d.length / 30,
    weekly_total: completed7d.length,
    common_tags: commonTags,
    peak_hours: peakHours,
    avg_completion_time_hours: avgDuration,
    total_completed: completed.length
  };
};
```

**Add to AI context**:

```typescript
// In AIChat.tsx
const analytics = calculateAnalytics(todos);

const analyticsContext = `
USER PRODUCTIVITY PATTERNS:
- Daily average (7d): ${analytics.daily_avg_7d.toFixed(1)} tasks
- Daily average (30d): ${analytics.daily_avg_30d.toFixed(1)} tasks
- This week: ${analytics.weekly_total} tasks completed
- Peak productivity: ${analytics.peak_hours.map(h => `${h}:00`).join(', ')}
- Average task duration: ${analytics.avg_completion_time_hours.toFixed(1)} hours
- Common tags: ${analytics.common_tags.join(', ')}
- Total completed all-time: ${analytics.total_completed}
`;

// Include in system message or user context
```

**Expected Impact**:
- AI can answer "How productive was I this week?"
- Better scheduling recommendations based on peak hours
- Personalized insights ("You usually complete 5 tasks/day")
- Foundation for predictive features

**Effort**: 6-8 hours

---

### 2.2 User Preference Learning

**Problem**: AI treats every user the same, no personalization.

**Solution**: Track and learn from user patterns.

**Preferences to Track**:
- Typical priority distribution (% high/medium/low)
- Preferred organization (by priority, due date, tags)
- Frequently used tags
- Typical work schedule (when tasks are created/completed)
- Task size preferences (granular vs broad)

**Database Schema**:

```sql
-- New table: user_preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Example preferences structure:
{
  "priority_distribution": {
    "high": 0.2,
    "medium": 0.5,
    "low": 0.3
  },
  "common_tags": ["work", "personal", "urgent"],
  "peak_hours": [9, 10, 14, 15],
  "avg_subtasks_per_task": 3.5,
  "prefers_due_dates": true,
  "typical_work_days": [1, 2, 3, 4, 5] // Monday-Friday
}
```

**Implementation**:

```typescript
// New hook: src/hooks/useUserPreferences.ts
export const useUserPreferences = () => {
  const queryClient = useQueryClient();

  const { data: preferences } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .single();

      if (error) throw error;
      return data.preferences;
    }
  });

  const updatePreferences = useMutation({
    mutationFn: async (newPrefs: Partial<UserPreferences>) => {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          preferences: newPrefs,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['userPreferences']);
    }
  });

  return { preferences, updatePreferences };
};
```

**Background job to calculate preferences**:

```typescript
// Run periodically or on-demand
const calculateUserPreferences = (todos: Todo[]) => {
  const priorities = todos.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = todos.length;
  const priorityDist = {
    high: (priorities.high || 0) / total,
    medium: (priorities.medium || 0) / total,
    low: (priorities.low || 0) / total
  };

  // ... calculate other preferences

  return {
    priority_distribution: priorityDist,
    common_tags: extractCommonTags(todos),
    peak_hours: calculatePeakHours(todos),
    avg_subtasks_per_task: calculateAvgSubtasks(todos),
    prefers_due_dates: calculateDueDateUsage(todos) > 0.5,
    typical_work_days: calculateWorkDays(todos)
  };
};
```

**Add to AI context**:

```typescript
const prefsContext = `
USER PREFERENCES:
- Typical priorities: ${prefs.priority_distribution.high * 100}% high, ${prefs.priority_distribution.medium * 100}% medium, ${prefs.priority_distribution.low * 100}% low
- Frequent tags: ${prefs.common_tags.join(', ')}
- Works primarily: ${prefs.typical_work_days.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}
- Usually adds ${prefs.avg_subtasks_per_task.toFixed(1)} subtasks per task
- ${prefs.prefers_due_dates ? 'Often uses' : 'Rarely uses'} due dates
`;
```

**Expected Impact**:
- AI suggests appropriate priorities automatically
- Better subtask suggestions based on user's granularity
- Scheduling respects work patterns
- More personalized recommendations

**Effort**: 10-12 hours

---

### 2.3 Extended Conversation Memory

**Problem**: Only last 6 messages available limits conversation depth.

**Solution**: Increase to 10-15 messages + implement summarization for older context.

**Implementation**:

```typescript
// In AIChat.tsx
const MAX_MESSAGES = 15; // increased from 6
const SUMMARIZE_THRESHOLD = 20;

// Add conversation summarization
const summarizeOldMessages = async (messages: Message[]) => {
  if (messages.length <= SUMMARIZE_THRESHOLD) {
    return messages;
  }

  const oldMessages = messages.slice(0, -MAX_MESSAGES);
  const recentMessages = messages.slice(-MAX_MESSAGES);

  // Call OpenAI to summarize old messages
  const summary = await callOpenAI([
    {
      role: 'system',
      content: 'Summarize this conversation history, preserving key facts, decisions, and todo items mentioned.'
    },
    ...oldMessages
  ]);

  return [
    {
      role: 'system',
      content: `Previous conversation summary: ${summary}`
    },
    ...recentMessages
  ];
};
```

**Store important facts in database**:

```sql
-- New table: conversation_facts
CREATE TABLE conversation_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  fact TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  relevance_score FLOAT DEFAULT 1.0
);

CREATE INDEX idx_conversation_facts_user ON conversation_facts(user_id);
```

**Extract facts from conversation**:

```typescript
// Periodically extract and store important facts
const extractFacts = async (messages: Message[]) => {
  const response = await callOpenAI([
    {
      role: 'system',
      content: 'Extract key facts, preferences, and decisions from this conversation. Format as bullet points.'
    },
    ...messages
  ]);

  const facts = response.split('\n').filter(f => f.trim());

  // Store in database
  for (const fact of facts) {
    await supabase.from('conversation_facts').insert({
      user_id: userId,
      fact: fact.trim(),
      context: 'chat conversation'
    });
  }
};
```

**Expected Impact**:
- Deeper conversations without losing context
- AI remembers past decisions
- Reference to earlier discussions
- Better continuity across sessions

**Effort**: 8-10 hours

---

### 2.4 Smart Recommendations

**Problem**: AI is reactive only, doesn't proactively suggest improvements.

**Solution**: Implement recommendation engine for priorities, scheduling, and task breakdown.

**Recommendation Types**:

1. **Priority Suggestions**
```typescript
const suggestPriority = (todo: Todo, context: { dueDate?: Date, userPatterns: UserPreferences }) => {
  let score = 0;

  // Due date urgency
  if (context.dueDate) {
    const daysUntilDue = (context.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntilDue < 1) score += 3;
    else if (daysUntilDue < 3) score += 2;
    else if (daysUntilDue < 7) score += 1;
  }

  // Tag-based priority
  const urgentTags = ['urgent', 'critical', 'important', 'asap'];
  if (todo.tags?.some(tag => urgentTags.includes(tag.toLowerCase()))) {
    score += 2;
  }

  // Title keywords
  const urgentKeywords = ['urgent', 'asap', 'critical', 'important', 'deadline'];
  if (urgentKeywords.some(kw => todo.title.toLowerCase().includes(kw))) {
    score += 1;
  }

  if (score >= 3) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
};
```

2. **Scheduling Recommendations**
```typescript
const recommendSchedule = (todo: Todo, analytics: UserAnalytics) => {
  // Suggest doing task during peak productivity hours
  const peakHour = analytics.peak_hours[0];
  const peakDay = analytics.typical_work_days[0];

  return {
    suggested_time: `${peakHour}:00`,
    suggested_day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][peakDay],
    reasoning: `You're typically most productive around ${peakHour}:00`
  };
};
```

3. **Auto Task Breakdown**
```typescript
const shouldBreakDown = (todo: Todo) => {
  // Heuristics for when to suggest subtasks
  const titleLength = todo.title.length;
  const hasMultipleActions = /and|then|after|plus/i.test(todo.title);
  const isComplex = titleLength > 50 || hasMultipleActions;

  return isComplex && (!todo.subtasks || todo.subtasks.length === 0);
};
```

**Add to system prompt**:

```typescript
const RECOMMENDATION_PROMPT = `
When users create tasks, proactively offer helpful suggestions:

1. PRIORITY: If a task mentions urgency or has a near due date, suggest appropriate priority
2. SCHEDULING: Recommend optimal time based on user's peak productivity hours
3. BREAKDOWN: If a task seems complex or multi-step, offer to break it into subtasks

Example:
User: "Add: Complete project proposal and send to team"
Bear: "I've added that task. Since it has multiple steps, would you like me to break it down into subtasks? I could suggest:
- Draft project proposal outline
- Write full proposal document
- Review and edit proposal
- Send to team for feedback

Also, you're typically most productive around 10:00 AM - that might be a good time to tackle this."
`;
```

**Expected Impact**:
- Proactive help without being asked
- Better default priorities
- Users naturally create more structured tasks
- Improved task completion rates

**Effort**: 12-15 hours

---

## Priority 3: Advanced Features (Higher Effort)

### 3.1 Natural Language Queries

**Problem**: AI can't filter or search todos with complex criteria.

**Solution**: Implement natural language query parsing and new `query_todos` tool.

**Examples of NL Queries**:
- "Show me overdue high-priority work tasks"
- "What did I complete yesterday?"
- "Find all tasks tagged personal without due dates"
- "How many medium priority tasks are left?"
- "Show incomplete tasks created this week"

**Implementation**:

```typescript
// New tool schema
{
  type: 'function',
  function: {
    name: 'query_todos',
    description: 'Search and filter todos with complex criteria',
    parameters: {
      type: 'object',
      properties: {
        completed: {
          type: 'boolean',
          description: 'Filter by completion status'
        },
        priority: {
          type: 'array',
          items: { type: 'string', enum: ['low', 'medium', 'high'] },
          description: 'Filter by priority levels'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags (AND logic)'
        },
        due_before: {
          type: 'string',
          description: 'Due before this date (ISO format)'
        },
        due_after: {
          type: 'string',
          description: 'Due after this date (ISO format)'
        },
        created_after: {
          type: 'string',
          description: 'Created after this date (ISO format)'
        },
        completed_after: {
          type: 'string',
          description: 'Completed after this date (ISO format)'
        },
        has_subtasks: {
          type: 'boolean',
          description: 'Filter by presence of subtasks'
        },
        search_text: {
          type: 'string',
          description: 'Search in title and description'
        }
      }
    }
  }
}
```

**Query execution**:

```typescript
// In AIChat.tsx
const executeQuery = (todos: Todo[], filters: QueryFilters) => {
  let results = todos;

  if (filters.completed !== undefined) {
    results = results.filter(t => t.completed === filters.completed);
  }

  if (filters.priority?.length) {
    results = results.filter(t => filters.priority!.includes(t.priority));
  }

  if (filters.tags?.length) {
    results = results.filter(t =>
      filters.tags!.every(tag => t.tags?.includes(tag))
    );
  }

  if (filters.due_before) {
    const date = new Date(filters.due_before);
    results = results.filter(t =>
      t.due_datetime && new Date(t.due_datetime) < date
    );
  }

  if (filters.created_after) {
    const date = new Date(filters.created_after);
    results = results.filter(t =>
      t.created_at && new Date(t.created_at) > date
    );
  }

  if (filters.search_text) {
    const search = filters.search_text.toLowerCase();
    results = results.filter(t =>
      t.title.toLowerCase().includes(search)
    );
  }

  return results;
};
```

**AI System Prompt Addition**:

```typescript
const QUERY_INSTRUCTIONS = `
You have access to query_todos for complex filtering. Use it when users ask:
- Temporal queries: "yesterday", "this week", "last month"
- Multi-criteria: "overdue high-priority work tasks"
- Counting: "how many tasks..." (query then count results)
- Status-based: "completed/incomplete/active tasks"

Convert relative dates to ISO format:
- "yesterday" → subtract 1 day from current date
- "this week" → start of current week to now
- "last week" → previous week's date range
`;
```

**Expected Impact**:
- Natural conversation about tasks
- Complex filtering without UI clicks
- Temporal analysis ("what did I do last week?")
- Better task insights

**Effort**: 15-20 hours

---

### 3.2 Semantic Search & Embeddings

**Problem**: Only keyword matching available, can't find related or similar tasks.

**Solution**: Generate embeddings for todos and implement semantic search.

**Architecture**:

1. **Generate embeddings** when todos are created/updated
2. **Store in Supabase** using pgvector extension
3. **Search by similarity** using vector operations

**Database Setup**:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to todos
ALTER TABLE todos
ADD COLUMN embedding vector(1536); -- OpenAI text-embedding-3-small dimension

-- Create index for fast similarity search
CREATE INDEX ON todos USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Generate Embeddings**:

```typescript
// New function in lib/openai.ts
export const generateEmbedding = async (text: string): Promise<number[]> => {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small', // $0.02 per 1M tokens
      input: text
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
};

// Generate on todo creation
const onTodoCreate = async (todo: Todo) => {
  const text = `${todo.title}\n${todo.description || ''}`;
  const embedding = await generateEmbedding(text);

  await supabase
    .from('todos')
    .update({ embedding })
    .eq('id', todo.id);
};
```

**Semantic Search**:

```typescript
// New function
export const findSimilarTodos = async (
  queryText: string,
  limit: number = 5
): Promise<Todo[]> => {
  const queryEmbedding = await generateEmbedding(queryText);

  const { data, error } = await supabase.rpc('match_todos', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: limit
  });

  if (error) throw error;
  return data;
};

// SQL function for matching
-- Create in Supabase SQL editor
CREATE OR REPLACE FUNCTION match_todos(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS SETOF todos
LANGUAGE sql STABLE
AS $$
  SELECT *
  FROM todos
  WHERE embedding <=> query_embedding < 1 - match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

**Add to AI Tools**:

```typescript
{
  type: 'function',
  function: {
    name: 'find_similar_tasks',
    description: 'Find tasks similar to a description or concept',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Description of task to find similar items for'
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Number of results to return'
        }
      },
      required: ['query']
    }
  }
}
```

**Use Cases**:
- "Find tasks related to the client presentation"
- "Show similar tasks to this one" (for templates)
- "Are there duplicates of this task?"
- Detect task patterns and suggest grouping

**Expected Impact**:
- Discover related tasks automatically
- Avoid duplicate work
- Better task organization suggestions
- Foundation for task templates

**Effort**: 20-25 hours

**Cost**: ~$0.02 per 1M tokens (very cheap)

---

### 3.3 Predictive Analytics

**Problem**: No insight into task completion time or optimal ordering.

**Solution**: Use historical data to predict completion times and suggest optimal task order.

**Features**:

1. **Completion Time Estimation**

```typescript
// Analyze historical patterns
const estimateCompletionTime = (todo: Todo, history: Todo[]) => {
  // Find similar completed tasks
  const similar = history.filter(t =>
    t.completed &&
    t.priority === todo.priority &&
    t.tags?.some(tag => todo.tags?.includes(tag)) &&
    t.created_at && t.completed_at
  );

  if (similar.length === 0) {
    // Fallback to priority-based estimates
    const estimates = { high: 2, medium: 4, low: 1 }; // hours
    return estimates[todo.priority];
  }

  // Calculate average duration
  const durations = similar.map(t => {
    const created = new Date(t.created_at!).getTime();
    const completed = new Date(t.completed_at!).getTime();
    return (completed - created) / (1000 * 60 * 60); // hours
  });

  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const stdDev = Math.sqrt(
    durations.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / durations.length
  );

  return {
    estimate_hours: avg,
    confidence: stdDev < avg * 0.5 ? 'high' : 'medium',
    range: [avg - stdDev, avg + stdDev]
  };
};
```

2. **Optimal Task Ordering**

```typescript
// Suggest task order based on:
// - Due dates (urgency)
// - Dependencies (blocked tasks)
// - Estimated duration (quick wins)
// - Priority
// - Historical patterns (what user typically does first)

const suggestTaskOrder = (todos: Todo[], analytics: UserAnalytics) => {
  return todos
    .filter(t => !t.completed)
    .map(t => ({
      ...t,
      score: calculatePriorityScore(t, analytics)
    }))
    .sort((a, b) => b.score - a.score);
};

const calculatePriorityScore = (todo: Todo, analytics: UserAnalytics) => {
  let score = 0;

  // Due date urgency (0-10 points)
  if (todo.due_datetime) {
    const hoursUntilDue =
      (new Date(todo.due_datetime).getTime() - Date.now()) / (1000 * 60 * 60);
    score += Math.max(0, 10 - hoursUntilDue / 24);
  }

  // Priority (0-5 points)
  const priorityPoints = { high: 5, medium: 3, low: 1 };
  score += priorityPoints[todo.priority];

  // Quick wins - tasks estimated < 1 hour (0-3 points)
  const estimate = estimateCompletionTime(todo, analytics);
  if (estimate.estimate_hours < 1) score += 3;

  // Has subtasks already planned (1 point)
  if (todo.subtasks && todo.subtasks.length > 0) score += 1;

  // Tagged with user's common tags (0-2 points)
  const commonTagMatch = todo.tags?.filter(t =>
    analytics.common_tags.includes(t)
  ).length || 0;
  score += Math.min(2, commonTagMatch);

  return score;
};
```

3. **Bottleneck Identification**

```typescript
// Identify tasks that are blocking others or taking too long
const identifyBottlenecks = (todos: Todo[]) => {
  const bottlenecks = [];

  todos.forEach(todo => {
    if (!todo.completed && todo.created_at) {
      const age = (Date.now() - new Date(todo.created_at).getTime()) / (1000 * 60 * 60 * 24);

      // Task older than 7 days
      if (age > 7) {
        bottlenecks.push({
          todo,
          reason: 'overdue',
          age_days: age,
          suggestion: 'This task has been open for a week. Consider breaking it down or re-evaluating priority.'
        });
      }

      // High priority but many subtasks incomplete
      if (todo.priority === 'high' && todo.subtasks) {
        const incomplete = todo.subtasks.filter(st => !st.completed).length;
        const total = todo.subtasks.length;
        if (total > 0 && incomplete / total > 0.7) {
          bottlenecks.push({
            todo,
            reason: 'stuck',
            progress: `${total - incomplete}/${total} subtasks`,
            suggestion: 'High priority task is stalled. Focus on completing subtasks.'
          });
        }
      }
    }
  });

  return bottlenecks;
};
```

**Add to AI Context**:

```typescript
const predictions = todos.map(t => ({
  id: t.id,
  title: t.title,
  estimated_hours: estimateCompletionTime(t, completedTodos).estimate_hours
}));

const bottlenecks = identifyBottlenecks(todos);

const predictiveContext = `
COMPLETION ESTIMATES:
${predictions.map(p => `- "${p.title}": ~${p.estimated_hours.toFixed(1)}h`).join('\n')}

RECOMMENDED ORDER (by priority score):
${suggestTaskOrder(todos, analytics).slice(0, 5).map((t, i) =>
  `${i + 1}. ${t.title}`
).join('\n')}

${bottlenecks.length > 0 ? `
BOTTLENECKS DETECTED:
${bottlenecks.map(b => `- "${b.todo.title}": ${b.reason} (${b.suggestion})`).join('\n')}
` : ''}
`;
```

**Expected Impact**:
- Realistic time estimates
- Better daily planning
- Identify stuck tasks proactively
- Optimize task order for productivity

**Effort**: 25-30 hours

---

### 3.4 User Feedback Loop

**Problem**: No way to know if AI responses are helpful or accurate.

**Solution**: Collect feedback and use it to improve prompts and responses.

**Database Schema**:

```sql
-- Feedback table
CREATE TABLE ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'neutral')),
  feedback_text TEXT,
  context JSONB, -- store conversation context
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_feedback_user ON ai_feedback(user_id);
CREATE INDEX idx_ai_feedback_type ON ai_feedback(feedback_type);

-- Tool call logs
CREATE TABLE ai_tool_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  tool_name TEXT NOT NULL,
  arguments JSONB,
  result TEXT,
  success BOOLEAN,
  error TEXT,
  execution_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_tool_calls_user ON ai_tool_calls(user_id);
CREATE INDEX idx_ai_tool_calls_success ON ai_tool_calls(success);
```

**UI Implementation**:

```typescript
// Add thumbs up/down buttons to AI messages
const AIMessage = ({ message }: { message: Message }) => {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const handleFeedback = async (type: 'positive' | 'negative') => {
    setFeedback(type);

    await supabase.from('ai_feedback').insert({
      user_id: currentUser.id,
      conversation_id: conversationId,
      message_id: message.id,
      feedback_type: type,
      context: {
        message: message.content,
        todos_count: todos.length,
        timestamp: new Date().toISOString()
      }
    });
  };

  return (
    <div className="ai-message">
      <p>{message.content}</p>
      <div className="feedback-buttons">
        <button
          onClick={() => handleFeedback('positive')}
          className={feedback === 'positive' ? 'active' : ''}
        >
          👍
        </button>
        <button
          onClick={() => handleFeedback('negative')}
          className={feedback === 'negative' ? 'active' : ''}
        >
          👎
        </button>
      </div>
    </div>
  );
};
```

**Log Tool Calls**:

```typescript
// In handleToolCall()
const handleToolCall = async (toolCall: any) => {
  const startTime = Date.now();
  let success = false;
  let error = null;
  let result = null;

  try {
    result = await executeToolCall(toolCall);
    success = true;
  } catch (e) {
    error = e.message;
  } finally {
    const executionTime = Date.now() - startTime;

    await supabase.from('ai_tool_calls').insert({
      user_id: currentUser.id,
      tool_name: toolCall.function.name,
      arguments: JSON.parse(toolCall.function.arguments),
      result: result ? JSON.stringify(result) : null,
      success,
      error,
      execution_time_ms: executionTime
    });
  }
};
```

**Analytics Dashboard** (admin view):

```typescript
// Query feedback metrics
const getFeedbackMetrics = async () => {
  const { data: metrics } = await supabase.rpc('get_feedback_metrics');

  // Returns:
  // {
  //   positive_rate: 0.85,
  //   negative_rate: 0.10,
  //   neutral_rate: 0.05,
  //   total_feedback: 1234,
  //   avg_response_time_ms: 856,
  //   tool_success_rate: 0.92
  // }
};

// SQL function
CREATE OR REPLACE FUNCTION get_feedback_metrics()
RETURNS JSON
LANGUAGE sql
AS $$
  SELECT json_build_object(
    'positive_rate',
      COUNT(*) FILTER (WHERE feedback_type = 'positive')::float / COUNT(*),
    'negative_rate',
      COUNT(*) FILTER (WHERE feedback_type = 'negative')::float / COUNT(*),
    'total_feedback', COUNT(*),
    'tool_success_rate',
      (SELECT COUNT(*) FILTER (WHERE success = true)::float / COUNT(*)
       FROM ai_tool_calls)
  )
  FROM ai_feedback
  WHERE created_at > now() - interval '30 days';
$$;
```

**Use Feedback for Improvement**:

```typescript
// Periodically review negative feedback
const analyzeNegativeFeedback = async () => {
  const { data } = await supabase
    .from('ai_feedback')
    .select('*, context')
    .eq('feedback_type', 'negative')
    .order('created_at', { ascending: false })
    .limit(50);

  // Group by common patterns
  const patterns = data.reduce((acc, f) => {
    // Extract patterns from context
    const messageLength = f.context.message.length;
    const hadToolCall = f.context.message.includes('tool_call');

    // Categorize
    if (messageLength < 50) {
      acc.too_short = (acc.too_short || 0) + 1;
    }
    if (hadToolCall) {
      acc.tool_call_issues = (acc.tool_call_issues || 0) + 1;
    }

    return acc;
  }, {});

  // Use insights to adjust prompts or add examples
};
```

**Expected Impact**:
- Continuous improvement based on real usage
- Identify and fix common failure modes
- Track prompt effectiveness over time
- Prioritize feature improvements by user feedback

**Effort**: 15-20 hours

---

### 3.5 Multi-turn Planning

**Problem**: AI can't help with complex, multi-step planning.

**Solution**: Enable project planning with dependencies and milestones.

**Features**:

1. **Project Breakdown Assistant**

```typescript
// New tool
{
  type: 'function',
  function: {
    name: 'create_project',
    description: 'Create a project with multiple related tasks and milestones',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              depends_on: {
                type: 'array',
                items: { type: 'number' },
                description: 'Array of task indices this depends on'
              }
            }
          }
        }
      },
      required: ['project_name', 'tasks']
    }
  }
}
```

2. **Conversation Flow**

```
User: "Help me plan the website redesign project"

Bear: "I'd be happy to help plan the website redesign! Let me break this into phases. Here's what I suggest:

**Phase 1: Research & Planning**
1. Analyze current site performance
2. Gather user feedback
3. Create wireframes

**Phase 2: Design**
4. Design new homepage (depends on #3)
5. Design product pages (depends on #3)
6. Create design system (depends on #4, #5)

**Phase 3: Development**
7. Set up new frontend framework (depends on #6)
8. Implement homepage (depends on #7)
9. Implement product pages (depends on #7)

**Phase 4: Launch**
10. Testing and QA (depends on #8, #9)
11. Deploy to production (depends on #10)

Should I create these tasks? I can adjust priorities, add more details, or break down any step further."

User: "Yes, create them"

Bear: [Creates all 11 tasks with dependencies]
```

3. **Dependency Tracking**

```typescript
// Add to database schema
ALTER TABLE todos
ADD COLUMN depends_on UUID[] DEFAULT '{}';

// Query to check if task is ready
const isTaskReady = (todo: Todo, allTodos: Todo[]) => {
  if (!todo.depends_on || todo.depends_on.length === 0) {
    return true;
  }

  return todo.depends_on.every(depId => {
    const depTask = allTodos.find(t => t.id === depId);
    return depTask?.completed;
  });
};

// Show blocked tasks
const blockedTasks = todos.filter(t => !isTaskReady(t, todos));
```

4. **Milestone Tracking**

```sql
-- New table
CREATE TABLE project_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  task_ids UUID[] NOT NULL,
  target_date DATE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Expected Impact**:
- Plan complex projects with AI guidance
- Understand task dependencies automatically
- Track milestone progress
- Better project management without external tools

**Effort**: 30-35 hours

---

## Priority 4: Production & Scale (Long-term)

### 4.1 Fine-tuning

**Problem**: Generic models may not understand todo-specific patterns optimally.

**Solution**: Fine-tune a model on high-quality conversation data.

**Process**:

1. **Collect Training Data**

```typescript
// Save high-quality conversations
const saveConversationForTraining = async (conversation: Message[], quality: 'high' | 'low') => {
  await supabase.from('training_conversations').insert({
    user_id: currentUser.id,
    messages: conversation,
    quality_rating: quality,
    metadata: {
      task_count: todos.length,
      tools_used: extractToolCalls(conversation),
      conversation_length: conversation.length
    }
  });
};

// Criteria for high-quality:
// - Positive user feedback
// - Successful tool calls
// - Natural conversation flow
// - No errors or corrections
```

2. **Prepare Training Dataset**

```typescript
// OpenAI fine-tuning format
const prepareFineTuningData = async () => {
  const { data: conversations } = await supabase
    .from('training_conversations')
    .select('*')
    .eq('quality_rating', 'high')
    .limit(500);

  const trainingData = conversations.map(conv => ({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conv.messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    ]
  }));

  // Save as JSONL
  const jsonl = trainingData
    .map(item => JSON.stringify(item))
    .join('\n');

  return jsonl;
};
```

3. **Fine-tune Model**

```bash
# Upload training file
openai api fine_tunes.create \
  -t "training_data.jsonl" \
  -m "gpt-4o-mini" \
  --suffix "bear-todo-assistant"

# Monitor training
openai api fine_tunes.follow -i ft-xxxxx

# After completion, use fine-tuned model
# Model name: ft:gpt-4o-mini:org:bear-todo-assistant:xxxxx
```

4. **A/B Testing**

```typescript
// Randomly assign users to base or fine-tuned model
const getModelForUser = (userId: string) => {
  const hash = hashString(userId);
  const variant = hash % 100;

  if (variant < 50) {
    return 'gpt-4o-mini'; // Control group
  } else {
    return 'ft:gpt-4o-mini:org:bear-todo-assistant:xxxxx'; // Treatment
  }
};

// Track performance metrics
const trackModelPerformance = async (model: string, metrics: {
  response_time: number;
  user_feedback: 'positive' | 'negative';
  tool_success: boolean;
}) => {
  await supabase.from('model_performance').insert({
    model,
    ...metrics,
    timestamp: new Date().toISOString()
  });
};
```

**Expected Impact**:
- Better understanding of todo-specific language
- Fewer errors in tool calls
- More natural responses
- Potentially lower costs with smaller fine-tuned model

**Effort**: 40-50 hours (including data collection, training, evaluation)

**Cost**: $8-10 per 1M training tokens (one-time) + ongoing inference costs

---

### 4.2 Prompt Versioning

**Problem**: Hard to track prompt changes and their impact.

**Solution**: Store prompts in database with versioning and A/B testing.

**Database Schema**:

```sql
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  version INT NOT NULL,
  content TEXT NOT NULL,
  active BOOLEAN DEFAULT false,
  ab_test_percentage FLOAT, -- null or 0-100
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(name, version)
);

CREATE TABLE prompt_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_version_id UUID REFERENCES prompt_versions(id),
  user_id UUID REFERENCES auth.users(id),
  positive_feedback_count INT DEFAULT 0,
  negative_feedback_count INT DEFAULT 0,
  avg_response_time_ms FLOAT,
  tool_success_rate FLOAT,
  total_uses INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Implementation**:

```typescript
// Load prompt from database
const getActivePrompt = async (promptName: string, userId: string) => {
  // Check if user is in A/B test
  const { data: testVariants } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('name', promptName)
    .not('ab_test_percentage', 'is', null);

  if (testVariants && testVariants.length > 0) {
    const random = Math.random() * 100;
    const variant = testVariants.find(v => random < v.ab_test_percentage!);
    if (variant) return variant;
  }

  // Default to active version
  const { data } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('name', promptName)
    .eq('active', true)
    .single();

  return data;
};

// Track performance
const trackPromptPerformance = async (
  promptVersionId: string,
  metrics: PromptMetrics
) => {
  await supabase.rpc('update_prompt_performance', {
    p_prompt_version_id: promptVersionId,
    p_positive_feedback: metrics.positiveFeedback ? 1 : 0,
    p_negative_feedback: metrics.negativeFeedback ? 1 : 0,
    p_response_time: metrics.responseTime,
    p_tool_success: metrics.toolSuccess ? 1 : 0
  });
};
```

**Admin UI**:

```typescript
// Prompt management dashboard
const PromptManager = () => {
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptVersion | null>(null);

  return (
    <div>
      <h1>Prompt Versions</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Version</th>
            <th>Status</th>
            <th>Performance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {prompts.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>v{p.version}</td>
              <td>{p.active ? 'Active' : p.ab_test_percentage ? `A/B ${p.ab_test_percentage}%` : 'Inactive'}</td>
              <td>
                👍 {p.performance.positive_rate}%
                👎 {p.performance.negative_rate}%
              </td>
              <td>
                <button onClick={() => activatePrompt(p.id)}>Activate</button>
                <button onClick={() => createABTest(p.id)}>A/B Test</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

**Expected Impact**:
- Track prompt improvements over time
- Safe A/B testing of new prompts
- Data-driven prompt optimization
- Easy rollback if new prompt underperforms

**Effort**: 15-20 hours

---

### 4.3 Advanced Context Management (RAG)

**Problem**: Limited context window restricts long-term memory and large todo lists.

**Solution**: Implement Retrieval-Augmented Generation (RAG) to dynamically select relevant context.

**Architecture**:

1. **Vector Store** - Store embeddings for:
   - All todos (title + description)
   - Conversation history summaries
   - User preferences and facts
   - Common Q&A patterns

2. **Retrieval** - On each query:
   - Embed user's message
   - Search vector store for relevant context
   - Rank by relevance
   - Include top K results in prompt

3. **Dynamic Context** - Select context based on query type:
   - Task questions → retrieve relevant todos
   - History questions → retrieve relevant past conversations
   - General questions → retrieve user preferences

**Implementation**:

```typescript
// Context retrieval system
const retrieveRelevantContext = async (
  query: string,
  maxItems: number = 5
): Promise<ContextItem[]> => {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Search multiple context sources
  const [relevantTodos, relevantConversations, relevantFacts] = await Promise.all([
    searchTodos(queryEmbedding, maxItems),
    searchConversations(queryEmbedding, maxItems),
    searchFacts(queryEmbedding, maxItems)
  ]);

  // Combine and rank by relevance
  const allContext = [
    ...relevantTodos.map(t => ({ type: 'todo', data: t, score: t.similarity })),
    ...relevantConversations.map(c => ({ type: 'conversation', data: c, score: c.similarity })),
    ...relevantFacts.map(f => ({ type: 'fact', data: f, score: f.similarity }))
  ];

  return allContext
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);
};

// Build context-aware prompt
const buildRAGPrompt = async (userMessage: string, allTodos: Todo[]) => {
  const relevantContext = await retrieveRelevantContext(userMessage);

  const contextText = relevantContext.map(item => {
    switch (item.type) {
      case 'todo':
        return `Task: "${item.data.title}" (${item.data.status}, ${item.data.priority} priority)`;
      case 'conversation':
        return `Previous discussion: ${item.data.summary}`;
      case 'fact':
        return `User fact: ${item.data.fact}`;
    }
  }).join('\n');

  return {
    role: 'system',
    content: `${SYSTEM_PROMPT}

RELEVANT CONTEXT FOR THIS QUERY:
${contextText}

FULL TODO LIST:
${formatTodosForAI(allTodos)}
`
  };
};
```

**Long-term Memory**:

```sql
-- Store conversation summaries
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  summary TEXT NOT NULL,
  embedding vector(1536),
  message_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Summarize conversations periodically
const summarizeConversation = async (messages: Message[]) => {
  const summary = await callOpenAI([
    {
      role: 'system',
      content: 'Summarize this conversation, preserving key facts, decisions, and action items.'
    },
    ...messages
  ]);

  const embedding = await generateEmbedding(summary);

  await supabase.from('conversation_summaries').insert({
    user_id: currentUser.id,
    summary,
    embedding,
    message_ids: messages.map(m => m.id)
  });
};
```

**Expected Impact**:
- Support for large todo lists (100s or 1000s of tasks)
- Long-term memory across sessions
- More relevant responses by focusing on pertinent context
- Scalable to power users

**Effort**: 35-40 hours

---

### 4.4 Cost Optimization

**Problem**: High API costs at scale.

**Solution**: Implement multiple cost-saving strategies.

**Strategies**:

1. **Response Caching**

```typescript
// Cache common queries
const responseCache = new Map<string, { response: string, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedResponse = (query: string) => {
  const hash = hashString(query.toLowerCase().trim());
  const cached = responseCache.get(hash);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }

  return null;
};

const cacheResponse = (query: string, response: string) => {
  const hash = hashString(query.toLowerCase().trim());
  responseCache.set(hash, { response, timestamp: Date.now() });
};

// Clear old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute
```

2. **Batch API Calls**

```typescript
// Queue tool calls and execute in batch
const toolCallQueue: ToolCall[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

const queueToolCall = (toolCall: ToolCall) => {
  toolCallQueue.push(toolCall);

  if (!batchTimeout) {
    batchTimeout = setTimeout(async () => {
      await executeBatchToolCalls(toolCallQueue);
      toolCallQueue.length = 0;
      batchTimeout = null;
    }, 500); // Wait 500ms for more calls
  }
};

const executeBatchToolCalls = async (calls: ToolCall[]) => {
  // Execute all at once instead of sequentially
  const results = await Promise.all(
    calls.map(call => executeToolCall(call))
  );

  return results;
};
```

3. **Smart Model Selection**

```typescript
// Use cheaper models for simple queries
const selectModel = (query: string, context: any) => {
  // Very simple queries → cheapest model
  if (query.length < 20 && !context.requiresTools) {
    return 'gpt-4o-mini'; // Already cheap
  }

  // Complex queries or tool use → use standard model
  return 'gpt-4o-mini';

  // In future, could use even smaller models for simple queries
  // or fine-tuned smaller models for specific tasks
};
```

4. **Token Budgets**

```typescript
// Limit tokens per user per day
const TOKEN_BUDGET_PER_DAY = 100000; // ~100K tokens/day

const checkTokenBudget = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('token_usage')
    .select('total_tokens')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const used = data?.total_tokens || 0;
  return used < TOKEN_BUDGET_PER_DAY;
};

const trackTokenUsage = async (userId: string, tokens: number) => {
  const today = new Date().toISOString().split('T')[0];

  await supabase.rpc('increment_token_usage', {
    p_user_id: userId,
    p_date: today,
    p_tokens: tokens
  });
};
```

5. **Prompt Compression**

```typescript
// Compress context by removing redundant information
const compressContext = (todos: Todo[]) => {
  // Remove duplicate data
  return todos.map(t => ({
    id: t.id,
    t: t.title, // Shortened keys
    s: t.completed ? 1 : 0, // Numeric status
    p: t.priority[0], // h/m/l
    tags: t.tags,
    sub: t.subtasks?.length || 0 // Just count, not full details
  }));
};
```

**Monitoring**:

```typescript
// Track costs in real-time
const calculateCost = (usage: { input_tokens: number, output_tokens: number }) => {
  const INPUT_COST = 0.150 / 1_000_000; // $0.150 per 1M tokens
  const OUTPUT_COST = 0.600 / 1_000_000; // $0.600 per 1M tokens

  return (usage.input_tokens * INPUT_COST) + (usage.output_tokens * OUTPUT_COST);
};

const trackCosts = async (userId: string, cost: number) => {
  await supabase.from('ai_costs').insert({
    user_id: userId,
    cost,
    timestamp: new Date().toISOString()
  });
};
```

**Expected Impact**:
- 30-50% cost reduction through caching
- Better resource allocation
- Sustainable at scale
- Usage visibility

**Effort**: 20-25 hours

---

### 4.5 Quality Monitoring

**Problem**: No systematic way to track AI quality over time.

**Solution**: Comprehensive monitoring and alerting system.

**Metrics to Track**:

1. **Response Quality**
   - User feedback rate (positive/negative/neutral)
   - Average response time
   - Token usage per query
   - Cache hit rate

2. **Tool Performance**
   - Tool call success rate by type
   - Tool call latency
   - Error rates and types
   - Retry frequency

3. **User Engagement**
   - Messages per session
   - Session duration
   - Daily/weekly active users
   - Feature adoption rates

4. **Business Metrics**
   - Cost per user per day
   - Cost per successful interaction
   - ROI (value provided vs cost)

**Implementation**:

```typescript
// Metrics collection
interface AIMetrics {
  timestamp: Date;
  userId: string;
  sessionId: string;

  // Response metrics
  responseTimeMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheHit: boolean;

  // Quality metrics
  userFeedback?: 'positive' | 'negative';
  toolCallsCount: number;
  toolSuccessRate: number;

  // Cost metrics
  estimatedCost: number;
}

const collectMetrics = async (metrics: AIMetrics) => {
  await supabase.from('ai_metrics').insert(metrics);
};

// Real-time dashboard aggregations
const getMetricsSummary = async (timeRange: 'hour' | 'day' | 'week') => {
  const { data } = await supabase.rpc('get_ai_metrics_summary', {
    time_range: timeRange
  });

  return data;
};

// SQL aggregation function
CREATE OR REPLACE FUNCTION get_ai_metrics_summary(time_range TEXT)
RETURNS JSON
LANGUAGE sql
AS $$
  SELECT json_build_object(
    'total_queries', COUNT(*),
    'avg_response_time_ms', AVG(response_time_ms),
    'avg_tokens', AVG(input_tokens + output_tokens),
    'cache_hit_rate',
      COUNT(*) FILTER (WHERE cache_hit = true)::float / COUNT(*),
    'positive_feedback_rate',
      COUNT(*) FILTER (WHERE user_feedback = 'positive')::float /
      COUNT(*) FILTER (WHERE user_feedback IS NOT NULL),
    'tool_success_rate', AVG(tool_success_rate),
    'total_cost', SUM(estimated_cost),
    'unique_users', COUNT(DISTINCT user_id)
  )
  FROM ai_metrics
  WHERE timestamp > CASE
    WHEN time_range = 'hour' THEN now() - interval '1 hour'
    WHEN time_range = 'day' THEN now() - interval '1 day'
    WHEN time_range = 'week' THEN now() - interval '7 days'
  END;
$$;
```

**Alerting System**:

```typescript
// Define alert thresholds
const ALERT_THRESHOLDS = {
  error_rate: 0.05, // 5%
  avg_response_time_ms: 3000, // 3 seconds
  negative_feedback_rate: 0.20, // 20%
  daily_cost_per_user: 0.10, // $0.10
  tool_success_rate: 0.90 // 90%
};

// Check thresholds periodically
const checkAlerts = async () => {
  const metrics = await getMetricsSummary('hour');

  const alerts = [];

  if (metrics.tool_success_rate < ALERT_THRESHOLDS.tool_success_rate) {
    alerts.push({
      severity: 'high',
      message: `Tool success rate dropped to ${(metrics.tool_success_rate * 100).toFixed(1)}%`,
      metric: 'tool_success_rate',
      value: metrics.tool_success_rate
    });
  }

  if (metrics.avg_response_time_ms > ALERT_THRESHOLDS.avg_response_time_ms) {
    alerts.push({
      severity: 'medium',
      message: `Average response time increased to ${metrics.avg_response_time_ms}ms`,
      metric: 'response_time',
      value: metrics.avg_response_time_ms
    });
  }

  if (alerts.length > 0) {
    await sendAlerts(alerts);
  }
};

// Run every 5 minutes
setInterval(checkAlerts, 5 * 60 * 1000);
```

**Monitoring Dashboard** (admin):

```typescript
const AIMonitoringDashboard = () => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');

  useEffect(() => {
    const loadMetrics = async () => {
      const data = await getMetricsSummary(timeRange);
      setMetrics(data);
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  return (
    <div className="monitoring-dashboard">
      <h1>AI Performance Monitoring</h1>

      <div className="time-range-selector">
        <button onClick={() => setTimeRange('hour')}>Last Hour</button>
        <button onClick={() => setTimeRange('day')}>Last 24h</button>
        <button onClick={() => setTimeRange('week')}>Last Week</button>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="Total Queries"
          value={metrics?.total_queries}
          trend={calculateTrend(metrics?.total_queries)}
        />

        <MetricCard
          title="Avg Response Time"
          value={`${metrics?.avg_response_time_ms}ms`}
          status={metrics?.avg_response_time_ms < 2000 ? 'good' : 'warning'}
        />

        <MetricCard
          title="Positive Feedback"
          value={`${(metrics?.positive_feedback_rate * 100).toFixed(1)}%`}
          status={metrics?.positive_feedback_rate > 0.8 ? 'good' : 'warning'}
        />

        <MetricCard
          title="Tool Success Rate"
          value={`${(metrics?.tool_success_rate * 100).toFixed(1)}%`}
          status={metrics?.tool_success_rate > 0.9 ? 'good' : 'critical'}
        />

        <MetricCard
          title="Cache Hit Rate"
          value={`${(metrics?.cache_hit_rate * 100).toFixed(1)}%`}
        />

        <MetricCard
          title="Total Cost"
          value={`$${metrics?.total_cost.toFixed(4)}`}
        />
      </div>

      <div className="charts">
        <ResponseTimeChart timeRange={timeRange} />
        <FeedbackChart timeRange={timeRange} />
        <CostChart timeRange={timeRange} />
      </div>
    </div>
  );
};
```

**Expected Impact**:
- Early detection of quality degradation
- Data-driven optimization decisions
- Cost control and predictability
- SLA tracking and accountability

**Effort**: 25-30 hours

---

## Implementation Roadmap

### Phase 1: Quick Wins (Weeks 1-2)

**Goal**: Improve existing features with minimal architectural changes

**Tasks**:
- ✓ Model consistency (1.2) - 1 hour
- ✓ Enhanced todo context (1.1) - 4 hours
- ✓ System prompt optimization (1.3) - 3 hours
- ✓ Better tool call matching (1.4) - 4 hours

**Total Effort**: ~12 hours
**Expected Impact**: More reliable AI, better responses, lower costs

---

### Phase 2: Personalization (Weeks 3-6)

**Goal**: Make AI understand individual users

**Tasks**:
- ✓ Completion analytics (2.1) - 8 hours
- ✓ User preference learning (2.2) - 12 hours
- ✓ Extended conversation memory (2.3) - 10 hours
- ✓ Smart recommendations (2.4) - 15 hours

**Total Effort**: ~45 hours
**Expected Impact**: Personalized experience, proactive suggestions

---

### Phase 3: Advanced Intelligence (Weeks 7-12)

**Goal**: Sophisticated features that differentiate the product

**Tasks**:
- ✓ Natural language queries (3.1) - 20 hours
- ✓ User feedback loop (3.4) - 20 hours
- ✓ Semantic search & embeddings (3.2) - 25 hours
- ✓ Predictive analytics (3.3) - 30 hours
- ✓ Multi-turn planning (3.5) - 35 hours

**Total Effort**: ~130 hours
**Expected Impact**: Industry-leading AI assistant, strong product differentiation

---

### Phase 4: Production Scale (Weeks 13-24)

**Goal**: Infrastructure for serious deployment

**Tasks**:
- ✓ Prompt versioning (4.2) - 20 hours
- ✓ Cost optimization (4.4) - 25 hours
- ✓ Quality monitoring (4.5) - 30 hours
- ✓ Advanced context management (4.3) - 40 hours
- ✓ Fine-tuning (4.1) - 50 hours

**Total Effort**: ~165 hours
**Expected Impact**: Scalable, cost-effective, high-quality production system

---

## Success Criteria

### Phase 1
- [ ] Tool call success rate > 95%
- [ ] Average response time < 2 seconds
- [ ] Cost reduced by 50% (model switch)
- [ ] Zero tool call matching errors

### Phase 2
- [ ] User feedback positive rate > 80%
- [ ] Personalized recommendations in 100% of sessions
- [ ] Conversation depth increased 2x (6 → 12+ messages)
- [ ] Weekly active users retain 2+ weeks

### Phase 3
- [ ] Natural language queries work for 90%+ of user requests
- [ ] Task completion rate improves 15-20%
- [ ] User reports AI as "very helpful" in surveys
- [ ] Semantic search finds relevant tasks 90%+ of time

### Phase 4
- [ ] System handles 10,000+ users without degradation
- [ ] Cost per user per month < $0.50
- [ ] 99% uptime for AI features
- [ ] Positive feedback rate > 85%

---

## Risk Assessment

### Technical Risks

**High Risk**:
- **OpenAI API availability/rate limits** - Mitigation: Implement circuit breakers, fallbacks, caching
- **Cost overruns** - Mitigation: Token budgets, monitoring, automatic cutoffs
- **Fine-tuning quality** - Mitigation: Thorough evaluation, A/B testing, rollback plan

**Medium Risk**:
- **Embedding quality for semantic search** - Mitigation: Test multiple embedding models, tune similarity thresholds
- **RAG complexity** - Mitigation: Start simple, iterate based on feedback
- **Database performance with vectors** - Mitigation: Proper indexing, query optimization

**Low Risk**:
- **User adoption** - AI is already popular in the market
- **Prompt engineering** - Well-established best practices

### Business Risks

**High Risk**:
- **User privacy concerns with conversation storage** - Mitigation: Clear privacy policy, encryption, data deletion options
- **Regulatory compliance (GDPR, CCPA)** - Mitigation: Legal review, proper data handling, user consent

**Medium Risk**:
- **OpenAI pricing changes** - Mitigation: Model flexibility, fallback to cheaper models
- **Competitive pressure** - Fast-moving space with many AI todo apps

**Low Risk**:
- **User confusion with AI features** - Mitigation: Good UX, clear documentation, optional features

---

## Conclusion

This comprehensive plan outlines a path from Bear's current basic AI implementation to an industry-leading intelligent assistant. The phased approach allows for:

1. **Quick validation** with Phase 1 quick wins
2. **User value** with Phase 2 personalization
3. **Differentiation** with Phase 3 advanced features
4. **Scale** with Phase 4 production infrastructure

**Recommended Next Steps**:

1. Start with Phase 1 (2 weeks, low risk, high impact)
2. Gather user feedback and metrics
3. Decide on Phase 2+ based on user response and business priorities
4. Consider hiring/contracting ML/AI specialist for Phase 3-4

**Total Estimated Effort**: 350+ hours across all phases

**Expected Timeline**: 6-12 months for full implementation

The improvements are designed to be incremental and independent, allowing for flexibility in prioritization based on user feedback, technical constraints, and business goals.
