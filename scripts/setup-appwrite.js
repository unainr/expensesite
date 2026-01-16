const { Client, Databases, Storage, Permission, Role } = require('node-appwrite');

// USAGE: 
// 1. Create a Project in Appwrite Console
// 2. Create an API Key in Appwrite Console (Scopes: databases.write, collections.write, attributes.write, buckets.write)
// 3. Run: node scripts/setup-appwrite.js <PROJECT_ID> <API_KEY>

async function setup() {
    const projectId = process.argv[2];
    const apiKey = process.argv[3];

    if (!projectId || !apiKey) {
        console.error("Usage: node scripts/setup-appwrite.js <PROJECT_ID> <API_KEY>");
        process.exit(1);
    }

    console.log("🚀 Starting Appwrite Setup...");

    const client = new Client()
        .setEndpoint('https://cloud.appwrite.io/v1')
        .setProject(projectId)
        .setKey(apiKey);

    const databases = new Databases(client);
    const storage = new Storage(client);

    const DB_ID = 'expense-db';
    const COL_ID = 'expenses';
    const BUCKET_ID = 'receipts';

    try {
        // 1. Create Database
        console.log("Creating Database...");
        try {
            await databases.create(DB_ID, 'ExpenseDB');
            console.log("✅ Database created.");
        } catch (e) {
            console.log("ℹ️  Database might already exist, skipping...");
        }

        // 2. Create Collection
        console.log("Creating Collection...");
        try {
            await databases.createCollection(DB_ID, COL_ID, 'Expenses', [
                Permission.read(Role.any()),
                Permission.write(Role.any()), // WARNING: Open permissions for dev
            ]);
            console.log("✅ Collection created.");
        } catch (e) {
            console.log("ℹ️  Collection might already exist, skipping...");
        }

        // 3. Create Attributes
        console.log("Creating Attributes (this may take a moment)...");
        const attributes = [
            databases.createStringAttribute(DB_ID, COL_ID, 'type', 128, true),
            databases.createFloatAttribute(DB_ID, COL_ID, 'weight', true),
            databases.createFloatAttribute(DB_ID, COL_ID, 'rate', true),
            databases.createFloatAttribute(DB_ID, COL_ID, 'total', true),
            databases.createStringAttribute(DB_ID, COL_ID, 'section', 128, true),
            databases.createUrlAttribute(DB_ID, COL_ID, 'imageUrl', false),
        ];

        await Promise.allSettled(attributes);
        console.log("✅ Attributes creation requests sent.");

        // 4. Create Bucket
        console.log("Creating Storage Bucket...");
        try {
            await storage.createBucket(BUCKET_ID, 'Receipts', [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
            ]);
            console.log("✅ Bucket created.");
        } catch (e) {
            console.log("ℹ️  Bucket might already exist.");
        }

        console.log("\n🎉 SETUP COMPLETE!");
        console.log("Now update your src/lib/appwrite.js with your Project ID.");

    } catch (error) {
        console.error("❌ Error Setup Failed:", error.message);
    }
}

setup();
