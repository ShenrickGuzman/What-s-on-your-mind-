document.addEventListener('DOMContentLoaded', () => {
    // (Debug user display removed)
    // --- Mood Emoji Helper ---
    function getMoodEmoji(mood) {
        const moodEmojis = {
            'Happy': '😀',
            'Curious': '🤔',
            'Stressed': '😵‍💫',
            'Excited': '🎉',
            'In love': '😍',
            'Sad': '😢',
            'Bored': '🥱',
            'Fine': '🙂'
        };
        return moodEmojis[mood] || '😐';
    }

    // Toast notification system
    window.showToast = function(type, message) {
        // Remove any existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = document.createElement('i');
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
            toast.style.backgroundColor = '#4CAF50';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            toast.style.backgroundColor = '#f44336';
        } else if (type === 'warning') {
            icon.className = 'fas fa-exclamation-triangle';
            toast.style.backgroundColor = '#ff9800';
        }
        
        icon.style.marginRight = '8px';
        toast.appendChild(icon);
        
        const textNode = document.createTextNode(message);
        toast.appendChild(textNode);
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '4px',
            zIndex: '10000',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease-out'
        });
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // API Base URL
    const API_BASE = window.location.origin === 'file://' ? 'http://localhost:3000/api' : '/api';

    // All users section elements
    const allUsersSection = document.getElementById('allUsersSection');
    const allUsersList = document.getElementById('allUsersList');
    const refreshAllUsersBtn = document.getElementById('refreshAllUsersBtn');

    // Note: loadAllUsers() will be called after successful authentication

    // Fetch and display all users and their Gmail addresses
    async function loadAllUsers() {
        allUsersList.innerHTML = '<div style="text-align:center;">Loading...</div>';
        try {
            const res = await fetch(`${API_BASE}/admin/all-users`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch users');
            const users = await res.json();
            if (Array.isArray(users) && users.length > 0) {
                allUsersList.innerHTML = users.map(user => `
                    <div class="user-card">
                        <div class="user-avatar">👤</div>
                        <div class="user-details">
                            <h4>${user.username}</h4>
                            <p class="user-email">${user.gmail || 'No email'}</p>
                            <small>ID: ${user.id}</small>
                        </div>
                        <div class="user-actions">
                            <button class="delete-user-btn" onclick="window.deleteUserAccount(${user.id}, '${user.username}')" ${currentUserInfo && user.username === currentUserInfo.username ? 'disabled' : ''}>
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                allUsersList.innerHTML = '<div class="no-users">No users found</div>';
            }
        } catch (err) {
            console.error('Error loading users:', err);
            allUsersList.innerHTML = '<div class="error">Failed to load users</div>';
        }
    }

    // Delete user account function (global scope for onclick)
    window.deleteUserAccount = async function(userId, username) {
        if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) return;
        try {
            const delRes = await fetch(`${API_BASE}/admin/delete-user/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const delData = await delRes.json();
            if (delData.success) {
                showToast('success', `User "${username}" deleted successfully`);
                loadAllUsers(); // Refresh the list
            } else {
                showToast('error', delData.error || 'Failed to delete user');
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            showToast('error', 'Failed to delete user');
        }
    };

    // Refresh all users button
    if (refreshAllUsersBtn) {
        refreshAllUsersBtn.addEventListener('click', loadAllUsers);
    }

    // Login and dashboard elements
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const showSignupBtn = document.getElementById('showSignupBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const currentUser = document.getElementById('currentUser');
    const userRole = document.getElementById('userRole');

    // Search and filter elements
    const searchInput = document.getElementById('searchInput');
    const moodFilter = document.getElementById('moodFilter');
    const pinFilter = document.getElementById('pinFilter');
    const messagesList = document.getElementById('messagesList');
    const refreshBtn = document.getElementById('refreshBtn');
    const noMessages = document.getElementById('noMessages');
    const sortNewest = document.getElementById('sortNewest');
    const sortOldest = document.getElementById('sortOldest');

    // Admin management elements
    const adminManagementSection = document.getElementById('adminManagementSection');
    const addAdminBtn = document.getElementById('addAdminBtn');
    const addAdminModal = document.getElementById('addAdminModal');
    const closeAddAdminModal = document.getElementById('closeAddAdminModal');
    const cancelAddAdmin = document.getElementById('cancelAddAdmin');
    const confirmAddAdmin = document.getElementById('confirmAddAdmin');
    const addAdminForm = document.getElementById('addAdminForm');
    const adminUsersList = document.getElementById('adminUsersList');

    // Signup requests elements
    const viewSignupRequestsBtn = document.getElementById('viewSignupRequestsBtn');
    const signupRequestsModal = document.getElementById('signupRequestsModal');
    const closeSignupRequestsModal = document.getElementById('closeSignupRequestsModal');
    const signupRequestsList = document.getElementById('signupRequestsList');

    // Stats elements
    const totalMessages = document.getElementById('totalMessages');
    const pinnedMessages = document.getElementById('pinnedMessages');
    const happyMoods = document.getElementById('happyMoods');
    const curiousMoods = document.getElementById('curiousMoods');

    // State variables
    let allMessages = [];
    let filteredMessages = [];
    let currentSort = 'newest';
    let currentUserInfo = null;
    let isOwner = false;

    // Event listeners
    logoutBtn.addEventListener('click', handleLogout);
    showSignupBtn.addEventListener('click', showSignupForm);
    showLoginBtn.addEventListener('click', showLoginForm);
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    refreshBtn.addEventListener('click', loadMessages);
    searchInput.addEventListener('input', filterMessages);
    moodFilter.addEventListener('change', filterMessages);
    pinFilter.addEventListener('change', filterMessages);
    sortNewest.addEventListener('click', () => setSort('newest'));
    sortOldest.addEventListener('click', () => setSort('oldest'));

    // Admin management event listeners
    addAdminBtn.addEventListener('click', () => addAdminModal.classList.remove('hidden'));
    closeAddAdminModal.addEventListener('click', () => addAdminModal.classList.add('hidden'));
    cancelAddAdmin.addEventListener('click', () => addAdminModal.classList.add('hidden'));
    confirmAddAdmin.addEventListener('click', handleAddAdmin);

    // Signup requests event listeners
    viewSignupRequestsBtn.addEventListener('click', () => {
        signupRequestsModal.classList.remove('hidden');
        loadSignupRequests();
    });
    closeSignupRequestsModal.addEventListener('click', () => signupRequestsModal.classList.add('hidden'));

    // Close modals when clicking outside
    addAdminModal.addEventListener('click', (e) => {
        if (e.target === addAdminModal) {
            addAdminModal.classList.add('hidden');
        }
    });

    signupRequestsModal.addEventListener('click', (e) => {
        if (e.target === signupRequestsModal) {
            signupRequestsModal.classList.add('hidden');
        }
    });

    // Authentication functions
    function showSignupForm() {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        showSignupBtn.classList.add('hidden');
        showLoginBtn.classList.remove('hidden');
        document.getElementById('authSubtitle').textContent = 'Create a new admin account';
    }

    function showLoginForm() {
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        showLoginBtn.classList.add('hidden');
        showSignupBtn.classList.remove('hidden');
        document.getElementById('authSubtitle').textContent = 'Enter your credentials to view messages';
    }

    async function handleSignup(e) {
        e.preventDefault();
        
        const formData = new FormData(signupForm);
        const username = formData.get('username');
        const password = formData.get('password');
        const inviteCode = formData.get('inviteCode');
        
        try {
            const response = await fetch(`${API_BASE}/admin/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password, inviteCode })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('success', 'Account created successfully! 🎉');
                // Auto-login after successful signup
                await autoLogin(username, password);
            } else {
                showToast('error', data.error || 'Signup failed');
            }
        } catch (error) {
            console.error('Signup error:', error);
            showToast('error', 'Signup failed. Please try again.');
        }
    }

    // Auto-login after signup
    async function autoLogin(username, password) {
        try {
            const response = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                await loadUserInfo();
                showDashboard();
                loadMessages();
                loadAllUsers(); // Load users after successful login
                if (isOwner) {
                    loadAdminUsers();
                }
            } else {
                showLoginForm();
            }
        } catch (error) {
            console.error('Auto-login error:', error);
            showToast('error', 'Account created but login failed. Please try logging in manually.');
            showLoginForm();
        }
    }
    
    async function loadUserInfo() {
        try {
            // First, get the current admin's userId from status endpoint
            const statusRes = await fetch(`${API_BASE}/admin/status`, { credentials: 'include' });
            const statusData = await statusRes.json();
            let userId = statusData.userId;
            // Now get all admin users
            const usersRes = await fetch(`${API_BASE}/admin/users`, { credentials: 'include' });
            if (usersRes.ok) {
                const users = await usersRes.json();
                // Find the current user by id
                const currentUserData = users.find(user => user.id === userId);
                if (currentUserData) {
                    currentUserInfo = currentUserData;
                } else {
                    // fallback: just use first user
                    currentUserInfo = users[0];
                }
                // Make currentUserInfo globally accessible for Reveal Poster logic
                window.currentUserInfo = currentUserInfo;
                isOwner = currentUserInfo && currentUserInfo.is_owner === 1;
                updateUserDisplay();
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }
    
    function updateUserDisplay() {
        if (currentUserInfo) {
            currentUser.textContent = `👤 ${currentUserInfo.username}`;
            // Special handling for SHEN user
            if (currentUserInfo.username && currentUserInfo.username.toLowerCase() === 'shen') {
                userRole.textContent = '👑 OWNER👑';
            } else {
                userRole.textContent = isOwner ? '👑 Owner' : '👤 Admin';
            }
            
            // Show/hide admin management section
            if (isOwner) {
                adminManagementSection.classList.remove('hidden');
            } else {
                adminManagementSection.classList.add('hidden');
            }
        }
    }
    
    async function handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const username = formData.get('username');
        const password = formData.get('password');
        
        try {
            const response = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('Non-JSON response received:', textResponse);
                throw new Error('Server returned non-JSON response. Check server logs.');
            }
            
            const data = await response.json();
            
            if (data.success) {
                showToast('success', 'Login successful! 🎉');
                await loadUserInfo();
                showDashboard();
                loadMessages();
                if (isOwner) {
                    loadAdminUsers();
                }
            } else {
                showToast('error', data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            if (error.message.includes('non-JSON')) {
                showToast('error', 'Server error - check server configuration');
            } else {
                showToast('error', 'Login failed. Please try again.');
            }
        }
    }
    
    async function handleLogout() {
        try {
            const response = await fetch(`${API_BASE}/admin/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                showToast('success', 'Logged out successfully');
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always reset to login screen regardless of logout success
            currentUserInfo = null;
            isOwner = false;
            showLogin();
        }
    }

    // Admin management functions
    async function loadAdminUsers() {
        try {
            const response = await fetch(`${API_BASE}/admin/users`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const users = await response.json();
                displayAdminUsers(users);
            }
        } catch (error) {
            console.error('Error loading admin users:', error);
        }
    }

    function displayAdminUsers(users) {
        const usersHTML = users.map(user => `
            <div class="admin-user-card">
                <div class="admin-user-info">
                    <div class="admin-user-avatar">
                        ${user.is_owner ? '👑' : '👤'}
                    </div>
                    <div class="admin-user-details">
                        <h4>${user.username}</h4>
                        <span class="admin-user-role">${user.is_owner ? 'Owner' : 'Admin'}</span>
                        <small>Created: ${new Date(user.created_at).toLocaleDateString()}</small>
                    </div>
                </div>
                <div class="admin-user-actions">
                    ${!user.is_owner && user.id !== currentUserInfo?.id ? 
                        `<button class="delete-admin-btn" onclick="deleteAdminUser(${user.id}, '${user.username}')" title="Delete admin user">
                            <i class="fas fa-trash"></i>
                        </button>` : ''
                    }
                </div>
            </div>
        `).join('');
        
        adminUsersList.innerHTML = usersHTML;
    }
    
    // Pin message functions (make it global for onclick access)
    window.togglePinMessage = async function(messageId, isPinned) {
        try {
            const response = await fetch(`${API_BASE}/messages/${messageId}/pin`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ isPinned: !isPinned })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    showToast('success', `Message ${!isPinned ? 'pinned' : 'unpinned'} successfully! 📌`);
                    loadMessages();
                }
            } else {
                const errorData = await response.json();
                showToast('error', errorData.error || 'Failed to update pin status');
            }
        } catch (error) {
            console.error('Error toggling pin status:', error);
            showToast('error', 'Failed to update pin status');
        }
    };
    
    // UI functions
    function showLogin() {
        loginScreen.classList.remove('hidden');
        dashboard.classList.add('hidden');
        loginForm.reset();
        currentUserInfo = null;
        isOwner = false;
    }
    
    function showDashboard() {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
    }
    
    // Message loading and display
    async function loadMessages() {
        showLoading(true);
        
        try {
            // Fetch both private and public messages
            const [privateRes, publicRes] = await Promise.all([
                fetch(`${API_BASE}/messages`, { credentials: 'include' }),
                fetch(`${API_BASE}/public-messages`, { credentials: 'include' })
            ]);
            
            // Check authentication and JSON for both
            if (!privateRes.ok || !publicRes.ok) {
                if (privateRes.status === 401 || publicRes.status === 401) {
                    showToast('error', 'Please login again');
                    showLogin();
                    return;
                }
                throw new Error('Failed to fetch messages');
            }
            const privateContentType = privateRes.headers.get('content-type');
            const publicContentType = publicRes.headers.get('content-type');
            if (!privateContentType.includes('application/json') || !publicContentType.includes('application/json')) {
                showToast('error', 'Server configuration error');
                showLoading(false);
                return;
            }
            const privateMessages = await privateRes.json();
            const publicMessages = await publicRes.json();
            // Mark public messages for UI logic
            publicMessages.forEach(m => m.is_public = true);
            allMessages = [...privateMessages, ...publicMessages];
            console.log('Messages loaded successfully:', allMessages.length);
            updateStats();
            filterMessages();
            showLoading(false);
        } catch (error) {
            console.error('Error loading messages:', error);
            showToast('error', 'Failed to load messages: ' + error.message);
            showLoading(false);
        }
    }
    
    // Normalize pin flag from backend (handles boolean true/false and numeric 1/0)
    function isPinnedFlag(message) {
        const v = message && message.is_pinned;
        return v === true || v === 1 || v === '1' || v === 't' || v === 'true';
    }

    function updateStats() {
        const total = allMessages.length;
        const pinned = allMessages.filter(m => isPinnedFlag(m)).length;
        const happy = allMessages.filter(m => m.mood === 'Happy').length;
        const curious = allMessages.filter(m => m.mood === 'Curious').length;
        
        totalMessages.textContent = total;
        pinnedMessages.textContent = pinned;
        happyMoods.textContent = happy;
        curiousMoods.textContent = curious;
    }
    
    function filterMessages() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedMood = moodFilter.value;
        const selectedPinStatus = pinFilter.value;
        
        filteredMessages = allMessages.filter(message => {
            const matchesSearch = message.message.toLowerCase().includes(searchTerm) ||
                                (message.name && message.name.toLowerCase().includes(searchTerm));
            const matchesMood = !selectedMood || message.mood === selectedMood;
            const pinned = isPinnedFlag(message);
            const matchesPinStatus = !selectedPinStatus || 
                                   (selectedPinStatus === 'pinned' && pinned) ||
                                   (selectedPinStatus === 'unpinned' && !pinned);
            
            return matchesSearch && matchesMood && matchesPinStatus;
        });
        
        displayMessages();
    }
    
    function setSort(sortType) {
        currentSort = sortType;
        
        // Update button states
        sortNewest.classList.toggle('active', sortType === 'newest');
        sortOldest.classList.toggle('active', sortType === 'oldest');
        
        displayMessages();
    }
    
    function displayMessages() {
        if (filteredMessages.length === 0) {
            messagesList.innerHTML = '';
            noMessages.classList.remove('hidden');
            return;
        }
        
        noMessages.classList.add('hidden');
        
        // Sort messages - pinned first, then by timestamp
        const sortedMessages = [...filteredMessages].sort((a, b) => {
            // First sort by pin status
            const aPinned = isPinnedFlag(a) ? 1 : 0;
            const bPinned = isPinnedFlag(b) ? 1 : 0;
            if (aPinned !== bPinned) {
                return bPinned - aPinned;
            }
            
            // Then sort by timestamp
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
        });
        
        // Create message cards
        const messagesHTML = sortedMessages.map(message => createMessageCard(message)).join('');
        messagesList.innerHTML = messagesHTML;
    }
    
    function createMessageCard(message) {
        const timestamp = new Date(message.timestamp).toLocaleString();
        const moodEmoji = getMoodEmoji(message.mood);
        const isPinned = isPinnedFlag(message);

        // SHEN admin controls (delete/reveal)
        let shenControls = '';
        console.log('DEBUG: currentUserInfo', window.currentUserInfo);
        console.log('DEBUG: message._posterInfo', message._posterInfo);
        if (window.currentUserInfo && window.currentUserInfo.username && window.currentUserInfo.username.toLowerCase() === 'shen') {
            // Always show Reveal Poster button for SHEN (for all messages)
            const name = message._posterInfo && message._posterInfo.name ? message._posterInfo.name : '';
            const gmail = message._posterInfo && message._posterInfo.gmail ? message._posterInfo.gmail : '';
            shenControls += `<button class="shen-reveal-btn" type="button" onclick="window.toggleRevealPoster(this, '${name}', '${gmail}')">👁 Reveal Poster</button> <span class="shen-poster-info"></span>`;
            // Delete button (for public messages only)
            if (message.is_public) {
                shenControls += `<button class="shen-delete-btn" type="button" onclick="window.deletePublicMessage(${message.id}, this)">🗑 Delete</button>`;
            }
        }

        return `
            <div class="message-card ${isPinned ? 'pinned' : ''}" data-id="${message.id}">
                <div class="message-header">
                    <div class="message-meta">
                        <span class="message-name">${message.name}</span>
                        <span class="message-mood">${moodEmoji} ${message.mood}</span>
                        ${isPinned ? '<span class="pin-indicator">📌 Pinned</span>' : ''}
                    </div>
                    <div class="message-actions">
                        <span class="message-timestamp">${timestamp}</span>
                        <button class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="window.togglePinMessage(${message.id}, ${isPinned})" title="${isPinned ? 'Unpin message' : 'Pin message'}">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteMessage(${message.id})" title="Delete message">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${shenControls ? `<div class="shen-controls">${shenControls}</div>` : ''}
                    </div>
                </div>
                <div class="message-text">${message.message}</div>
            </div>
        `;
    }

    // SHEN reveal/hide logic
    window.toggleRevealPoster = function(btn, name) {
        const infoSpan = btn.nextElementSibling;
        const gmail = arguments[2] || '';
        if (btn.textContent.includes('Reveal')) {
            let info = '';
            if (gmail) {
                info = `Gmail: ${gmail}`;
            } else if (name) {
                info = `Name: ${name}`;
            } else {
                info = 'Unknown';
            }
            infoSpan.textContent = info;
            btn.textContent = '🙈 Hide Poster';
        } else {
            infoSpan.textContent = '';
            btn.textContent = '👁 Reveal Poster';
        }
    };

    // SHEN delete public message logic
    window.deletePublicMessage = async function(id, btn) {
        if (!confirm('Delete this public message?')) return;
        try {
            const res = await fetch(`/api/public-messages/${id}`, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                // Remove card from DOM
                btn.closest('.message-card').remove();
            } else {
                alert(data.error || 'Delete failed');
            }
        } catch (err) {
            alert('Delete failed');
        }
    };
    
    // Delete message function (global scope for onclick)
    window.deleteMessage = async function(messageId) {
        // Store the message ID for deletion
        window.pendingDeleteId = messageId;
        
        // Show the delete confirmation modal
        const deleteModal = document.getElementById('deleteModal');
        deleteModal.classList.remove('hidden');
        
        // Add event listeners for modal buttons
        const cancelBtn = document.getElementById('cancelDelete');
        const confirmBtn = document.getElementById('confirmDelete');
        
        // Remove existing listeners to prevent duplicates
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        
        // Get fresh references
        const newCancelBtn = document.getElementById('cancelDelete');
        const newConfirmBtn = document.getElementById('confirmDelete');
        
        // Add new listeners
        newCancelBtn.addEventListener('click', () => {
            deleteModal.classList.add('hidden');
            window.pendingDeleteId = null;
        });
        
        newConfirmBtn.addEventListener('click', async () => {
            await performDelete(window.pendingDeleteId);
            deleteModal.classList.add('hidden');
            window.pendingDeleteId = null;
        });
        
        // Close modal when clicking outside
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                deleteModal.classList.add('hidden');
                window.pendingDeleteId = null;
            }
        });
    };
    
    // Perform the actual delete operation
    async function performDelete(messageId) {
        try {
            const response = await fetch(`${API_BASE}/messages/${messageId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    showToast('success', 'Message deleted successfully! 🗑️');
                    loadMessages(); // Reload messages to update the list
                } else {
                    showToast('error', data.error || 'Failed to delete message');
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            showToast('error', 'Failed to delete message');
        }
    }
    
    // Loading spinner
    function showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.toggle('hidden', !show);
        }
    }

    // Check if user is already logged in
    checkAuthStatus();
    
    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE}/admin/status`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.authenticated) {
                    await loadUserInfo();
                    showDashboard();
                    loadMessages();
                    loadAllUsers(); // Load users after authentication check
                    if (isOwner) {
                        loadAdminUsers();
                    }
                } else {
                    showLogin();
                }
            } else {
                showLogin();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            showLogin();
        }
    }

    // Add admin user function
    async function handleAddAdmin() {
        const formData = new FormData(addAdminForm);
        const username = formData.get('username');
        const password = formData.get('password');
        
        if (!username || !password) {
            showToast('error', 'Please fill in all fields');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/admin/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('success', 'Admin user created successfully! 🎉');
                addAdminModal.classList.add('hidden');
                addAdminForm.reset();
                loadAdminUsers(); // Refresh the admin users list
            } else {
                showToast('error', data.error || 'Failed to create admin user');
            }
        } catch (error) {
            console.error('Error creating admin user:', error);
            showToast('error', 'Failed to create admin user');
        }
    }

    // Delete admin user function (global scope for onclick)
    window.deleteAdminUser = async function(userId, username) {
        if (!confirm(`Are you sure you want to delete admin user "${username}"?`)) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('success', 'Admin user deleted successfully');
                loadAdminUsers(); // Refresh the admin users list
            } else {
                showToast('error', data.error || 'Failed to delete admin user');
            }
        } catch (error) {
            console.error('Error deleting admin user:', error);
            showToast('error', 'Failed to delete admin user');
        }
    };

    // Signup requests functions
    async function loadSignupRequests() {
        try {
            const response = await fetch(`${API_BASE}/auth/signup-requests`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const requests = await response.json();
                displaySignupRequests(requests);
            } else {
                signupRequestsList.innerHTML = '<p class="error">Failed to load signup requests</p>';
            }
        } catch (error) {
            console.error('Error loading signup requests:', error);
            signupRequestsList.innerHTML = '<p class="error">Failed to load signup requests</p>';
        }
    }

    function displaySignupRequests(requests) {
        if (requests.length === 0) {
            signupRequestsList.innerHTML = '<p class="no-requests">No pending signup requests</p>';
            return;
        }

        const requestsHTML = requests.map(request => `
            <div class="signup-request-card">
                <div class="request-info">
                    <h4>${request.username}</h4>
                    <p class="request-email">${request.gmail}</p>
                    <small>Requested: ${new Date(request.created_at).toLocaleString()}</small>
                </div>
                <div class="request-actions">
                    <button class="approve-btn" onclick="approveSignupRequest(${request.id})">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="decline-btn" onclick="declineSignupRequest(${request.id})">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            </div>
        `).join('');

        signupRequestsList.innerHTML = requestsHTML;
    }

    // Approve signup request function (global scope for onclick)
    window.approveSignupRequest = async function(requestId) {
        try {
            const response = await fetch(`${API_BASE}/auth/signup-requests/${requestId}/approve`, {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('success', 'Signup request approved successfully');
                loadSignupRequests(); // Refresh the requests list
            } else {
                showToast('error', data.error || 'Failed to approve request');
            }
        } catch (error) {
            console.error('Error approving request:', error);
            showToast('error', 'Failed to approve request');
        }
    };

    // Decline signup request function (global scope for onclick)
    window.declineSignupRequest = async function(requestId) {
        try {
            const response = await fetch(`${API_BASE}/auth/signup-requests/${requestId}/decline`, {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('success', 'Signup request declined');
                loadSignupRequests(); // Refresh the requests list
            } else {
                showToast('error', data.error || 'Failed to decline request');
            }
        } catch (error) {
            console.error('Error declining request:', error);
            showToast('error', 'Failed to decline request');
        }
    };
});
