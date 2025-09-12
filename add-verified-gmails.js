// add-verified-gmails.js
// Usage: node add-verified-gmails.js
// Edit the gmails array below with the gmails you want to allow

const { Pool } = require('pg');

// Use your actual connection string here
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'YOUR_POSTGRES_CONNECTION_STRING'
});

const gmails = [
  'your_verified_email@gmail.com',
  // Add more gmails here
];

async function addVerifiedGmails() {
  for (const gmail of gmails) {
    try {
      await pool.query('INSERT INTO verified_gmails (gmail) VALUES ($1) ON CONFLICT DO NOTHING', [gmail]);
      console.log(`Added: ${gmail}`);
    } catch (err) {
      console.error(`Error adding ${gmail}:`, err.message);
    }
  }
  await pool.end();
  console.log('Done!');
}

addVerifiedGmails();
