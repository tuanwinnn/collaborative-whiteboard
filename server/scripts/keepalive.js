// Run by .github/workflows/keepalive.yml on a schedule to stop MongoDB
// Atlas from auto-pausing the cluster due to inactivity. Must perform a
// real read against a real collection -- opening a connection alone does
// not count as activity to Atlas.
//
// require('dotenv').config() is a no-op in CI (the workflow sets
// MONGODB_URI directly), but lets this be run locally against server/.env
// for testing: `cd server && node scripts/keepalive.js`.
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('whiteboard');
    const user = await db.collection('users').findOne({});
    console.log(
      user
        ? 'Keepalive read succeeded (found a user doc).'
        : 'Keepalive read succeeded (users collection is empty).'
    );
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Keepalive ping failed:', err.message);
  process.exit(1);
});
