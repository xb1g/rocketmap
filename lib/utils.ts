import { serverTablesDB, DATABASE_ID, CANVASES_TABLE_ID } from './appwrite';
import { Query } from 'node-appwrite';
import type { CanvasData } from './types/canvas';

/**
 * Extract user ID from Appwrite relationship field
 * Handles both string ID and nested object formats
 */
export function getUserIdFromCanvas(canvas: CanvasData): string {
  if (typeof canvas.users === 'string') {
    return canvas.users;
  }
  return canvas.users.$id;
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

  // Index required: canvases collection — composite [users, slug] index
  while (true) {
    try {
      const existing = await serverTablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: CANVASES_TABLE_ID,
        queries: [
          Query.equal('users', userId),
          Query.equal('slug', finalSlug),
          Query.select(['$id']),
          Query.limit(1),
        ],
      });

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
