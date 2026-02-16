# Global ID Normalization Goals

This document outlines the specific database schema transformations required to move from legacy numeric `id` fields to Appwrite-native `$id` strings and normalized foreign key relationships.

## Core Principles

1.  **Drop redundant `id` columns:** Every table currently has a legacy `id` (Integer/Timestamp) and an Appwrite `$id` (String). We will use only `$id`.
2.  **String Foreign Keys:** All relationship columns (e.g., `canvasId`, `blockId`) must be converted from `Integer` to `String` to store the `$id` of the referenced document.
3.  **No Code Changes (Phase 1):** Focus on the schema and data migration first.

---

## 1. `canvases` Collection

| Attribute | Current Type | Target Status | Note                           |
| :-------- | :----------- | :------------ | :----------------------------- |
| `id`      | Integer      | **REMOVED**   | Redundant with `$id`           |
| `ownerId` | String       | Fixed         | Already a String ($id of user) |

## 2. `blocks` Collection

| Attribute  | Current Type | Target Status | Note                  |
| :--------- | :----------- | :------------ | :-------------------- |
| `id`       | Integer      | **REMOVED**   | Redundant with `$id`  |
| `canvasId` | Integer      | **STRING**    | Store `$id` of canvas |

## 3. `segments` Collection

| Attribute  | Current Type | Target Status | Note                  |
| :--------- | :----------- | :------------ | :-------------------- |
| `id`       | Integer      | **REMOVED**   | Redundant with `$id`  |
| `canvasId` | Integer      | **STRING**    | Store `$id` of canvas |

## 4. `block_segments` Collection

| Attribute   | Current Type | Target Status | Note                                 |
| :---------- | :----------- | :------------ | :----------------------------------- |
| `id`        | Integer      | **REMOVED**   | Junction table identity isn't needed |
| `blockId`   | Integer      | **STRING**    | Store `$id` of block                 |
| `segmentId` | Integer      | **STRING**    | Store `$id` of segment               |

## 5. `assumptions` Collection

| Attribute  | Current Type | Target Status | Note                  |
| :--------- | :----------- | :------------ | :-------------------- |
| `id`       | Integer      | **REMOVED**   | Redundant with `$id`  |
| `canvasId` | Integer      | **STRING**    | Store `$id` of canvas |
| `blockId`  | Integer      | **STRING**    | Store `$id` of block  |

## 6. `messages` Collection

| Attribute  | Current Type | Target Status | Note                                          |
| :--------- | :----------- | :------------ | :-------------------------------------------- |
| `userId`   | String       | Verified      | No change needed                              |
| `canvasId` | String (32)  | Verified      | Already a string, ensure length is sufficient |

---

## Migration Steps (Per Table)

1.  **Backup:** Use MCP to export/read current rows.
2.  **Add Temporary Columns:** Create `new_canvasId (String)`, etc.
3.  **Backfill:** Map Integer IDs to `$id` and update rows.
4.  **Delete Legacy Columns:** Remove `id (Int)`, `canvasId (Int)`.
5.  **Rename & Index:** Rename temp columns to official names and recreate necessary indexes.
6.  **Update Types:** Synchronize `lib/types/canvas.ts` (Already partially updated).
