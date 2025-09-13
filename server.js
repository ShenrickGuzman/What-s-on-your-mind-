// ...existing code...
// ...existing code...
// Place the signup requests endpoints AFTER app is initialized (after 'const app = express();')
// ...existing code...
// ...existing code...
// ...existing code...
// Delete a user account (admin only)
app.delete('/api/admin/delete-user/:id', requireAuth, async (req, res) => {
    const userId = req.params.id;
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    try {
        // Prevent admin from deleting their own account (optional, for safety)
        if (req.session.user && req.session.user.id == userId) {
            return res.status(400).json({ error: 'You cannot delete your own account from here.' });
        }
        // Check if user exists
        const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        if (rowCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted successfully', deletedId: userId });
    } catch (err) {
        console.error('Error deleting user:', err.message);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
const express = require('express');
const { Pool } = require('pg');

const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5500', 
        'http://127.0.0.1:5500', 
        'http://localhost:3000',
        'https://what-s-on-your-mind.onrender.com',
        process.env.FRONTEND_URL,
        // Allow any origin for admin panel access
        /^https:\/\/.*\.onrender\.com$/,
        /^https:\/\/.*\.vercel\.app$/,
        /^https:\/\/.*\.netlify\.app$/
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Session configuration - Updated for production
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to false for now to fix session issues
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax',
        httpOnly: true
    },
    proxy: false, // Disable proxy trust for now
    name: 'thoughts-website-session'
}));

// Database setup - PostgreSQL
const connectionString = process.env.DATABASE_URL;
const isRequireSsl = (process.env.PGSSLMODE || '').toLowerCase() === 'require';
const pool = new Pool(
    connectionString
        ? {
            connectionString,
            ssl: isRequireSsl ? { rejectUnauthorized: false } : undefined
        }
        : {
            host: process.env.PGHOST || 'localhost',
            port: parseInt(process.env.PGPORT || '5432', 10),
            database: process.env.PGDATABASE || 'thoughts',
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'postgres',
            ssl: isRequireSsl ? { rejectUnauthorized: false } : undefined
        }
);

pool.connect()
    .then((client) => {
        client.release();
        console.log('Connected to PostgreSQL');
        return createTables();
    })
    .catch((err) => {
        console.error('Error connecting to PostgreSQL:', err.message);
        process.exit(1);
    });

async function createTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            message TEXT NOT NULL,
            name TEXT,
            mood TEXT NOT NULL,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            is_pinned BOOLEAN DEFAULT FALSE
        )
    `);
    console.log('Messages table ready');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_owner BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('Admin users table ready');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS public_messages (
            id SERIAL PRIMARY KEY,
            name TEXT,
            mood TEXT,
            message TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
    console.log('Public messages table ready');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            gmail TEXT UNIQUE NOT NULL
        )
    `);
    console.log('Users table ready');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS verified_gmails (
            gmail TEXT PRIMARY KEY
        )
    `);
    console.log('Verified gmails table ready');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL
        )
    `);
    console.log('Password reset tokens table ready');

    await createDefaultAdmin();
}

async function createDefaultAdmin() {
    const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123'; // Change this in production!
    try {
        const { rows } = await pool.query('SELECT id FROM admin_users WHERE username = $1', [defaultUsername]);
        if (rows.length === 0) {
            const hash = await new Promise((resolve, reject) =>
                bcrypt.hash(defaultPassword, 10, (err, h) => (err ? reject(err) : resolve(h)))
            );
            await pool.query('INSERT INTO admin_users (username, password_hash, is_owner) VALUES ($1, $2, $3)', [defaultUsername, hash, true]);
            console.log(`Default owner user created - Username: ${defaultUsername}, Password: ${defaultPassword}`);
            console.log('⚠️  IMPORTANT: Change these credentials in production!');
        }
    } catch (err) {
        console.error('Error ensuring default admin user:', err.message);
    }
}

// Authentication middleware
function requireAuth(req, res, next) {
    console.log('Auth check - Session:', req.session);
    console.log('Auth check - Authenticated:', req.session.authenticated);
    
    if (req.session.authenticated) {
        console.log('User authenticated, proceeding...');
        next();
    } else {
        console.log('User not authenticated, access denied');
        res.status(401).json({ error: 'Authentication required' });
    }
}

// Test route to verify server is working
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Server is working!', 
        timestamp: new Date().toISOString(),
        sessionId: req.sessionID,
        authenticated: !!req.session.authenticated
    });
});

// Routes

// Store a new message
app.post('/api/messages', (req, res) => {
    const { message, name, mood } = req.body;
    
    if (!message || !mood) {
        return res.status(400).json({ error: 'Message and mood are required' });
    }
    
    const sql = 'INSERT INTO messages (message, name, mood) VALUES ($1, $2, $3) RETURNING id';
    pool.query(sql, [message, name || 'Anonymous', mood])
        .then((result) => {
            res.json({ success: true, messageId: result.rows[0].id, message: 'Message stored successfully' });
        })
        .catch((err) => {
            console.error('Error storing message:', err.message);
            res.status(500).json({ error: 'Failed to store message' });
        });
});

// Store a new public message
app.post('/api/public-messages', (req, res) => {
    const { message, name, mood } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }
    const sql = 'INSERT INTO public_messages (message, name, mood) VALUES ($1, $2, $3) RETURNING id';
    pool.query(sql, [message, name || 'Anonymous', mood || ''])
        .then((result) => {
            res.json({ success: true, messageId: result.rows[0].id });
        })
        .catch((err) => {
            console.error('Error storing public message:', err.message);
            res.status(500).json({ error: 'Failed to store public message' });
        });
});

// Get all messages (admin only) - Updated to handle pinned messages
app.get('/api/messages', requireAuth, (req, res) => {
    console.log('Messages endpoint accessed by user:', req.session.userId);
    console.log('Session authenticated:', req.session.authenticated);
    
    const sql = 'SELECT * FROM messages ORDER BY is_pinned DESC, timestamp DESC';
    pool.query(sql)
        .then(({ rows }) => {
            console.log(`Successfully fetched ${rows.length} messages`);
            res.json(rows);
        })
        .catch((err) => {
            console.error('Error fetching messages:', err.message);
            res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
        });
});

// Get all public messages
app.get('/api/public-messages', (req, res) => {
    const sql = 'SELECT * FROM public_messages ORDER BY created_at DESC LIMIT 100';
    pool.query(sql)
        .then(({ rows }) => res.json(rows))
        .catch((err) => {
            console.error('Error fetching public messages:', err.message);
            res.status(500).json({ error: 'Failed to fetch public messages' });
        });
});

// Delete a message (admin only)
app.delete('/api/messages/:id', requireAuth, (req, res) => {
    const messageId = req.params.id;
    
    if (!messageId || isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    const sql = 'DELETE FROM messages WHERE id = $1';
    pool.query(sql, [messageId])
        .then((result) => {
            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Message not found' });
            } else {
                console.log(`Message ${messageId} deleted successfully`);
                res.json({ success: true, message: 'Message deleted successfully', deletedId: messageId });
            }
        })
        .catch((err) => {
            console.error('Error deleting message:', err.message);
            res.status(500).json({ error: 'Failed to delete message' });
        });
});

// Pin/Unpin a message (admin only)
app.put('/api/messages/:id/pin', requireAuth, (req, res) => {
    const messageId = req.params.id;
    const { isPinned } = req.body;
    
    if (!messageId || isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    if (typeof isPinned !== 'boolean') {
        return res.status(400).json({ error: 'isPinned must be a boolean' });
    }
    
    const sql = 'UPDATE messages SET is_pinned = $1 WHERE id = $2';
    pool.query(sql, [isPinned, messageId])
        .then((result) => {
            if (result.rowCount === 0) {
                res.status(404).json({ error: 'Message not found' });
            } else {
                console.log(`Message ${messageId} ${isPinned ? 'pinned' : 'unpinned'} successfully`);
                res.json({ success: true, message: `Message ${isPinned ? 'pinned' : 'unpinned'} successfully`, messageId, isPinned });
            }
        })
        .catch((err) => {
            console.error('Error updating message pin status:', err.message);
            res.status(500).json({ error: 'Failed to update message pin status' });
        });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    console.log('Login attempt received:', { 
        username: req.body.username, 
        hasPassword: !!req.body.password,
        sessionId: req.sessionID 
    });
    
    const { username, password } = req.body;
    
    if (!username || !password) {
        console.log('Login failed: Missing credentials');
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    pool.query('SELECT * FROM admin_users WHERE username = $1', [username])
        .then(({ rows }) => {
            const user = rows[0];
            if (!user) {
                console.log('Login failed: User not found:', username);
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }
            console.log('User found, checking password...');
            bcrypt.compare(password, user.password_hash, (err, isMatch) => {
                if (err) {
                    console.error('Password comparison error:', err.message);
                    res.status(500).json({ error: 'Login failed - password error' });
                } else if (isMatch) {
                    console.log('Password match! Setting session for user:', user.id);
                    req.session.authenticated = true;
                    req.session.userId = user.id;
                    console.log('Session after login:', req.session);
                    res.json({ success: true, message: 'Login successful' });
                } else {
                    console.log('Login failed: Password mismatch for user:', username);
                    res.status(401).json({ error: 'Invalid credentials' });
                }
            });
        })
        .catch((err) => {
            console.error('Database error during login:', err.message);
            res.status(500).json({ error: 'Login failed - database error' });
        });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: 'Logout failed' });
        } else {
            res.json({ success: true, message: 'Logout successful' });
        }
    });
});

// Check authentication status
app.get('/api/admin/status', (req, res) => {
    res.json({ 
        authenticated: !!req.session.authenticated,
        userId: req.session.userId 
    });
});

// Admin registration (super admin only)
app.post('/api/admin/register', requireAuth, (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if current user is super admin
    pool.query('SELECT is_owner FROM admin_users WHERE id = $1', [req.session.userId])
        .then(({ rows }) => {
            const user = rows[0];
            if (!user || !user.is_owner) {
                res.status(403).json({ error: 'Only owners can create new accounts' });
                return null;
            }
            return pool.query('SELECT id FROM admin_users WHERE username = $1', [username]);
        })
        .then((result) => {
            if (!result) return; // response already sent
            if (result.rows.length > 0) {
                res.status(409).json({ error: 'Username already exists' });
                return null;
            }
            return new Promise((resolve, reject) => {
                bcrypt.hash(password, 10, async (err, hash) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    try {
                        await pool.query('INSERT INTO admin_users (username, password_hash, is_owner) VALUES ($1, $2, $3)', [username, hash, false]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        })
        .then(() => {
            res.json({ success: true, message: 'Admin user created successfully', username });
        })
        .catch((err) => {
            if (!res.headersSent) {
                console.error('Error creating admin user:', err.message);
                res.status(500).json({ error: 'Failed to create user' });
            }
        });
});

// Self-registration for admin accounts (no auth required, but with security controls)
app.post('/api/admin/self-register', (req, res) => {
    const { username, password, inviteCode } = req.body;
    
    if (!username || !password || !inviteCode) {
        return res.status(400).json({ error: 'Username, password, and invite code are required' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }
    
    // Check if invite code is valid (you can customize this)
    const validInviteCode = process.env.ADMIN_INVITE_CODE || 'ADMIN2024';
    if (inviteCode !== validInviteCode) {
        return res.status(403).json({ error: 'Invalid invite code' });
    }
    
    // Check if username already exists
    pool.query('SELECT id FROM admin_users WHERE username = $1', [username])
        .then(({ rows }) => {
            if (rows.length > 0) {
                res.status(409).json({ error: 'Username already exists' });
                return null;
            }
            return new Promise((resolve, reject) => {
                bcrypt.hash(password, 10, async (err, hash) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    try {
                        await pool.query('INSERT INTO admin_users (username, password_hash, is_owner) VALUES ($1, $2, $3)', [username, hash, false]);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            });
        })
        .then(() => {
            res.json({ success: true, message: 'Admin account created successfully! You can now login.', username });
        })
        .catch((err) => {
            if (!res.headersSent) {
                console.error('Error during self-registration:', err.message);
                res.status(500).json({ error: 'Failed to create user' });
            }
        });
});

// Get admin users list (super admin only)
app.get('/api/admin/users', requireAuth, (req, res) => {
    pool.query('SELECT id, username, is_owner, created_at FROM admin_users ORDER BY created_at DESC')
        .then((result) => {
            res.json(result.rows);
        })
        .catch((err) => {
            console.error('Error fetching admin users:', err.message);
            res.status(500).json({ error: 'Failed to fetch admin users' });
        });
});

// Delete admin user (super admin only)
app.delete('/api/admin/users/:id', requireAuth, (req, res) => {
    const userId = req.params.id;
    
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if current user is super admin
    db.get('SELECT is_owner FROM admin_users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err) {
            console.error('Error checking user permissions:', err.message);
            res.status(500).json({ error: 'Failed to check permissions' });
        } else if (!user || !user.is_owner) {
            res.status(403).json({ error: 'Only owners can delete users' });
        } else if (parseInt(userId) === req.session.userId) {
            res.status(400).json({ error: 'Cannot delete your own account' });
        } else {
            // Check if target user is super admin
            db.get('SELECT is_owner FROM admin_users WHERE id = ?', [userId], (err, targetUser) => {
                if (err) {
                    console.error('Error checking target user:', err.message);
                    res.status(500).json({ error: 'Failed to check target user' });
                } else if (!targetUser) {
                    res.status(404).json({ error: 'User not found' });
                } else if (targetUser.is_owner) {
                    res.status(403).json({ error: 'Cannot delete owner accounts' });
                } else {
                    // Delete the user
                    db.run('DELETE FROM admin_users WHERE id = ?', [userId], function(err) {
                        if (err) {
                            console.error('Error deleting admin user:', err.message);
                            res.status(500).json({ error: 'Failed to delete user' });
                        } else if (this.changes === 0) {
                            res.status(404).json({ error: 'User not found' });
                        } else {
                            console.log(`Admin user ${userId} deleted successfully`);
                            res.json({ 
                                success: true, 
                                message: 'Admin user deleted successfully',
                                deletedId: userId
                            });
                        }
                    });
                }
            });
        }
    });
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Authentication routes

const bcrypt = require('bcryptjs');

// --- User Auth System ---
const crypto = require('crypto');

// Ensure users, signup_requests, and verified_gmails tables exist
pool.query(`
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    gmail TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS signup_requests (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    gmail TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS verified_gmails (
    gmail TEXT PRIMARY KEY
);
`).catch(console.error);

// Signup endpoint (approval system)
// Forgot password: request reset
app.post('/api/auth/forgot-password', async (req, res) => {
    const { gmail } = req.body;
    if (!gmail) return res.status(400).json({ error: 'Gmail is required' });
    const { rows } = await pool.query('SELECT id FROM users WHERE gmail = $1', [gmail]);
    if (rows.length === 0) return res.status(404).json({ error: 'No user found with that Gmail' });
    const userId = rows[0].id;
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min expiry
    await pool.query('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [userId, token, expiresAt]);
    // Log reset link (simulate email)
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5500'}/auth.html?resetToken=${token}`;
    console.log(`[RESET] Password reset link for user ${gmail}: ${resetLink}`);
    res.json({ success: true, message: 'If your Gmail is registered, a reset link has been sent.' });
});

// Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
    // Find token
    const { rows } = await pool.query('SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()', [token]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid or expired token' });
    const reset = rows[0];
    // Update user password
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, reset.user_id]);
    // Delete all tokens for this user
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [reset.user_id]);
    res.json({ success: true, message: 'Password has been reset. You can now log in.' });
});
app.post('/api/auth/signup', async (req, res) => {
    const { username, password, gmail } = req.body;
    if (!username || !password || !gmail) return res.status(400).json({ error: 'All fields required' });

    // Check if username or gmail already exists in users
    const userExists = await pool.query('SELECT id FROM users WHERE username = $1 OR gmail = $2', [username, gmail]);
    if (userExists.rows.length > 0) return res.status(409).json({ error: 'User or Gmail already exists' });
    // Remove declined requests for this username or gmail
    await pool.query('DELETE FROM signup_requests WHERE (username = $1 OR gmail = $2) AND status = $3', [username, gmail, 'declined']);
    // Check if a pending request exists
    const pendingExists = await pool.query('SELECT id FROM signup_requests WHERE (username = $1 OR gmail = $2) AND status = $3', [username, gmail, 'pending']);
    if (pendingExists.rows.length > 0) return res.status(409).json({ error: 'A sign up request for this username or gmail is already pending approval.' });

    const hash = await bcrypt.hash(password, 10);
    console.log(`[DEBUG] Signup password hash for ${username}:`, hash);
    await pool.query('INSERT INTO signup_requests (username, password_hash, gmail, status) VALUES ($1, $2, $3, $4)', [username, hash, gmail, 'pending']);
    res.json({ success: true, message: 'Sign up request sent, wait for the admin to approve it.' });
});

// Signin endpoint
app.post('/api/auth/signin', async (req, res) => {
    const { username, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.user = { username: user.username, gmail: user.gmail };
    res.json({ success: true });
});

// Auth status
app.get('/api/auth/status', (req, res) => {
    res.json({ authenticated: !!req.session.user });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

// Protect index.html
app.get('/index.html', (req, res, next) => {
    if (!req.session.user) return res.redirect('/auth.html');
    next();
});

// View all pending signup requests (admin only)
// List all users and their Gmail (admin only)
app.get('/api/admin/all-users', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, username, gmail FROM users ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching all users:', err.message);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
app.get('/api/auth/signup-requests', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM signup_requests WHERE status = $1 ORDER BY created_at ASC', ['pending']);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching signup requests:', err.message);
        res.status(500).json({ error: 'Failed to fetch signup requests' });
    }
});

// Approve signup request (admin only)
app.post('/api/auth/signup-requests/:id/approve', requireAuth, async (req, res) => {
    const id = req.params.id;
    try {
        // Get the signup request
        const { rows } = await pool.query('SELECT * FROM signup_requests WHERE id = $1 AND status = $2', [id, 'pending']);
        if (rows.length === 0) return res.status(404).json({ error: 'Signup request not found or already processed' });
        const request = rows[0];
        // Check if username or gmail already exists in users
        const userExists = await pool.query('SELECT id FROM users WHERE username = $1 OR gmail = $2', [request.username, request.gmail]);
        if (userExists.rows.length > 0) {
            // Mark as declined if already exists
            await pool.query('UPDATE signup_requests SET status = $1 WHERE id = $2', ['declined', id]);
            return res.status(409).json({ error: 'User or Gmail already exists. Request declined.' });
        }
        // Debug: print hash being inserted
        console.log(`[DEBUG] Approving signup for ${request.username}, hash:`, request.password_hash);
        // Insert into users
        await pool.query('INSERT INTO users (username, password_hash, gmail) VALUES ($1, $2, $3)', [request.username, request.password_hash, request.gmail]);
        // Mark request as approved
        await pool.query('UPDATE signup_requests SET status = $1 WHERE id = $2', ['approved', id]);
        res.json({ success: true, message: 'Signup request approved and user created.' });
    } catch (err) {
        console.error('Error approving signup request:', err.message);
        res.status(500).json({ error: 'Failed to approve signup request' });
    }
// --- Fix: Remove users with broken hashes (not bcrypt hashes) so they can re-sign up ---
async function cleanBrokenUserHashes() {
    try {
        const { rows } = await pool.query('SELECT id, username, password_hash FROM users');
        for (const user of rows) {
            // bcrypt hashes start with $2
            if (!user.password_hash.startsWith('$2')) {
                console.log(`[CLEANUP] Removing user with broken hash: ${user.username}`);
                await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
            }
        }
    } catch (err) {
        console.error('Error cleaning up broken user hashes:', err.message);
    }
}
cleanBrokenUserHashes();
});

// Decline signup request (admin only)
app.post('/api/auth/signup-requests/:id/decline', requireAuth, async (req, res) => {
    const id = req.params.id;
    try {
        const { rowCount } = await pool.query('UPDATE signup_requests SET status = $1 WHERE id = $2 AND status = $3', ['declined', id, 'pending']);
        if (rowCount === 0) return res.status(404).json({ error: 'Signup request not found or already processed' });
        res.json({ success: true, message: 'Signup request declined.' });
    } catch (err) {
        console.error('Error declining signup request:', err.message);
        res.status(500).json({ error: 'Failed to decline signup request' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin panel available at: http://localhost:${PORT}/admin`);
    console.log(`Default admin credentials: admin / admin123`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        await pool.end();
        console.log('Database connection pool closed');
    } catch (err) {
        console.error('Error closing database pool:', err.message);
    }
    process.exit(0);
});
