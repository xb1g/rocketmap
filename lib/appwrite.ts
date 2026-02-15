import { Client, Account, Databases } from "appwrite";
import {
  Client as ServerClient,
  Account as ServerAccount,
  Databases as ServerDatabases,
  Users as ServerUsers,
} from "node-appwrite";

// Client-side SDK (browser)
export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);

// Server-side SDK (Node.js) - only for server components/routes
export const serverClient = new ServerClient()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const serverAccount = new ServerAccount(serverClient);
export const serverDatabases = new ServerDatabases(serverClient);
export const serverUsers = new ServerUsers(serverClient);

// Constants for database
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const USERS_COLLECTION_ID = "users";
export const CANVASES_COLLECTION_ID = "canvases";
export const BLOCKS_COLLECTION_ID = "blocks";
export const MESSAGES_COLLECTION_ID = "messages";
export const SEGMENTS_COLLECTION_ID = "segments";
export const BLOCK_SEGMENTS_COLLECTION_ID = "block_segments";
