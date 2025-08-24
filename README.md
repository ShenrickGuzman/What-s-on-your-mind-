# Thoughts Website with Admin Panel 🎭

A fun, cartoony website where users can share their thoughts, and admins can view all messages in a secure dashboard.

## Features ✨

- **User Interface**: Playful, cartoony design with mood-based themes
- **Thought Sharing**: Users can share thoughts with optional names and mood selection
- **Admin Panel**: Secure dashboard to view all stored messages
- **Real-time Updates**: Messages appear instantly in the admin panel
- **Responsive Design**: Works great on both desktop and mobile

## Setup Instructions 🚀

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the backend server**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Access the website**
   - Main website: `http://localhost:3000`
   - Admin panel: `http://localhost:3000/admin`

### Default Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change these credentials in production!

## File Structure 📁

```
thoughts-website/
├── index.html          # Main website
├── styles.css          # Main website styles
├── script.js           # Main website functionality
├── admin.html          # Admin panel
├── admin-styles.css    # Admin panel styles
├── admin.js            # Admin panel functionality
├── server.js           # Backend server
├── package.json        # Dependencies
└── README.md           # This file
```

## How It Works 🔧

### Frontend
- Users fill out a form with their thoughts, name (optional), and mood
- Messages are sent to the backend API
- Beautiful, responsive design with mood-based color themes

### Backend
- Express.js server with SQLite database
- Session-based authentication for admin access
- RESTful API endpoints for message storage and retrieval
- Secure password hashing with bcrypt

### Admin Panel
- Login screen with secure authentication
- Dashboard showing message statistics
- Real-time message list with search and filtering
- Sort by newest/oldest messages
- Filter by mood type

## API Endpoints 🌐

- `POST /api/messages` - Store a new message
- `GET /api/messages` - Get all messages (admin only)
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/status` - Check authentication status

## Security Features 🔒

- Session-based authentication
- Password hashing with bcrypt
- CORS configuration for local development
- Input validation and sanitization
- Protected admin routes

## Customization 🎨

### Colors and Themes
- Edit CSS variables in `styles.css` and `admin-styles.css`
- Modify mood-based color schemes
- Adjust animations and transitions

### Database
- SQLite database file is created automatically
- Easy to switch to PostgreSQL, MySQL, or MongoDB
- Modify database schema in `server.js`

### Styling
- Cartoony design with rounded corners and bright colors
- Responsive grid layouts
- Smooth animations and hover effects

## Production Deployment 🚀

1. **Change default credentials** in `server.js`
2. **Set environment variables** for production
3. **Enable HTTPS** and set `secure: true` in session config
4. **Use a production database** (PostgreSQL, MySQL, etc.)
5. **Set up proper CORS** for your domain
6. **Add rate limiting** and additional security measures

## Troubleshooting 🔧

### Common Issues

**Port already in use**
- Change the port in `server.js` or kill the process using the port

**Database errors**
- Delete `messages.db` file and restart server
- Check file permissions

**CORS issues**
- Update CORS configuration in `server.js` with your domain

**Admin login not working**
- Check browser console for errors
- Verify server is running on correct port
- Clear browser cookies and try again

## Contributing 🤝

Feel free to submit issues and enhancement requests!

## License 📄

MIT License - feel free to use this project for your own purposes.

---

Made with ❤️ and lots of emojis! ✨
