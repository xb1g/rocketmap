import { Client, Account, TablesDB } from "appwrite";
import {
  Client as ServerClient,
  Account as ServerAccount,
  Databases as ServerDatabases,
  TablesDB as ServerTablesDB,
  Users as ServerUsers,
} from "node-appwrite";

// Client-side SDK (browser)
export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);

// Server-side SDK (Node.js) - only for server components/routes
export const serverClient = new ServerClient()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const serverAccount = new ServerAccount(serverClient);
export const serverDatabases = new ServerDatabases(serverClient);
export const serverTablesDB = new ServerTablesDB(serverClient);
export const serverUsers = new ServerUsers(serverClient);

// Constants for database
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const USERS_TABLE_ID = "users";
export const CANVASES_TABLE_ID = "canvases";
export const BLOCKS_TABLE_ID = "blocks";
export const MESSAGES_TABLE_ID = "messages";
export const SEGMENTS_TABLE_ID = "segments";
export const BLOCK_SEGMENTS_TABLE_ID = "block_segments";

// Backward-compatible aliases (legacy "collection" naming)
export const USERS_COLLECTION_ID = USERS_TABLE_ID;
export const CANVASES_COLLECTION_ID = CANVASES_TABLE_ID;
export const BLOCKS_COLLECTION_ID = BLOCKS_TABLE_ID;
export const MESSAGES_COLLECTION_ID = MESSAGES_TABLE_ID;
export const SEGMENTS_COLLECTION_ID = SEGMENTS_TABLE_ID;
export const BLOCK_SEGMENTS_COLLECTION_ID = BLOCK_SEGMENTS_TABLE_ID;
