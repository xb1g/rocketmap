# Chat AI Copilot Troubleshooting Guide

This guide helps debug issues with the per-block chat AI copilot in RocketMap.

## Common Issues

### 1. Chat messages not appearing

**Symptoms:**
- User sends a message but it doesn't appear in the chat
- Messages appear briefly then disappear
- Chat shows "Loading chat..." indefinitely

**Possible causes:**

#### A. Missing database indexes
The messages collection requires specific indexes for efficient queries:

1. Navigate to Appwrite Console → Databases → Messages collection → Indexes
2. Verify the following indexes exist (see [APPWRITE_INDEXES.md](./APPWRITE_INDEXES.md)):
   - `canvas_chatKey_createdAt` (composite index on canvas, chatKey, createdAt - all ASC)
   - `canvas_chatKey_user` (composite index on canvas, chatKey, user - all ASC)
   - `chatKey_fulltext` (fulltext index on chatKey)

#### B. Incorrect relationship configuration
The messages collection must have proper relationships configured:

1. Go to Appwrite Console → Databases → Messages collection → Attributes
2. Verify the following relationship fields exist:
   - `canvas` → Many-to-One with `canvases` table, Two-Way relationship
   - `user` → Many-to-One with `users` table, Two-Way relationship

#### C. Permission issues
Check that the user has permission to read/write messages:

1. Go to Appwrite Console → Databases → Messages collection → Settings → Permissions
2. Ensure appropriate permissions are set for authenticated users

### 2. Chat sessions not loading

**Symptoms:**
- Session selector shows no sessions
- Creating new sessions doesn't work
- Default session doesn't appear

**Solution:**
1. Check browser console for API errors
2. Verify the `/api/canvas/[canvasId]/messages?sessions=1&scope=[blockType]` endpoint returns data
3. Ensure the `chatKey_fulltext` index exists for `startsWith` queries

### 3. Assistant responses not streaming

**Symptoms:**
- User message appears but assistant never responds
- Chat shows loading state indefinitely
- No error messages

**Solution:**
1. Check the `/api/canvas/[canvasId]/blocks/[blockType]/chat` endpoint is working
2. Verify AI API credentials are configured correctly
3. Check browser console for streaming errors
4. Review server logs for AI model errors

### 4. Messages persist but don't load on page refresh

**Symptoms:**
- Chat works during session
- After refresh, all messages are gone
- Database contains the messages

**Solution:**
This was the primary bug fixed in the 2026-02-16 update. The issue was that chat-persistence.ts was incorrectly treating relationship fields as simple strings.

**The fix:**
- Relationship fields (`canvas`, `user`) now correctly use the related row's `$id` for queries
- `Query.equal('canvas', canvasDocId)` now queries against the canvas row's `$id` value
- Creating rows now passes relationship values directly (e.g., `canvas: canvasDocId`)

**Verification:**
```typescript
// ✅ CORRECT (after fix)
Query.equal('canvas', canvasDocId) // canvasDocId is the canvas row's $id

// ❌ INCORRECT (before fix)
const canvasId = await resolveCanvasId(canvasDocId, userId);
Query.equal('canvas', canvasId) // This was redundant and wrong
```

## Debugging Steps

### Step 1: Check database structure
```bash
# Verify messages collection exists
# Go to Appwrite Console → Databases → [Your Database] → Tables
# Confirm "messages" table exists with these attributes:
# - $id (string)
# - canvas (relationship to canvases)
# - user (relationship to users)
# - chatKey (string)
# - role (string)
# - content (longtext)
# - messageId (string)
# - createdAt (string)
```

### Step 2: Test API endpoints

#### Test loading messages:
```bash
curl -X GET "https://your-appwrite.com/v1/databases/[DB_ID]/tables/messages/rows?queries[]=equal(\"canvas\",\"[CANVAS_ID]\")&queries[]=equal(\"chatKey\",\"customer_segments\")" \
  -H "X-Appwrite-Project: [PROJECT_ID]" \
  -H "X-Appwrite-Key: [API_KEY]"
```

#### Test creating a message:
```bash
curl -X POST "/api/canvas/[canvasId]/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "chatKey": "customer_segments",
    "role": "user",
    "content": "Test message",
    "messageId": "test-123"
  }'
```

### Step 3: Check browser console
1. Open DevTools → Console
2. Look for errors starting with `[chat-persist]`
3. Check Network tab for failed API requests
4. Verify WebSocket connections (if streaming)

### Step 4: Verify permissions
1. User must be authenticated
2. User must have access to the canvas
3. Canvas ID must match the URL parameter

## Code References

### Key files:
- `/lib/ai/chat-persistence.ts` - Core chat persistence logic
- `/app/api/canvas/[canvasId]/messages/route.ts` - Messages API endpoints
- `/app/api/canvas/[canvasId]/blocks/[blockType]/chat/route.ts` - Chat streaming endpoint
- `/app/components/ai/BlockChatSection.tsx` - Chat UI component
- `/app/components/ai/useChatSessions.ts` - Session management hook

### Database schema:
See [DATABASE_SCHEMA.md](../docs/DATABASE_SCHEMA.md) for complete schema documentation.

## Testing Checklist

After making changes, verify:

- [ ] Can create a new chat session
- [ ] Can send a message (user message appears in chat)
- [ ] Can receive AI response (assistant message appears)
- [ ] Can switch between chat sessions
- [ ] Messages persist after page refresh
- [ ] Can load previous chat history
- [ ] Multiple chat sessions work independently
- [ ] Chat works across different block types

## Performance Notes

- Cursor pagination is used for chat messages to avoid expensive offset calculations
- Messages are loaded in batches of 100
- Session list is limited to 500 messages for session discovery
- Indexes are critical for performance - missing indexes will cause slow queries

## Related Documentation

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Complete database schema
- [APPWRITE_INDEXES.md](./APPWRITE_INDEXES.md) - Required database indexes
- [APPWRITE_TABLESDB_MIGRATION.md](./APPWRITE_TABLESDB_MIGRATION.md) - TablesDB API guide
