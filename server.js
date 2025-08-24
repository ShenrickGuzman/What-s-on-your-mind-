const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
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

// Database setup - Updated for Render
const dbPath = process.env.NODE_ENV === 'production' 
    ? '/tmp/messages.db'  // Use /tmp directory on Render
    : './messages.db';

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        createTables();
    }
});

function createTables() {
    // Messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        name TEXT,
        mood TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating messages table:', err.message);
        } else {
            console.log('Messages table ready');
        }
    });

    // Admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating admin_users table:', err.message);
        } else {
            console.log('Admin users table ready');
            // Create default admin user if none exists
            createDefaultAdmin();
        }
    });
}

function createDefaultAdmin() {
    const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123'; // Change this in production!
    
    db.get('SELECT * FROM admin_users WHERE username = ?', [defaultUsername], (err, row) => {
        if (err) {
            console.error('Error checking admin user:', err.message);
        } else if (!row) {
            bcrypt.hash(defaultPassword, 10, (err, hash) => {
                if (err) {
                    console.error('Error hashing password:', err.message);
                } else {
                    db.run('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', 
                        [defaultUsername, hash], (err) => {
                        if (err) {
                            console.error('Error creating default admin:', err.message);
                        } else {
                            console.log(`Default admin user created - Username: ${defaultUsername}, Password: ${defaultPassword}`);
                            console.log('⚠️  IMPORTANT: Change these credentials in production!');
                        }
                    });
                }
            });
        }
    });
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
    
    const sql = 'INSERT INTO messages (message, name, mood) VALUES (?, ?, ?)';
    db.run(sql, [message, name || 'Anonymous', mood], function(err) {
        if (err) {
            console.error('Error storing message:', err.message);
            res.status(500).json({ error: 'Failed to store message' });
        } else {
            res.json({ 
                success: true, 
                messageId: this.lastID,
                message: 'Message stored successfully' 
            });
        }
    });
});

// Get all messages (admin only)
app.get('/api/messages', requireAuth, (req, res) => {
    console.log('Messages endpoint accessed by user:', req.session.userId);
    console.log('Session authenticated:', req.session.authenticated);
    
    const sql = 'SELECT * FROM messages ORDER BY timestamp DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching messages:', err.message);
            res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
        } else {
            console.log(`Successfully fetched ${rows.length} messages`);
            res.json(rows);
        }
    });
});

// Delete a message (admin only)
app.delete('/api/messages/:id', requireAuth, (req, res) => {
    const messageId = req.params.id;
    
    if (!messageId || isNaN(messageId)) {
        return res.status(400).json({ error: 'Invalid message ID' });
    }
    
    const sql = 'DELETE FROM messages WHERE id = ?';
    db.run(sql, [messageId], function(err) {
        if (err) {
            console.error('Error deleting message:', err.message);
            res.status(500).json({ error: 'Failed to delete message' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Message not found' });
        } else {
            console.log(`Message ${messageId} deleted successfully`);
            res.json({ 
                success: true, 
                message: 'Message deleted successfully',
                deletedId: messageId
            });
        }
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
    
    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Database error during login:', err.message);
            res.status(500).json({ error: 'Login failed - database error' });
        } else if (!user) {
            console.log('Login failed: User not found:', username);
            res.status(401).json({ error: 'Invalid credentials' });
        } else {
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
        }
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

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Admin panel available at: http://localhost:${PORT}/admin`);
    console.log(`Default admin credentials: admin / admin123`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
