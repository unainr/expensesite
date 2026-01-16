import { Client, Account, Databases } from "appwrite";

export const client = new Client();

const endpoint =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (projectId) {
  client.setEndpoint(endpoint).setProject(projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);

// No storage export needed if we aren't using images
// export const storage = new Storage(client);

export const APPWRITE_CONFIG = {
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "ExpenseDB",
  collectionId: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID || "Expenses",
};
