import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/appwrite-server";
import {
  serverTablesDB,
  DATABASE_ID,
  USERS_TABLE_ID,
  CANVASES_TABLE_ID,
  BLOCKS_TABLE_ID,
} from "@/lib/appwrite";
import { Query } from "node-appwrite";
import { DashboardClient } from "./DashboardClient";
import { getAnthropicUsageStatsFromUser } from "@/lib/ai/user-preferences";

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/?error=unauthorized");
  }

  // Fetch or create user document
  let userDoc;
  try {
    userDoc = await serverTablesDB.getRow({
      databaseId: DATABASE_ID,
      tableId: USERS_TABLE_ID,
      rowId: user.$id,
    });
  } catch {
    try {
      // Use the Appwrite Auth user ID as the row ID for easy lookups
      userDoc = await serverTablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: USERS_TABLE_ID,
        rowId: user.$id,
        data: {
          email: user.email,
          name: user.name || "",
          onboardingCompleted: false,
        },
      });
    } catch (error) {
      console.error("Error creating user document:", error);
      userDoc = { onboardingCompleted: false };
    }
  }

  // Fetch user's canvases with block counts
  // Index required: canvases.users + $updatedAt (composite, desc)
  // Index required: blocks.canvasId (key)
  let canvases: {
    $id: string;
    title: string;
    slug: string;
    $updatedAt: string;
    isPublic: boolean;
    blocksCount: number;
  }[] = [];
  try {
    const canvasesResult = await serverTablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: CANVASES_TABLE_ID,
      queries: [
        Query.equal("users", user.$id),
        Query.orderDesc("$updatedAt"),
        Query.select(["$id", "title", "slug", "$updatedAt", "isPublic"]),
        Query.limit(25),
      ],
    });

    canvases = await Promise.all(
      canvasesResult.rows.map(async (doc) => {
        let blocksCount = 0;
        try {
          const blocksResult = await serverTablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: BLOCKS_TABLE_ID,
            queries: [
              Query.equal("canvasId", doc.$id),
              Query.select(["$id", "contentJson"]),
              Query.limit(9),
            ],
          });
          blocksCount = blocksResult.rows.filter((block) => {
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
          // Blocks collection might not exist
        }
        return {
          $id: doc.$id,
          title: doc.title as string,
          slug: doc.slug as string,
          $updatedAt: doc.$updatedAt,
          isPublic: doc.isPublic ?? false,
          blocksCount,
        };
      }),
    );
  } catch (error) {
    console.error("Error fetching canvases:", error);
  }

  const totalCanvases = canvases.length;
  const lastUpdated = canvases.length > 0 ? canvases[0].$updatedAt : null;
  const aiUsage = getAnthropicUsageStatsFromUser(user);
  const avgCompletion =
    totalCanvases > 0
      ? Math.round(
          canvases.reduce((sum, c) => sum + (c.blocksCount / 9) * 100, 0) /
            totalCanvases,
        )
      : 0;

  return (
    <DashboardClient
      user={{
        $id: user.$id,
        email: user.email,
        name: user.name || "",
      }}
      onboardingCompleted={userDoc.onboardingCompleted || false}
      canvases={canvases}
      stats={{
        totalCanvases,
        lastUpdated,
        avgCompletion,
        aiApiCalls: aiUsage.calls,
      }}
    />
  );
}
