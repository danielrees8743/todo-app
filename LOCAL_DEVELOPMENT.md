# Local Development with Ollama

⚠️ **NOT RECOMMENDED** - Local development has JWT authentication issues with Edge Functions.

## Current Setup: Production Only

The app is configured to use production Supabase for everything:
- Authentication
- Database
- Edge Functions (AI)

## Why Not Local?

We encountered these issues with local development:
1. **JWT validation errors** in local Edge Runtime
2. **Ollama unreachable** from production Edge Functions anyway
3. **Added complexity** with no real benefit

## See the 🦙 Indicator Working

To see Ollama (🦙) in action, you would need:

1. **Deploy Ollama to a cloud server** (VPS)
   - Install Ollama on DigitalOcean/AWS/Hetzner
   - Expose port 11434 publicly
   - Get public IP/domain

2. **Configure production Edge Function**
   ```bash
   # In Supabase Dashboard → Project Settings → Edge Functions
   # Add environment variable:
   OLLAMA_URL=http://your-server-ip:11434
   ```

3. **Redeploy Edge Function**
   ```bash
   supabase functions deploy openai-completion
   ```

## Current Behavior

Right now, all Bear responses show **🧸** (OpenAI) because:
- Edge Functions run in production cloud
- Can't reach your local Ollama (localhost:11434)
- Falls back to OpenAI automatically

## Cost Impact

OpenAI GPT-4o Mini is extremely cheap:
- $0.15 per 1M input tokens
- ~2000 chat messages = $0.15
- Unless you're a power user, cost is negligible

## Files Created During Local Setup Attempt

These files can be safely ignored:
- `.env.local.disabled` - Local environment config (disabled)
- `supabase/config.toml` - Local Supabase config
- `supabase/migrations/` - Database migrations
- `LOCAL_DEVELOPMENT.md` - This file

## Recommendation

**Stick with production** - it's simpler, works reliably, and costs are minimal.
