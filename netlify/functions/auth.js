const crypto = require('crypto');
const { query } = require('./db');

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Hash password
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

exports.handler = async (event, context) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
    }

    try {
        const { action, username, password } = JSON.parse(event.body);

        if (action === 'register') {
            // Register new user
            const passwordHash = hashPassword(password);
            
            try {
                const result = await query(
                    `INSERT INTO users (username, password_hash)
                     VALUES ($1, $2)
                     RETURNING id, username, created_at`,
                    [username, passwordHash]
                );

                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'User registered successfully',
                        user: result.rows[0]
                    })
                };
            } catch (error) {
                if (error.code === '23505') { // Unique constraint violation
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({ error: 'Username already exists' })
                    };
                }
                throw error;
            }
        } 
        else if (action === 'login') {
            // Login user
            const passwordHash = hashPassword(password);
            
            const result = await query(
                `SELECT id, username, created_at FROM users 
                 WHERE username = $1 AND password_hash = $2`,
                [username, passwordHash]
            );

            if (result.rows.length === 0) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid username or password' })
                };
            }

            const user = result.rows[0];
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    user: user
                })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
        };
    } catch (error) {
        console.error('Auth error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};
