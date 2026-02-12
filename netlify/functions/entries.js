const { query } = require('./db');

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'OK' })
        };
    }

    try {
        const method = event.httpMethod;
        const path = event.path;
        const body = event.body ? JSON.parse(event.body) : null;
        
        // Extract user ID from Authorization header or request
        const userId = body?.user_id || 1; // Default to user_id 1 for now

        if (method === 'POST') {
            // Save or update wellness entry
            const { date, mood, sleep, stress, journal, activities } = body;
            
            const result = await query(
                `INSERT INTO wellness_entries (user_id, date, mood, sleep, stress, journal, activities)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (user_id, date) 
                 DO UPDATE SET mood=$3, sleep=$4, stress=$5, journal=$6, activities=$7, updated_at=CURRENT_TIMESTAMP
                 RETURNING *`,
                [userId, date, mood, sleep, stress, journal, activities ? JSON.stringify(activities) : null]
            );

            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(result.rows[0])
            };
        } 
        else if (method === 'GET') {
            // Get all entries for user
            const result = await query(
                `SELECT id, user_id, date, mood, sleep, stress, journal, 
                        COALESCE(activities, '{}') as activities, created_at, updated_at
                 FROM wellness_entries 
                 WHERE user_id = $1 
                 ORDER BY date DESC`,
                [userId]
            );

            const formattedEntries = result.rows.map(row => ({
                ...row,
                activities: typeof row.activities === 'string' ? JSON.parse(row.activities) : row.activities
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(formattedEntries)
            };
        }
        else if (method === 'DELETE') {
            // Delete entry
            const { date } = body;
            
            await query(
                `DELETE FROM wellness_entries WHERE user_id = $1 AND date = $2`,
                [userId, date]
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Entry deleted successfully' })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid request method' })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
