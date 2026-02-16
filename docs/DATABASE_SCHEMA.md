# RocketMap Database Schema (Finalized)

This document reflects the high-performance relationship-driven schema for RocketMap. All tables now use formal Appwrite Relationships with Cascade Deletes.

## Core Design Principles

1. **No Manual Joins**: Use Appwrite's nested document fetching.
2. **Referential Integrity**: All child data (Blocks, Segments, Messages) is automatically deleted if the parent Canvas is deleted.
3. **String IDs Only**: Standard Appwrite internal IDs ($id) are used for all links. Custom integer ID columns have been removed.

## Collections

### 1. `users`

Stores user profile information.

- **$id**: String (Primary Key)
- **email**: String (Email format, Required)
- **name**: Text
- **onboardingCompleted**: Boolean (Default: false)
- **canvases**: Relationship (Many-to-One with `canvases`, Restrict)
- **messages**: Relationship (Many-to-One with `messages`, Two-Way)

### 2. `canvases`

The root container for a Business Model Canvas or Lean Canvas.

- **$id**: String (Primary Key)
- **slug**: String (Required, Indexed) - _Used for URL routing_
- **title**: String
- **description**: String
- **isPublic**: Boolean
- **createdAt**: DateTime
- **updatedAt**: DateTime
- **users**: Relationship (Many-to-One with `users`, Restrict)
- **blocks**: Relationship (One-to-Many with `blocks`, Cascade Delete)
- **segments**: Relationship (One-to-Many with `segments`, Cascade Delete)
- **messages**: Relationship (One-to-Many with `messages`, Cascade Delete)

### 3. `blocks`

- **$id**: String
- **blockType**: Enum (customer_segments, value_prop, etc.) (Indexed)
- **contentJson**: LongText (BMC/Lean textual content)
- **aiAnalysisJson**: String
- **deepDiveJson**: LongText (Layer 2 research data)
- **confidenceScore**: Double
- **riskScore**: Double
- **canvas**: Relationship (Many-to-One with `canvases`, Two-Way)
- **segments**: Relationship (Many-to-Many with `segments`, Two-Way)
- **assumptions**: Relationship (Many-to-Many with `assumptions`, Two-Way)

### 4. `segments`

- **$id**: String
- **name**: String (Required)
- **description**: String
- **earlyAdopterFlag**: Boolean
- **priorityScore**: Integer (0-100)
- **colorHex**: VarChar(7)
- **demographics**: VarChar(500)
- **psychographics**: VarChar(500)
- **behavioral**: VarChar(500)
- **geographic**: VarChar(500)
- **estimatedSize**: VarChar(100)
- **canvas**: Relationship (Many-to-One with `canvases`, Two-Way)
- **blocks**: Relationship (Many-to-Many with `blocks`, Two-Way)

### 5. `assumptions`

- **$id**: String
- **assumptionText**: String (Required)
- **category**: Enum (market, product, ops, legal) (Indexed)
- **status**: Enum (untested, testing, validated, invalid) (Indexed)
- **severityScore**: Double (0-10)
- **blocks**: Relationship (Many-to-Many with `blocks`, Two-Way)

### 6. `messages`

- **$id**: String
- **chatKey**: String (Required) - _Groups messages into a specific conversation thread_
- **role**: String (user/assistant)
- **content**: LongText
- **messageId**: String (External AI ID reference)
- **createdAt**: String (ISO timestamp)
- **user**: Relationship (Many-to-One with `users`, Two-Way)
- **canvas**: Relationship (Many-to-One with `canvases`, Two-Way)
