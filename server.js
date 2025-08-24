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
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Session configuration
app.use(session({
    secret: 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Database setup
const db = new sqlite3.Database('./messages.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
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
    const defaultUsername = 'admin';
    const defaultPassword = 'admin123'; // Change this in production!
    
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
                            console.log('Default admin user created - Username: admin, Password: admin123');
                        }
                    });
                }
            });
        }
    });
}

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

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
    const sql = 'SELECT * FROM messages ORDER BY timestamp DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching messages:', err.message);
            res.status(500).json({ error: 'Failed to fetch messages' });
        } else {
            res.json(rows);
        }
    });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    db.get('SELECT * FROM admin_users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Error during login:', err.message);
            res.status(500).json({ error: 'Login failed' });
        } else if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
        } else {
            bcrypt.compare(password, user.password_hash, (err, isMatch) => {
                if (err) {
                    console.error('Error comparing passwords:', err.message);
                    res.status(500).json({ error: 'Login failed' });
                } else if (isMatch) {
                    req.session.authenticated = true;
                    req.session.userId = user.id;
                    res.json({ success: true, message: 'Login successful' });
                } else {
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
