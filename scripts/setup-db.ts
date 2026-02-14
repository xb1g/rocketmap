import { Client, Databases, Permission, Role, IndexType } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const USERS_COLLECTION_ID = 'users';
const CANVASES_COLLECTION_ID = 'canvases';

async function setup() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);

  console.log('Using database:', DATABASE_ID);

  // 1. Create users collection
  try {
    await databases.createCollection({
      databaseId: DATABASE_ID,
      collectionId: USERS_COLLECTION_ID,
      name: 'Users',
      permissions: [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
      ],
    });
    console.log('Created collection: users');

    await databases.createStringAttribute({
      databaseId: DATABASE_ID, collectionId: USERS_COLLECTION_ID,
      key: 'userId', size: 36, required: true,
    });
    await databases.createStringAttribute({
      databaseId: DATABASE_ID, collectionId: USERS_COLLECTION_ID,
      key: 'email', size: 320, required: true,
    });
    await databases.createStringAttribute({
      databaseId: DATABASE_ID, collectionId: USERS_COLLECTION_ID,
      key: 'name', size: 256, required: false, xdefault: '',
    });
    await databases.createBooleanAttribute({
      databaseId: DATABASE_ID, collectionId: USERS_COLLECTION_ID,
      key: 'onboardingCompleted', required: false, xdefault: false,
    });
    console.log('Created users attributes');

    // Wait for attributes to be ready
    await new Promise((r) => setTimeout(r, 2000));

    await databases.createIndex({
      databaseId: DATABASE_ID, collectionId: USERS_COLLECTION_ID,
      key: 'userId_idx', type: IndexType.Key, attributes: ['userId'],
    });
    console.log('Created users index');
  } catch (e: any) {
    if (e.code === 409) {
      console.log('Users collection already exists, skipping...');
    } else {
      throw e;
    }
  }

  // 2. Create canvases collection
  try {
    await databases.createCollection({
      databaseId: DATABASE_ID,
      collectionId: CANVASES_COLLECTION_ID,
      name: 'Canvases',
      permissions: [
        Permission.read(Role.users()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
    });
    console.log('Created collection: canvases');

    await databases.createStringAttribute({
      databaseId: DATABASE_ID, collectionId: CANVASES_COLLECTION_ID,
      key: 'userId', size: 36, required: true,
    });
    await databases.createStringAttribute({
      databaseId: DATABASE_ID, collectionId: CANVASES_COLLECTION_ID,
      key: 'title', size: 256, required: true,
    });
    await databases.createStringAttribute({
      databaseId: DATABASE_ID, collectionId: CANVASES_COLLECTION_ID,
      key: 'slug', size: 256, required: true,
    });
    console.log('Created canvases attributes');

    // Wait for attributes to be ready
    await new Promise((r) => setTimeout(r, 2000));

    await databases.createIndex({
      databaseId: DATABASE_ID, collectionId: CANVASES_COLLECTION_ID,
      key: 'userId_idx', type: IndexType.Key, attributes: ['userId'],
    });
    await databases.createIndex({
      databaseId: DATABASE_ID, collectionId: CANVASES_COLLECTION_ID,
      key: 'slug_idx', type: IndexType.Unique, attributes: ['slug'],
    });
    console.log('Created canvases indexes');
  } catch (e: any) {
    if (e.code === 409) {
      console.log('Canvases collection already exists, skipping...');
    } else {
      throw e;
    }
  }

  console.log('\nDone! Database setup complete.');
}

setup().catch(console.error);
