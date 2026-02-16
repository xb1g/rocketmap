# Appwrite Indexes Reference

This document lists all required indexes for the RocketMap database to ensure optimal query performance.

## Messages Collection

### Required Indexes

1. **Composite Index: canvas_chatKey_createdAt**
   - **Attributes:** `canvas`, `chatKey`, `createdAt`
   - **Orders:** ASC, ASC, ASC
   - **Purpose:** Efficient loading of chat messages for a specific canvas and chat session, ordered chronologically
   - **Used in:** `loadChatMessages()`, `listChatSessions()`

2. **Composite Index: canvas_chatKey_user**
   - **Attributes:** `canvas`, `chatKey`, `user`
   - **Orders:** ASC, ASC, ASC
   - **Purpose:** Efficient deletion of chat messages by canvas, session, and user
   - **Used in:** `deleteChatMessages()`

3. **Fulltext Index: chatKey_fulltext**
   - **Attribute:** `chatKey`
   - **Purpose:** Enable `startsWith` queries for listing chat sessions by scope prefix
   - **Used in:** `listChatSessions()`

## Blocks Collection

### Existing Indexes

1. **Composite Index: canvas_blockType**
   - **Attributes:** `canvas`, `blockType`
   - **Orders:** ASC, ASC
   - **Purpose:** Efficient loading of all blocks for a canvas
   - **Used in:** Block loading queries

## Segments Collection

### Existing Indexes

1. **Index: canvas**
   - **Attribute:** `canvas`
   - **Order:** ASC
   - **Purpose:** Load all segments for a canvas
   - **Used in:** Segment loading queries

## Setup Instructions

To create these indexes in Appwrite Console:

1. Navigate to **Databases** → Select your database → **Messages** collection
2. Click **Indexes** tab → **Create Index**
3. For composite indexes:
   - Enter the index key (e.g., `canvas_chatKey_createdAt`)
   - Select **Key** type
   - Add attributes in order: `canvas`, `chatKey`, `createdAt`
   - Set each to **Ascending**
   - Click **Create**
4. For fulltext indexes:
   - Enter the index key (e.g., `chatKey_fulltext`)
   - Select **Fulltext** type
   - Add attribute: `chatKey`
   - Click **Create**

## Performance Notes

- **Relationship fields** (canvas, user) use the related row's `$id` for queries
- `Query.equal('canvas', canvasId)` queries against the relationship field value
- Indexes on relationship fields behave like indexes on string fields (the $id value)
- Cursor pagination (`Query.cursorAfter()`) is used for chat messages to avoid expensive offset calculations
