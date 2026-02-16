import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { requireAuth } from "@/lib/appwrite-server";
import { generateSlug, getUserIdFromCanvas } from "@/lib/utils";
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  BLOCKS_TABLE_ID,
} from "@/lib/appwrite";
import type { CanvasData } from "@/lib/types/canvas";

interface RouteContext {
  params: Promise<{ canvasId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { canvasId } = await context.params;
    const body = await request.json();

    // Fetch only fields needed for auth check and title comparison
    const canvas = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: canvasId,
      queries: [Query.select(["$id", "title"])],
    });

    if (getUserIdFromCanvas(canvas as unknown as CanvasData) !== user.$id) {
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

    const updatedCanvas = await serverTablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: canvasId,
      data: updates,
    });

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

    // Fetch only fields needed for auth check and block lookup
    const canvas = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: canvasId,
      queries: [Query.select(["$id", "id"])],
    });

    if (getUserIdFromCanvas(canvas as unknown as CanvasData) !== user.$id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch only block $id values for deletion
    const canvasIntId = canvas.id as number;
    const blocks = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: BLOCKS_TABLE_ID,
      queries: [
        Query.equal("canvasId", canvasIntId),
        Query.select(["$id"]),
        Query.limit(25),
      ],
    });

    // Delete blocks in parallel for faster cleanup
    await Promise.all(
      blocks.rows.map((block: { $id: string }) =>
        serverTablesDB.deleteRow({
          databaseId: DATABASE_ID,
          tableId: BLOCKS_TABLE_ID,
          rowId: block.$id,
        }),
      ),
    );

    // Delete canvas
    await serverTablesDB.deleteRow({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      rowId: canvasId,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Canvas delete error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
