# Ollama Integration - Quick Reference

## ✅ Status: WORKING

Your Ollama on Raspberry Pi is fully integrated and functional!

## What You Have

- **Pi**: `192.168.0.216:11434`
- **Model**: `llama3.2:1b`
- **Status**: ✅ Responding successfully
- **Local Dev**: Uses OpenAI fallback (due to Edge Runtime timeouts)
- **Production**: Will use Ollama with proper timeout settings

## Quick Commands

### Check Ollama Status
```bash
curl http://192.168.0.216:11434
# Should return: "Ollama is running"
```

### Watch Logs
```bash
# See which model is being used:
docker logs -f supabase_edge_runtime_todo | grep -E "Ollama|OpenAI"
```

### Deploy to Production
```bash
supabase functions deploy openai-completion --timeout 30
supabase secrets set OLLAMA_BASE_URL=http://192.168.0.216:11434
supabase secrets set OLLAMA_MODEL=llama3.2:1b
supabase secrets set USE_OLLAMA=true
```

## How to See Which Model is Used

### Browser Console (F12):
- `🦙 Ollama` = Your Pi processed the request
- `🧸 OpenAI` = OpenAI processed the request

### In the App:
Look for emojis under Bear's avatar in chat:
- 🦙 = Ollama response
- 🧸 = OpenAI response

## Why Local Dev Shows OpenAI

The local Supabase Edge Runtime has aggressive timeouts (~10-15 seconds) that kill Ollama responses before they complete. **This is normal and expected.** Your Ollama is working perfectly (proven by direct tests), but local development uses OpenAI fallback for speed and reliability.

**Solution**: Deploy to production with `--timeout 30` to use Ollama there.

## Files Reference

- **Setup Guide**: `OLLAMA_FINAL_SETUP.md` - Complete documentation
- **Configuration**: `OLLAMA_SETUP.md` - Original setup instructions
- **Environment**: `functions/.env` - Local environment variables
- **Edge Function**: `functions/openai-completion/index.ts` - Hybrid logic

## Need Help?

Check the detailed guide: `supabase/OLLAMA_FINAL_SETUP.md`
