import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/appwrite-server";
import {
  serverDatabases,
  DATABASE_ID,
  USERS_COLLECTION_ID,
  CANVASES_COLLECTION_ID,
  BLOCKS_COLLECTION_ID,
} from "@/lib/appwrite";
import { Query } from "node-appwrite";
import { DashboardClient } from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/?error=unauthorized");
  }

  // Fetch or create user document
  let userDoc;
  try {
    userDoc = await serverDatabases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      user.$id,
    );
  } catch {
    try {
      userDoc = await serverDatabases.createDocument(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        user.$id,
        {
          email: user.email,
          name: user.name || "",
          onboardingCompleted: false,
        },
      );
    } catch (error) {
      console.error("Error creating user document:", error);
      userDoc = { onboardingCompleted: false };
    }
  }

  // Fetch user's canvases with block counts
  let canvases: {
    $id: string;
    title: string;
    slug: string;
    $updatedAt: string;
    blocksCount: number;
  }[] = [];
  try {
    const canvasesResult = await serverDatabases.listDocuments(
      DATABASE_ID,
      CANVASES_COLLECTION_ID,
      [Query.equal("ownerId", user.$id), Query.orderDesc("$updatedAt")],
    );

    canvases = await Promise.all(
      canvasesResult.documents.map(async (doc) => {
        let blocksCount = 0;
        try {
          const blocksResult = await serverDatabases.listDocuments(
            DATABASE_ID,
            BLOCKS_COLLECTION_ID,
            [Query.equal("canvasId", doc.id as number), Query.limit(9)],
          );
          blocksCount = blocksResult.documents.filter((block) => {
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
          blocksCount,
        };
      }),
    );
  } catch (error) {
    console.error("Error fetching canvases:", error);
  }

  const totalCanvases = canvases.length;
  const lastUpdated = canvases.length > 0 ? canvases[0].$updatedAt : null;
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
      stats={{ totalCanvases, lastUpdated, avgCompletion }}
    />
  );
}
