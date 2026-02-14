import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { requireAuth } from "@/lib/appwrite-server";
import { generateSlug } from "@/lib/utils";
import {
  serverDatabases,
  DATABASE_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
} from "@/lib/appwrite";

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const body = await request.json();

    const canvas = await serverDatabases.getDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
    );

    if (canvas.ownerId !== user.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.title === "string") updates.title = body.title;
    if (typeof body.description === "string")
      updates.description = body.description;
    if (typeof body.isPublic === "boolean") updates.isPublic = body.isPublic;

    // If title changed, regenerate slug
    if (typeof body.title === "string" && body.title !== canvas.title) {
      const newSlug = await generateSlug(body.title, user.$id);
      updates.slug = newSlug;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    await serverDatabases.updateDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
      updates,
    );

    // Return updated canvas data
    const updatedCanvas = await serverDatabases.getDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
    );

    return NextResponse.json({ success: true, canvas: updatedCanvas });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Canvas update error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;

    const canvas = await serverDatabases.getDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
    );

    if (canvas.ownerId !== user.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete all blocks first
    const canvasIntId = canvas.id as number;
    const blocks = await serverDatabases.listDocuments(
      DATABASE_ID,
      BLOCKS_COLLECTION_ID,
      [Query.equal("canvasId", canvasIntId), Query.limit(25)],
    );

    for (const block of blocks.documents) {
      await serverDatabases.deleteDocument(
        DATABASE_ID,
        BLOCKS_COLLECTION_ID,
        block.$id,
      );
    }

    // Delete canvas
    await serverDatabases.deleteDocument(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      canvasId,
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Canvas delete error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
