// public.js
// Dashboard for public thoughts (read-only, no delete/pin)
document.addEventListener('DOMContentLoaded', () => {
    const messagesList = document.getElementById('messagesList');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noMessages = document.getElementById('noMessages');
    const totalMessages = document.getElementById('totalMessages');
    const happyMoods = document.getElementById('happyMoods');
    const curiousMoods = document.getElementById('curiousMoods');
    const searchInput = document.getElementById('searchInput');
    const moodFilter = document.getElementById('moodFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const sortNewest = document.getElementById('sortNewest');
    const sortOldest = document.getElementById('sortOldest');

    let allMessages = [];
    let sortOrder = 'newest';

    function showLoading(show) {
        loadingSpinner.classList.toggle('hidden', !show);
    }
    function showNoMessages(show) {
        noMessages.classList.toggle('hidden', !show);
    }

    function renderMessages(messages) {
        messagesList.innerHTML = '';
        if (!messages.length) {
            showNoMessages(true);
            return;
        }
        showNoMessages(false);
        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'message-card';
            div.innerHTML = `
                <div class="message-header">
                    <span class="message-mood">${msg.mood ? msg.mood : ''}</span>
                    <span class="message-name">${msg.name ? msg.name : 'Anonymous'}</span>
                    <span class="message-date">${msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</span>
                </div>
                <div class="message-text">${msg.message}</div>
            `;
            messagesList.appendChild(div);
        });
    }

    function updateStats(messages) {
        totalMessages.textContent = messages.length;
        happyMoods.textContent = messages.filter(m => m.mood === 'Happy').length;
        curiousMoods.textContent = messages.filter(m => m.mood === 'Curious').length;
    }

    function filterAndRender() {
        let filtered = allMessages;
        const search = searchInput.value.trim().toLowerCase();
        const mood = moodFilter.value;
        if (search) {
            filtered = filtered.filter(m => m.message.toLowerCase().includes(search) || (m.name && m.name.toLowerCase().includes(search)));
        }
        if (mood) {
            filtered = filtered.filter(m => m.mood === mood);
        }
        if (sortOrder === 'oldest') {
            filtered = [...filtered].reverse();
        }
        renderMessages(filtered);
        updateStats(filtered);
    }

    function fetchMessages() {
        showLoading(true);
        fetch('/api/public-messages')
            .then(res => res.json())
            .then(data => {
                allMessages = data;
                filterAndRender();
            })
            .catch(() => {
                messagesList.innerHTML = '<div class="error">Failed to load messages.</div>';
            })
            .finally(() => showLoading(false));
    }

    searchInput.addEventListener('input', filterAndRender);
    moodFilter.addEventListener('change', filterAndRender);
    refreshBtn.addEventListener('click', fetchMessages);
    sortNewest.addEventListener('click', () => {
        sortOrder = 'newest';
        sortNewest.classList.add('active');
        sortOldest.classList.remove('active');
        filterAndRender();
    });
    sortOldest.addEventListener('click', () => {
        sortOrder = 'oldest';
        sortNewest.classList.remove('active');
        sortOldest.classList.add('active');
        filterAndRender();
    });

    fetchMessages();
});
