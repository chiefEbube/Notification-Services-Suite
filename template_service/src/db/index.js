const { Pool } = require('pg');
const config = require('../../config/config');

const pool = new Pool({
    connectionString: config.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

const query = (text, params) => pool.query(text, params);

module.exports = {
    query,
    pool, // Export pool for direct access if needed (e.g., for transactions)
};
