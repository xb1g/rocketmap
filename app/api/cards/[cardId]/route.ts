import { NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { requireAuth } from '@/lib/appwrite-server';
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  CARDS_COLLECTION_ID,
} from '@/lib/appwrite';

interface RouteContext {
  params: Promise<{ cardId: string }>;
}

/** Fetch card doc by its stable `id` field, verify canvas ownership */
async function getCardAndVerifyOwner(cardId: string, userId: string) {
  const result = await serverDatabases.listDocuments(
    DATABASE_ID,
    CARDS_COLLECTION_ID,
    [Query.equal('id', cardId), Query.limit(1)],
  );

  if (result.documents.length === 0) {
    throw new Error('Card not found');
  }

  const card = result.documents[0];
  const canvasIntId = card.canvasId as number;

  // Verify the user owns this canvas
  const canvasResult = await serverDatabases.listDocuments(
    DATABASE_ID,
    CANVASES_COLLECTION_ID,
    [Query.equal('id', canvasIntId), Query.limit(1)],
  );

  if (canvasResult.documents.length === 0 || canvasResult.documents[0].ownerId !== userId) {
    throw new Error('Forbidden');
  }

  return card;
}

/** PATCH /api/cards/[cardId] — update a card's name, description, or order */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { cardId } = await context.params;
    const card = await getCardAndVerifyOwner(cardId, user.$id);
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') updates.name = body.name.trim();
    if (typeof body.description === 'string') updates.description = body.description.trim();
    if (typeof body.order === 'number') updates.order = body.order;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await serverDatabases.updateDocument(
      DATABASE_ID,
      CARDS_COLLECTION_ID,
      card.$id,
      updates,
    );

    return NextResponse.json({ card: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    if (message === 'Card not found') return NextResponse.json({ error: message }, { status: 404 });
    console.error('Update card error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/cards/[cardId] — delete a card */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { cardId } = await context.params;
    const card = await getCardAndVerifyOwner(cardId, user.$id);

    await serverDatabases.deleteDocument(
      DATABASE_ID,
      CARDS_COLLECTION_ID,
      card.$id,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Unauthorized') return NextResponse.json({ error: message }, { status: 401 });
    if (message === 'Forbidden') return NextResponse.json({ error: message }, { status: 403 });
    if (message === 'Card not found') return NextResponse.json({ error: message }, { status: 404 });
    console.error('Delete card error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
