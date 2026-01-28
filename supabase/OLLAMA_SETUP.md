# Ollama VM Integration Setup

This document describes how to configure the Edge Function to use Ollama running on your local VM.

## Configuration

The Edge Function supports a hybrid approach: it tries Ollama first, then falls back to OpenAI if Ollama is unavailable.

### Environment Variables

Set these in your Supabase project (Dashboard → Project Settings → Edge Functions → Add secret):

```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://192.168.0.216:11434
OLLAMA_MODEL=llama3.2
USE_OLLAMA=true

# OpenAI Fallback
OPENAI_API_KEY=your_openai_api_key_here
```

### Local Development

For local testing with Supabase CLI, create `supabase/.env.local`:

```bash
OLLAMA_BASE_URL=http://192.168.0.216:11434
OLLAMA_MODEL=llama3.2
USE_OLLAMA=true
OPENAI_API_KEY=your_openai_api_key_here
```

## How It Works

1. **Primary**: Requests are sent to Ollama on your VM (192.168.0.216:11434)
2. **Fallback**: If Ollama fails (network issue, VM offline, etc.), falls back to OpenAI
3. **Response**: Includes `model_used` field indicating which model processed the request

## Supported Features

Both the Bear chatbot and subtask suggestions will use this hybrid approach:

- ✅ AI Chat (Bear assistant)
- ✅ Subtask suggestions
- ✅ Function calling (tool use)
- ✅ Weather context integration

## Deployment

### Deploy to Supabase

```bash
cd supabase
supabase functions deploy openai-proxy
```

### Set Environment Variables (Production)

```bash
# Using Supabase CLI
supabase secrets set OLLAMA_BASE_URL=http://192.168.0.216:11434
supabase secrets set OLLAMA_MODEL=llama3.2
supabase secrets set USE_OLLAMA=true

# Keep OpenAI key for fallback
supabase secrets set OPENAI_API_KEY=your_key_here
```

## Troubleshooting

### Ollama Not Responding

Check if your VM is accessible:
```bash
curl http://192.168.0.216:11434/v1/models
```

### Disable Ollama Temporarily

Set `USE_OLLAMA=false` to use only OpenAI:
```bash
supabase secrets set USE_OLLAMA=false
```

### Check Logs

```bash
supabase functions logs openai-proxy
```

Look for:
- "Trying Ollama at..." - Request sent to Ollama
- "Ollama request successful" - Ollama responded
- "Ollama failed, falling back to OpenAI" - Using fallback

## Network Requirements

- Your Supabase Edge Function needs network access to 192.168.0.216:11434
- For local development: Your machine must reach the VM
- For production (deployed): Your Supabase project must reach your VM (may require VPN or public endpoint)

**Note**: If deploying to Supabase Cloud, your VM at 192.168.0.216 won't be accessible unless you:
1. Expose Ollama via a public URL (not recommended for security)
2. Use Supabase self-hosted with network access to your VM
3. Keep USE_OLLAMA=false in production and use it only for local development
