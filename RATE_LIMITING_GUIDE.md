# AI Rate Limiting Implementation Guide

## Overview

Implemented three-layer rate limiting protection for AI features to prevent abuse, manage costs, and handle API errors gracefully.

## Features Implemented

### 1. Client-Side Throttling ✅

**Location:** `src/components/AIChat/AIChat.tsx`

**Configuration:**
- Minimum interval: 2 seconds between requests
- Immediate user feedback

**Behavior:**
- Tracks timestamp of last request
- Prevents spam clicks/rapid submissions
- Shows helpful message: "Please wait X more seconds before sending another message"

**Benefits:**
- Improves UX (prevents accidental double-sends)
- Reduces unnecessary API calls
- Fast feedback (no network round-trip needed)

### 2. OpenAI Error Handling with Exponential Backoff ✅

**Location:** `src/lib/openai.ts`

**Configuration:**
- Max retries: 3 attempts
- Initial backoff: 1 second
- Backoff multiplier: 2x (exponential)
- Retry sequence: 1s → 2s → 4s

**Handles:**
- 429 rate limit errors from OpenAI API
- Network errors (fetch failures)
- Automatic retry with exponential backoff
- Graceful degradation after max retries

**Benefits:**
- Transparent to users (automatic recovery)
- Reduces failed requests
- Better error messages
- Handles temporary API issues

**Error Messages:**
- Rate limit (after retries): "I'm currently experiencing high demand and couldn't process your request. Please try again in a few moments."
- Network error (after retries): "Sorry, I'm having trouble connecting right now. Please check your internet connection and try again."

### 3. Server-Side Rate Limiting ✅

**Location:** `supabase/functions/openai-completion/index.ts`

**Configuration:**
- Limit: 20 requests per user per minute
- Window: 60 seconds (rolling)
- Storage: In-memory Map (Edge Function)
- Cleanup: Automatic every 60 seconds

**Implementation:**
- Extracts user ID from JWT token
- Tracks request count per user
- Returns 429 status with `Retry-After` header
- Falls back to 'anonymous' if no auth

**Response on Limit:**
```json
{
  "error": "Rate limit exceeded. You can make 20 requests per minute. Please try again in X seconds.",
  "isQuotaError": true,
  "retry_after": 45
}
```

**Benefits:**
- Protects backend from abuse
- Fair usage across users
- Prevents cost overruns
- Can't be bypassed by client manipulation

## Rate Limit Flow

```
User sends message
    ↓
Client-side check (2s throttle)
    ↓ (if passed)
Server-side check (20/min)
    ↓ (if passed)
OpenAI API call
    ↓ (if 429)
Exponential backoff retry (up to 3x)
    ↓ (if still fails)
User-friendly error message
```

## Testing

### Manual Testing Checklist

**Client-Side Throttling:**
- [ ] Send message
- [ ] Try to send another immediately
- [ ] Should see "Please wait X more seconds" message
- [ ] Wait 2 seconds, should be able to send again

**OpenAI Error Handling:**
- [ ] (Requires OpenAI rate limit) - Automatic retry occurs
- [ ] Network errors automatically retry with backoff
- [ ] After 3 failed retries, show error message

**Server-Side Rate Limiting:**
- [ ] Send 20 requests rapidly (use DevTools Console)
- [ ] 21st request should fail with 429 error
- [ ] Error message should indicate retry time
- [ ] Wait 60 seconds, limit should reset

### Testing Script

```javascript
// Run in browser console to test rate limit
async function testRateLimit() {
  for (let i = 1; i <= 25; i++) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', messages: [], todoContext: '' })
      });
      console.log(`Request ${i}: ${response.status}`);
      if (response.status === 429) {
        const data = await response.json();
        console.log('Rate limited:', data);
      }
    } catch (error) {
      console.error(`Request ${i} failed:`, error);
    }
  }
}

testRateLimit();
```

## Configuration

### Adjusting Limits

**Client-Side (AIChat.tsx):**
```typescript
const MIN_REQUEST_INTERVAL = 2000; // milliseconds
```

**Client-Side Retry (openai.ts):**
```typescript
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // milliseconds
```

**Server-Side (openai-completion/index.ts):**
```typescript
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW = 60 * 1000; // milliseconds
```

## Monitoring

### Recommended Metrics to Track

1. **Client-side throttle hits** - How often users hit 2s limit
2. **429 errors from OpenAI** - How often we hit OpenAI's limits
3. **Retry success rate** - % of retries that succeed
4. **Server-side rate limit hits** - How often users hit 20/min limit
5. **Average requests per user** - Usage patterns

### Future Enhancements

Consider implementing:
- Database-backed rate limiting (persistent across Edge Function restarts)
- Per-user daily/monthly quotas
- Different limits for free vs paid tiers
- Usage dashboard for users
- Admin override for testing
- Webhook notifications on repeated violations

## Cost Implications

**Before:**
- No protection against rapid API calls
- Potential for cost overruns
- Vulnerable to accidental or malicious abuse

**After:**
- Max 20 requests/min per user = 1,200 requests/hour
- Retry logic reduces failed requests (saves money)
- Client throttling prevents unnecessary calls
- Predictable costs with upper bounds

**Estimated Savings:**
- 30-50% reduction in unnecessary API calls
- Prevents abuse scenarios (infinite loops, bots)
- Retry logic improves success rate (less wasted calls)

## Error Handling Strategy

**Progressive Degradation:**
1. **Client throttle** - Instant feedback, no cost
2. **Server rate limit** - Protective boundary, clear messaging
3. **OpenAI retry** - Handle temporary issues automatically
4. **Graceful failure** - Helpful error messages if all else fails

**User Experience:**
- Most users never notice limits (under normal usage)
- Clear feedback when limits are hit
- Automatic recovery when possible
- No confusing technical errors

## Security Considerations

- User ID extracted from verified JWT token
- Rate limits enforced server-side (can't bypass)
- In-memory storage (no PII persisted)
- Automatic cleanup prevents memory leaks
- Anonymous users get rate limited too

## Compliance

**Privacy:**
- Only user IDs tracked (no message content)
- Data stored in-memory only (ephemeral)
- Automatic cleanup after 60 seconds

**Fair Usage:**
- Same limits for all users (currently)
- Can be expanded to tiered limits later
- Transparent error messages

## Troubleshooting

### "Please wait X more seconds" appearing too often
- User is sending messages too quickly (expected behavior)
- Consider increasing `MIN_REQUEST_INTERVAL` if causing UX issues

### 429 errors from server
- User exceeded 20 requests per minute
- Check if legitimate usage or potential abuse
- Consider increasing `RATE_LIMIT` if too restrictive

### Retries not working
- Check browser console for logs
- Verify OpenAI API key is valid
- Check network connectivity

### Rate limits not resetting
- Edge Function may have restarted (in-memory cleared)
- Check cleanup interval is running
- Verify time calculations are correct

## Production Checklist

- [ ] Rate limit values tested and tuned
- [ ] Error messages are user-friendly
- [ ] Monitoring/logging in place
- [ ] Documentation updated
- [ ] Team aware of limits
- [ ] Support team has troubleshooting guide
- [ ] Consider database-backed limits for persistence

## Related Files

- `src/components/AIChat/AIChat.tsx` - Client throttling
- `src/lib/openai.ts` - Retry logic
- `supabase/functions/openai-completion/index.ts` - Server rate limiting

## Version

- Implementation date: January 27, 2026
- Version: 1.0
- Branch: `feature/ai-rate-limiting`
