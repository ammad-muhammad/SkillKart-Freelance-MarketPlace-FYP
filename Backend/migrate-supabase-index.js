/**
 * MIGRATION SCRIPT: Fix supabaseId Duplicate Key Error
 * 
 * INSTRUCTIONS:
 * 1. Copy this entire file
 * 2. Create a new file in your Backend folder: migrate-supabase-index.js
 * 3. Paste this code into it
 * 4. Update the MONGODB_URI below (line 20)
 * 5. Run: node migrate-supabase-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config();


// ============================================
// UPDATE THIS WITH YOUR MONGODB CONNECTION
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
// Change 'test' to your actual database name ^^^

async function migrateSupabaseIdIndex() {
  try {
    console.log('🔄 Starting migration...');
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    
    console.log('✅ Connected successfully!\n');
    
    // Step 1: Check existing indexes
    console.log('📋 Checking existing indexes...');
    const existingIndexes = await usersCollection.indexes();
    const supabaseIndex = existingIndexes.find(idx => idx.name === 'supabaseId_1');
    
    if (supabaseIndex) {
      console.log('Found existing supabaseId_1 index:', JSON.stringify(supabaseIndex, null, 2));
    } else {
      console.log('⚠️  No existing supabaseId_1 index found');
    }
    
    // Step 2: Drop the old unique supabaseId index if it exists
    try {
      console.log('\n🗑️  Dropping old supabaseId_1 index...');
      await usersCollection.dropIndex('supabaseId_1');
      console.log('✅ Old index dropped successfully');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  Index supabaseId_1 does not exist (skipping drop)');
      } else {
        throw error;
      }
    }
    
    // Step 3: Create new partial unique index
    console.log('\n🔨 Creating new partial unique index on supabaseId...');
    await usersCollection.createIndex(
      { supabaseId: 1 },
      { 
        unique: true,
        partialFilterExpression: { supabaseId: { $type: 'string' } },
        name: 'supabaseId_1'
      }
    );
    console.log('✅ New partial unique index created successfully');
    
    // Step 4: Verify new indexes
    console.log('\n🔍 Verifying new index...');
    const newIndexes = await usersCollection.indexes();
    const newSupabaseIndex = newIndexes.find(idx => idx.name === 'supabaseId_1');
    console.log('New supabaseId_1 index:', JSON.stringify(newSupabaseIndex, null, 2));
    
    // Step 5: Count users by supabaseId status
    const totalUsers = await usersCollection.countDocuments();
    const usersWithSupabaseId = await usersCollection.countDocuments({ 
      supabaseId: { $ne: null, $exists: true } 
    });
    const usersWithoutSupabaseId = await usersCollection.countDocuments({ 
      $or: [{ supabaseId: null }, { supabaseId: { $exists: false } }]
    });
    
    console.log('\n📊 User Statistics:');
    console.log(`  Total users: ${totalUsers}`);
    console.log(`  Users with supabaseId: ${usersWithSupabaseId}`);
    console.log(`  Users without supabaseId (email auth): ${usersWithoutSupabaseId}`);
    
    console.log('\n✅ ============================================');
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('✅ ============================================\n');
    
    console.log('📝 Next steps:');
    console.log('1. Update your User.model.js file (use the fixed version provided)');
    console.log('2. Restart your Node.js application');
    console.log('3. Test user registration\n');
    
  } catch (error) {
    console.error('\n❌ ============================================');
    console.error('❌ MIGRATION FAILED');
    console.error('❌ ============================================');
    console.error('\nError details:', error);
    console.error('\n💡 Common solutions:');
    console.error('   - Check your MongoDB connection string');
    console.error('   - Ensure MongoDB is running');
    console.error('   - Verify database name is correct\n');
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.\n');
  }
}

// Run the migration
console.log('\n╔════════════════════════════════════════════╗');
console.log('║   MongoDB Index Migration Tool            ║');
console.log('║   Fix: supabaseId Duplicate Key Error     ║');
console.log('╚════════════════════════════════════════════╝\n');

migrateSupabaseIdIndex()
  .then(() => {
    console.log('🎉 All done! You can now start your application.\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed. Please check the error above.\n');
    process.exit(1);
  });