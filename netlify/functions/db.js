// Database connection utility for NeonDB
const { Pool } = require('pg');

let pool = null;

function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set. Please configure it in Netlify environment variables.');
        }
        
        pool = new Pool({
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }
    return pool;
}

async function query(text, params) {
    const client = await getPool().connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
}

async function initializeDatabase() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await query(`
            CREATE TABLE IF NOT EXISTS wellness_entries (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                mood INTEGER CHECK (mood >= 1 AND mood <= 10),
                sleep DECIMAL(4,2),
                stress INTEGER CHECK (stress >= 1 AND stress <= 4),
                journal TEXT,
                activities TEXT[],
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, date)
            )
        `);

        await query(`
            CREATE INDEX IF NOT EXISTS idx_wellness_entries_user_id ON wellness_entries(user_id)
        `);

        await query(`
            CREATE INDEX IF NOT EXISTS idx_wellness_entries_date ON wellness_entries(date)
        `);

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

module.exports = {
    query,
    getPool,
    initializeDatabase
};
