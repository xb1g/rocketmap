import { Client, Account, Databases } from 'appwrite';

// Client-side SDK (browser)
export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);

// Server-side SDK (Node.js) - only for server components/routes
export const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const serverAccount = new Account(serverClient);
export const serverDatabases = new Databases(serverClient);

// Constants for database
export const DATABASE_ID = 'rocketmap_production';
export const USERS_COLLECTION_ID = 'users';
export const CANVASES_COLLECTION_ID = 'canvases';
