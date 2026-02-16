import { serverTablesDB, DATABASE_ID, CANVASES_TABLE_ID } from './appwrite';
import { Query } from 'node-appwrite';
import type { CanvasData } from './types/canvas';

type CanvasForOwner = {
  users?: unknown;
  user?: unknown;
  userId?: unknown;
  owner?: unknown;
  ownerId?: unknown;
};

const CANVAS_OWNER_CANDIDATE_FIELDS = ["user", "users", "userId", "owner", "ownerId"] as const;

type CanvasRowsResponse = Awaited<ReturnType<typeof serverTablesDB.listRows>>;

/**
 * Extract user ID from Appwrite relationship field
 * Handles both string ID and nested object formats
 */
export function getUserIdFromCanvas(canvas: CanvasData): string {
  return getUserIdFromCanvasLike(canvas);
}

export function getUserIdFromCanvasLike(canvas: CanvasForOwner): string {
  const user = extractUserId(canvas.users) ||
    extractUserId(canvas.user) ||
    extractUserId(canvas.userId) ||
    extractUserId(canvas.owner) ||
    extractUserId(canvas.ownerId);

  return user;
}

function extractUserId(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null && '$id' in raw) {
    const id = (raw as { $id?: unknown }).$id;
    return typeof id === 'string' ? id : '';
  }
  return '';
}

function isMissingCanvasOwnerFieldError(error: unknown, field: string): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes(`Attribute not found in schema: ${field}`);
}

export async function listCanvasesByOwner(
  userId: string,
  queries: string[] = [],
): Promise<CanvasRowsResponse> {
  let lastError: unknown;

  for (const field of CANVAS_OWNER_CANDIDATE_FIELDS) {
    try {
      const ownerFilter = Query.equal(field, userId);
      return await serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: CANVASES_TABLE_ID,
        queries: [ownerFilter, ...queries],
      });
    } catch (error: unknown) {
      if (isMissingCanvasOwnerFieldError(error, field)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Unable to locate a valid canvas ownership field");
}

/**
 * Generate URL-friendly slug from canvas title
 * Handles collisions by appending -2, -3, etc.
 */
export async function generateSlug(title: string, userId: string): Promise<string> {
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Default if empty
  if (!slug) {
    slug = 'untitled-canvas';
  }

  // Check for collisions
  let finalSlug = slug;
  let counter = 2;

  // Index required: canvases collection — composite [user, slug] index
  while (true) {
    try {
      const existing = await listCanvasesByOwner(userId, [
        Query.equal('slug', finalSlug),
        Query.select(['$id']),
        Query.limit(1),
      ]);

      if (existing.rows.length === 0) {
        break; // No collision, we're good
      }

      finalSlug = `${slug}-${counter}`;
      counter++;
    } catch {
      // Collection might not exist yet, that's okay
      break;
    }
  }

  return finalSlug;
}

/**
 * Format date for display (e.g., "Feb 13, 2026")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
