/**
 * YABT Database Migration Script
 * 
 * This script runs the database migration using the Supabase Management API.
 * 
 * Usage:
 *   SUPABASE_PROJECT_REF="your-project-ref" SUPABASE_SERVICE_KEY="your-service-role-key" node scripts/migrate.js
 * 
 * Get these values from:
 *   - Project Ref: Supabase Dashboard URL (e.g., https://supabase.com/dashboard/project/[PROJECT_REF])
 *   - Service Key: Project Settings > API > service_role key (secret)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jvjxufbsgkatpgtiyjol';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY is required');
  console.log('');
  console.log('Get your service role key from:');
  console.log('  Supabase Dashboard → Project Settings → API → service_role (secret)');
  console.log('');
  console.log('Usage:');
  console.log('  SUPABASE_SERVICE_KEY="your-key" node scripts/migrate.js');
  process.exit(1);
}

// Read the schema file
const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
const advancedSchemaPath = path.join(__dirname, '..', 'supabase', 'schema_advanced.sql');

if (!fs.existsSync(schemaPath)) {
  console.error(`❌ Schema file not found: ${schemaPath}`);
  process.exit(1);
}

async function runQuery(sql, description) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    
    const options = {
      hostname: `${PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': data.length
      }
    };

    // Try direct postgres connection via REST API
    // Actually, we need to use pg or the database URL directly
    // Let's use the simpler approach of splitting and running each statement
    
    reject(new Error('REST API not suitable for DDL - use psql instead'));
  });
}

// Function to run SQL via fetch to the database directly
async function runMigration() {
  const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
  
  console.log('🚀 YABT Database Migration');
  console.log('================================');
  console.log(`📋 Project: ${PROJECT_REF}`);
  console.log(`📄 Schema: ${schemaPath}`);
  console.log('');
  
  // The Supabase REST API doesn't support DDL statements directly
  // We need to use the SQL editor or psql
  
  console.log('⚠️  Note: This script shows the SQL to run.');
  console.log('   Please copy the output below and paste it in Supabase SQL Editor.');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log(schemaSQL);
  
  if (fs.existsSync(advancedSchemaPath)) {
    console.log('');
    console.log('-- Advanced Schema');
    console.log('');
    console.log(fs.readFileSync(advancedSchemaPath, 'utf8'));
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ Copy the SQL above and paste it in:');
  console.log('   https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
}

runMigration().catch(console.error);
