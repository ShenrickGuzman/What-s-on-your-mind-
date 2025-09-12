// add-verified-gmails.js
// Usage: node add-verified-gmails.js
// Edit the gmails array below with the gmails you want to allow

const { Pool } = require('pg');

// Use your actual connection string here
const pool = new Pool({
  connectionString: 'postgresql://whats_on_your_mind_user:egXUpK8PVdAQFGr6cs6M0DKbsIE2Gevo@dpg-d2tb5f15pdvs739cvcf0-a/whats_on_your_mind'
});

const gmails = [
  'guzmanshenrick@gmail.com',
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
