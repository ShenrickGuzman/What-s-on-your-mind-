document.addEventListener('DOMContentLoaded', () => {
    // Use the current domain for API calls
    const API_BASE = window.location.origin + '/api';
    
    // DOM elements
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const searchInput = document.getElementById('searchInput');
    const moodFilter = document.getElementById('moodFilter');
    const sortNewest = document.getElementById('sortNewest');
    const sortOldest = document.getElementById('sortOldest');
    const messagesList = document.getElementById('messagesList');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noMessages = document.getElementById('noMessages');
    
    // Stats elements
    const totalMessages = document.getElementById('totalMessages');
    const happyMoods = document.getElementById('happyMoods');
    const curiousMoods = document.getElementById('curiousMoods');
    const excitedMoods = document.getElementById('excitedMoods');
    
    let allMessages = [];
    let filteredMessages = [];
    let currentSort = 'newest';
    
    // Check authentication status on load
    checkAuthStatus();
    
    // Event listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    refreshBtn.addEventListener('click', loadMessages);
    searchInput.addEventListener('input', filterMessages);
    moodFilter.addEventListener('change', filterMessages);
    sortNewest.addEventListener('click', () => setSort('newest'));
    sortOldest.addEventListener('click', () => setSort('oldest'));
    
    // Authentication functions
    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE}/admin/status`, {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.authenticated) {
                showDashboard();
                loadMessages();
            } else {
                showLogin();
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            showLogin();
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
                showDashboard();
                loadMessages();
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
                showLogin();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    // UI functions
    function showLogin() {
        loginScreen.classList.remove('hidden');
        dashboard.classList.add('hidden');
        loginForm.reset();
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
    
    function updateStats() {
        const total = allMessages.length;
        const happy = allMessages.filter(m => m.mood === 'Happy').length;
        const curious = allMessages.filter(m => m.mood === 'Curious').length;
        const excited = allMessages.filter(m => m.mood === 'Excited').length;
        
        totalMessages.textContent = total;
        happyMoods.textContent = happy;
        curiousMoods.textContent = curious;
        excitedMoods.textContent = excited;
    }
    
    function filterMessages() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedMood = moodFilter.value;
        
        filteredMessages = allMessages.filter(message => {
            const matchesSearch = message.message.toLowerCase().includes(searchTerm) ||
                                (message.name && message.name.toLowerCase().includes(searchTerm));
            const matchesMood = !selectedMood || message.mood === selectedMood;
            
            return matchesSearch && matchesMood;
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
        
        // Sort messages
        const sortedMessages = [...filteredMessages].sort((a, b) => {
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
        
        return `
            <div class="message-card" data-id="${message.id}">
                <div class="message-header">
                    <div class="message-meta">
                        <span class="message-name">${message.name}</span>
                        <span class="message-mood">${moodEmoji} ${message.mood}</span>
                    </div>
                    <div class="message-actions">
                        <span class="message-timestamp">${timestamp}</span>
                        <button class="delete-btn" onclick="deleteMessage(${message.id})" title="Delete message">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="message-text">${message.message}</div>
            </div>
        `;
    }
    
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
        return moodEmojis[mood] || '😊';
    }
    
    function showLoading(show) {
        if (show) {
            loadingSpinner.classList.remove('hidden');
            messagesList.innerHTML = '';
            noMessages.classList.add('hidden');
        } else {
            loadingSpinner.classList.add('hidden');
        }
    }
    
    // Toast notifications
    function showToast(type, message) {
        const toast = document.getElementById(`${type}Toast`);
        const messageSpan = document.getElementById(`${type}Message`);
        
        messageSpan.textContent = message;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        if (dashboard.classList.contains('hidden')) return;
        loadMessages();
    }, 30000);
    
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
