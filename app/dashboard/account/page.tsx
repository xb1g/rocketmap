import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/appwrite-server";
import {
  serverTablesDB,
  DATABASE_ID,
  CANVASES_TABLE_ID,
  BLOCKS_TABLE_ID,
} from "@/lib/appwrite";
import { Query } from "node-appwrite";
import { AccountClient } from "./AccountClient";
import { listCanvasesByOwner } from "@/lib/utils";

export default async function AccountPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/?error=unauthorized");
  }

  let canvasCount = 0;
  let totalBlocksFilled = 0;

  // Index required: canvases.user (key)
  // Index required: blocks.canvasId (key)
  try {
    const canvasesResult = await listCanvasesByOwner(user.$id, [
      Query.select(["$id"]),
      Query.limit(100),
    ]);
    canvasCount = canvasesResult.total;

    for (const canvas of canvasesResult.rows) {
      try {
        const blocksResult = await serverTablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: BLOCKS_TABLE_ID,
          queries: [
            Query.equal("canvasId", canvas.$id),
            Query.select(["$id", "contentJson"]),
            Query.limit(9),
          ],
        });
        totalBlocksFilled += blocksResult.rows.filter((block) => {
          const content = block.contentJson as string;
          if (!content) return false;
          try {
            const parsed = JSON.parse(content);
            return (
              (parsed.bmc && parsed.bmc.trim() !== "") ||
              (parsed.lean && parsed.lean.trim() !== "")
            );
          } catch {
            return content.trim() !== "";
          }
        }).length;
      } catch {
        // skip
      }
    }
  } catch {
    // Collections might not exist
  }

  const daysActive = Math.max(
    1,
    Math.floor((Date.now() - new Date(user.$createdAt).getTime()) / 86400000),
  );

  return (
    <AccountClient
      user={{
        name: user.name || "",
        email: user.email,
        joinDate: user.$createdAt,
      }}
      stats={{
        canvasCount,
        totalBlocksFilled,
        daysActive,
      }}
    />
  );
}
