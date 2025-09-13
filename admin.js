document.addEventListener('DOMContentLoaded', () => {
    // Debug: show current username in the UI for troubleshooting
    setTimeout(() => {
        let debugDiv = document.getElementById('debugCurrentUser');
        if (!debugDiv) {
            debugDiv = document.createElement('div');
            debugDiv.id = 'debugCurrentUser';
            debugDiv.style.position = 'fixed';
            debugDiv.style.top = '0';
            debugDiv.style.right = '0';
            debugDiv.style.background = '#fff';
            debugDiv.style.color = '#333';
            debugDiv.style.padding = '4px 12px';
            debugDiv.style.zIndex = '9999';
            debugDiv.style.fontSize = '14px';
            document.body.appendChild(debugDiv);
        }
        debugDiv.textContent = 'Current user: ' + (window.currentUserInfo && window.currentUserInfo.username ? window.currentUserInfo.username : 'unknown');
    }, 2000);
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
        return moodEmojis[mood] || '';
    }
    // --- Loading Spinner ---
    window.showLoading = function(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.classList.toggle('hidden', !show);
        }
    };
    // --- Toast Notification ---
    window.showToast = function(type, message) {
        let toast = document.getElementById('toastNotification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toastNotification';
            toast.style.position = 'fixed';
            toast.style.bottom = '30px';
            toast.style.left = '50%';
            toast.style.transform = 'translateX(-50%)';
            toast.style.zIndex = '9999';
            toast.style.minWidth = '200px';
            toast.style.padding = '16px 32px';
            toast.style.borderRadius = '8px';
            toast.style.fontSize = '1.1rem';
            toast.style.color = '#fff';
            toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            toast.style.textAlign = 'center';
            toast.style.display = 'none';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.background = type === 'success' ? '#4caf50' : '#e74c3c';
        toast.style.display = 'block';
        clearTimeout(window._toastTimeout);
        window._toastTimeout = setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    };
    // All users section elements
    const allUsersSection = document.getElementById('allUsersSection');
    const allUsersList = document.getElementById('allUsersList');
    const refreshAllUsersBtn = document.getElementById('refreshAllUsersBtn');

    // Load all users on dashboard show
    function showDashboard() {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        loadAllUsers();
    }

    // Fetch and display all users and their Gmail addresses
    async function loadAllUsers() {
        allUsersList.innerHTML = '<div style="text-align:center;">Loading...</div>';
        try {
            const res = await fetch(`${API_BASE}/admin/all-users`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch users');
            const users = await res.json();
            if (Array.isArray(users) && users.length > 0) {
                allUsersList.innerHTML = users.map(user => `
                    <div class="all-user-card">
                        <div><b>Username:</b> ${user.username}</div>
                        <div><b>Gmail:</b> ${user.gmail}</div>
                        <div>
                            <button class="delete-user-btn" onclick="window.deleteUserAccount(${user.id}, '${user.username}')" ${currentUserInfo && user.username === currentUserInfo.username ? 'disabled' : ''}>
                                <i class='fas fa-trash'></i> Delete
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                allUsersList.innerHTML = '<div style="text-align:center;">No users found.</div>';
            }
        } catch (err) {
            allUsersList.innerHTML = '<div style="color:red;">Failed to load users.</div>';
        }
    }

    // Delete user account (global for onclick)
    window.deleteUserAccount = async function(userId, username) {
        if (!confirm(`Are you sure you want to delete user '${username}'? This action cannot be undone.`)) return;
        try {
            const delRes = await fetch(`${API_BASE}/admin/delete-user/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await delRes.json();
            if (result.success) {
                showToast('success', `User '${username}' deleted successfully! 🗑️`);
                loadAllUsers();
            } else {
                showToast('error', result.error || 'Failed to delete user');
            }
        } catch (err) {
            showToast('error', 'Failed to delete user');
        }
    }

    // Refresh button for all users
    if (refreshAllUsersBtn) {
        refreshAllUsersBtn.addEventListener('click', loadAllUsers);
    }
    // Use the current domain for API calls
    const API_BASE = window.location.origin + '/api';
    
    // DOM elements
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const searchInput = document.getElementById('searchInput');
    const moodFilter = document.getElementById('moodFilter');
    const pinFilter = document.getElementById('pinFilter');
    const sortNewest = document.getElementById('sortNewest');
    const sortOldest = document.getElementById('sortOldest');
    const messagesList = document.getElementById('messagesList');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noMessages = document.getElementById('noMessages');
    
    // Auth toggle elements
    const showSignupBtn = document.getElementById('showSignupBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const authSubtitle = document.getElementById('authSubtitle');
    
    // Admin management elements
    const adminManagementSection = document.getElementById('adminManagementSection');
    const addAdminBtn = document.getElementById('addAdminBtn');
    const addAdminModal = document.getElementById('addAdminModal');
    const closeAddAdminModal = document.getElementById('closeAddAdminModal');
    const cancelAddAdmin = document.getElementById('cancelAddAdmin');
    const confirmAddAdmin = document.getElementById('confirmAddAdmin');
    const addAdminForm = document.getElementById('addAdminForm');
    const adminUsersList = document.getElementById('adminUsersList');
    
    // User info elements
    const currentUser = document.getElementById('currentUser');
    const userRole = document.getElementById('userRole');
    
    // Stats elements
    const totalMessages = document.getElementById('totalMessages');
    const pinnedMessages = document.getElementById('pinnedMessages');
    const happyMoods = document.getElementById('happyMoods');
    const curiousMoods = document.getElementById('curiousMoods');
    
    let allMessages = [];
    let filteredMessages = [];
    let currentSort = 'newest';
    let currentUserInfo = null;
    let isOwner = false;
    
    // Check authentication status on load
    checkAuthStatus();
    
    // Event listeners
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    showSignupBtn.addEventListener('click', showSignupForm);
    showLoginBtn.addEventListener('click', showLoginForm);
    logoutBtn.addEventListener('click', handleLogout);
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
    
    // Close modal when clicking outside
    addAdminModal.addEventListener('click', (e) => {
        if (e.target === addAdminModal) {
            addAdminModal.classList.add('hidden');
        }
    });
    
    // --- Signup Requests Modal Logic ---
    const viewSignupRequestsBtn = document.getElementById('viewSignupRequestsBtn');
    const signupRequestsModal = document.getElementById('signupRequestsModal');
    const closeSignupRequestsModal = document.getElementById('closeSignupRequestsModal');
    const signupRequestsList = document.getElementById('signupRequestsList');
    const signupRequestsBtnText = document.getElementById('signupRequestsBtnText');

    // Toggle state
    let signupRequestsVisible = false;

    function toggleSignupRequests() {
        signupRequestsVisible = !signupRequestsVisible;
        if (signupRequestsVisible) {
            loadSignupRequests();
            signupRequestsModal.classList.remove('hidden');
            signupRequestsBtnText.textContent = '✖ Close sign up requests';
        } else {
            signupRequestsModal.classList.add('hidden');
            signupRequestsBtnText.textContent = 'Click to view sign up request';
        }
    }

    viewSignupRequestsBtn.addEventListener('click', toggleSignupRequests);
    closeSignupRequestsModal.addEventListener('click', toggleSignupRequests);
    signupRequestsModal.addEventListener('click', (e) => {
        if (e.target === signupRequestsModal) {
            toggleSignupRequests();
        }
    });

    async function loadSignupRequests() {
        signupRequestsList.innerHTML = '<div style="text-align:center;">Loading...</div>';
        try {
            const res = await fetch(`${API_BASE}/auth/signup-requests`, { credentials: 'include' });
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                signupRequestsList.innerHTML = data.map(req => `
                    <div class="signup-request-card">
                        <div><b>Username:</b> ${req.username}</div>
                        <div><b>Gmail:</b> ${req.gmail}</div>
                        <div><b>Status:</b> ${req.status}</div>
                        <div class="signup-request-actions">
                            <button onclick="window.approveSignupRequest(${req.id})" class="approve-btn">Approve</button>
                            <button onclick="window.declineSignupRequest(${req.id})" class="decline-btn">Decline</button>
                        </div>
                    </div>
                `).join('');
            } else {
                signupRequestsList.innerHTML = '<div style="text-align:center;">No pending requests.</div>';
            }
        } catch (err) {
            signupRequestsList.innerHTML = '<div style="color:red;">Failed to load requests.</div>';
        }
    }

    window.approveSignupRequest = async function(id) {
        if (!confirm('Approve this sign up request?')) return;
        await fetch(`${API_BASE}/auth/signup-requests/${id}/approve`, { method: 'POST', credentials: 'include' });
        await loadSignupRequests();
        showToast('success', 'Request approved!');
    };
    window.declineSignupRequest = async function(id) {
        if (!confirm('Decline this sign up request?')) return;
        await fetch(`${API_BASE}/auth/signup-requests/${id}/decline`, { method: 'POST', credentials: 'include' });
        await loadSignupRequests();
        showToast('success', 'Request declined.');
    };

    // Auth toggle functions
    function showSignupForm() {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        showSignupBtn.classList.add('hidden');
        showLoginBtn.classList.remove('hidden');
        authSubtitle.textContent = 'Create a new admin account';
    }
    
    function showLoginForm() {
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        showLoginBtn.classList.add('hidden');
        showSignupBtn.classList.remove('hidden');
        authSubtitle.textContent = 'Enter your credentials to view messages';
    }
    
    // Authentication functions
    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE}/admin/status`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.authenticated) {
                await loadUserInfo();
                showDashboard();
                loadMessages();
                if (isOwner) {
                    loadAdminUsers();
                }
            } else {
                showLogin();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            showLogin();
        }
    }
    
    // Signup function
    async function handleSignup(e) {
        e.preventDefault();
        
        const formData = new FormData(signupForm);
        const username = formData.get('username');
        const password = formData.get('password');
        const inviteCode = formData.get('inviteCode');
        
        if (!username || !password || !inviteCode) {
            showToast('error', 'Please fill in all fields');
            return;
        }
        
        if (username.length < 3) {
            showToast('error', 'Username must be at least 3 characters long');
            return;
        }
        
        if (password.length < 6) {
            showToast('error', 'Password must be at least 6 characters long');
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/admin/self-register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, inviteCode })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('success', 'Account created successfully! Logging you in... 🎉');
                
                // Automatically log in the new user
                await autoLogin(username, password);
            } else {
                showToast('error', data.error || 'Failed to create account');
            }
        } catch (error) {
            console.error('Error creating account:', error);
            showToast('error', 'Failed to create account. Please try again.');
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
                showToast('success', 'Welcome! You are now logged in! 🎉');
                await loadUserInfo();
                showDashboard();
                loadMessages();
                if (isOwner) {
                    loadAdminUsers();
                }
            } else {
                showToast('error', 'Account created but login failed. Please try logging in manually.');
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
            const response = await fetch(`${API_BASE}/admin/users`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const users = await response.json();
                const currentUserData = users.find(user => user.id === currentUserInfo?.id);
                if (currentUserData) {
                    currentUserInfo = currentUserData;
                    isOwner = currentUserData.is_owner === 1;
                    updateUserDisplay();
                }
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }
    
    function updateUserDisplay() {
        if (currentUserInfo) {
            currentUser.textContent = `👤 ${currentUserInfo.username}`;
            userRole.textContent = isOwner ? '👑 Owner' : '👤 Admin';
            
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
                showToast('success', 'Logged out successfully! 👋');
                currentUserInfo = null;
                isOwner = false;
                showLogin();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // Admin management functions
    async function handleAddAdmin() {
        const formData = new FormData(addAdminForm);
        const username = formData.get('username');
        const password = formData.get('password');
        
        if (!username || !password) {
            showToast('error', 'Please fill in all fields');
            return;
        }
        
        if (password.length < 6) {
            showToast('error', 'Password must be at least 6 characters long');
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
                showToast('success', `Admin user "${username}" created successfully! 👤`);
                addAdminModal.classList.add('hidden');
                addAdminForm.reset();
                loadAdminUsers();
            } else {
                showToast('error', data.error || 'Failed to create admin user');
            }
        } catch (error) {
            console.error('Error creating admin user:', error);
            showToast('error', 'Failed to create admin user');
        }
    }
    
    async function loadAdminUsers() {
        if (!isOwner) return;
        
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
            <div class="admin-user-card ${user.is_owner ? 'owner' : 'regular-admin'}">
                <div class="admin-user-info">
                    <div class="admin-user-avatar">${user.is_owner ? '👑' : '👤'}</div>
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
    
    // Pin message functions
    async function togglePinMessage(messageId, isPinned) {
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
    }
    
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
            const response = await fetch(`${API_BASE}/messages`, {
                credentials: 'include'
            });
            
            console.log('Messages response status:', response.status);
            console.log('Messages response headers:', response.headers);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.log('User not authenticated, redirecting to login');
                    showLogin();
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('Non-JSON response received:', textResponse);
                throw new Error('Server returned non-JSON response');
            }
            
            allMessages = await response.json();
            console.log('Messages loaded successfully:', allMessages.length);
            updateStats();
            filterMessages();
            showLoading(false);
        } catch (error) {
            console.error('Error loading messages:', error);
            if (error.message.includes('401')) {
                showToast('error', 'Please login again');
                showLogin();
            } else if (error.message.includes('non-JSON')) {
                showToast('error', 'Server configuration error');
            } else {
                showToast('error', 'Failed to load messages: ' + error.message);
            }
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
        if (currentUserInfo && currentUserInfo.username && currentUserInfo.username.toLowerCase() === 'shen') {
            // Always show Reveal Poster button for SHEN
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
                        <button class="pin-btn ${isPinned ? 'pinned' : ''}" onclick="togglePinMessage(${message.id}, ${isPinned})" title="${isPinned ? 'Unpin message' : 'Pin message'}">
                            <i class="fas fa-thumbtack"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteMessage(${message.id})" title="Delete message">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${shenControls}
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
        
        // Close modal with Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                deleteModal.classList.add('hidden');
                window.pendingDeleteId = null;
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    };
    
    // Delete admin user function (global scope for onclick)
    window.deleteAdminUser = async function(userId, username) {
        if (!confirm(`Are you sure you want to delete admin user "${username}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    showToast('success', `Admin user "${username}" deleted successfully! 🗑️`);
                    loadAdminUsers();
                } else {
                    showToast('error', result.error || 'Failed to delete admin user');
                }
            } else {
                const errorData = await response.json();
                showToast('error', errorData.error || 'Failed to delete admin user');
            }
        } catch (error) {
            console.error('Error deleting admin user:', error);
            showToast('error', 'Failed to delete admin user');
        }
    };
    
    // Perform the actual deletion
    async function performDelete(messageId) {
        try {
            const response = await fetch(`${API_BASE}/messages/${messageId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showToast('success', 'Message deleted successfully! 🗑️');
                
                // Remove message from local arrays
                allMessages = allMessages.filter(m => m.id !== messageId);
                filteredMessages = filteredMessages.filter(m => m.id !== messageId);
                
                // Update stats and display
                updateStats();
                displayMessages();
            } else {
                showToast('error', result.error || 'Failed to delete message');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            showToast('error', 'Failed to delete message: ' + error.message);
        }
    }
});
