import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/appwrite-server";
import {
  getAnthropicKeyStatusForUser,
  removeAnthropicApiKeyForUser,
  saveAnthropicApiKeyForUser,
} from "@/lib/ai/user-preferences";

export async function GET() {
  try {
    const user = await requireAuth();
    const status = await getAnthropicKeyStatusForUser(user.$id);
    return NextResponse.json(status);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAuth();
    const body = (await request.json()) as { apiKey?: unknown };
    const apiKey = typeof body.apiKey === "string" ? body.apiKey : "";

    if (!apiKey.trim()) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 },
      );
    }

    const { maskedKey } = await saveAnthropicApiKeyForUser(user.$id, apiKey);
    return NextResponse.json({ hasKey: true, maskedKey });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const status =
      message === "Unauthorized" ? 401 : message === "Invalid Anthropic API key" ? 400 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  try {
    const user = await requireAuth();
    await removeAnthropicApiKeyForUser(user.$id);
    return NextResponse.json({ hasKey: false, maskedKey: null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 },
    );
  }
}
