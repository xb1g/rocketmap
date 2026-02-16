# Manual Task: Create `cards` Collection in Appwrite

**When:** Before deploying the `feat/normalize-cards` branch.

## 1. Create Collection

- Go to **Appwrite Console > Database > [your database]**
- Click **Create Collection**
- Name: `cards`
- Collection ID: `cards`

## 2. Add Attributes

| Attribute     | Type     | Size  | Required | Default | Note                     |
| ------------- | -------- | ----- | -------- | ------- | ------------------------ |
| `blockId`     | String   | 36    | Yes      | —       | Stores parent block $id  |
| `canvasId`    | String   | 36    | Yes      | —       | Stores parent canvas $id |
| `name`        | String   | 255   | Yes      | —       |                          |
| `description` | String   | 10000 | No       | `""`    |                          |
| `order`       | Integer  | —     | Yes      | `0`     |                          |
| `createdAt`   | Datetime | —     | Yes      | —       |                          |

_Note: The document's primary identifier is the native `$id` field. We no longer use a custom `id` column._

## 3. Add Indexes

| Index Name         | Type | Attributes          | Order |
| ------------------ | ---- | ------------------- | ----- |
| `idx_canvasId`     | Key  | `canvasId`          | ASC   |
| `idx_blockId`      | Key  | `blockId`           | ASC   |
| `idx_canvas_block` | Key  | `canvasId, blockId` | ASC   |
| `idx_block_order`  | Key  | `blockId, order`    | ASC   |

## 4. Set Permissions

Same as `blocks` collection:

- **Read:** `role:all` (or match your existing pattern)
- **Create/Update/Delete:** Handled via server SDK (API key), no client permissions needed.

## Verification

After creating, confirm with:

```bash
# Should return empty total=0
curl -s "$APPWRITE_ENDPOINT/databases/$DB_ID/collections/cards/documents" \
  -H "X-Appwrite-Project: $PROJECT_ID" \
  -H "X-Appwrite-Key: $API_KEY"
```
