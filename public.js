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

    const reactionMeta = [
        { key: 'like', label: '👍' },
        { key: 'heart', label: '❤️' },
        { key: 'laugh', label: '😂' },
        { key: 'wow', label: '😮' },
        { key: 'sad', label: '😢' }
    ];

    async function fetchComments(messageId, container, toggleBtn, form) {
        try {
            const res = await fetch(`/api/public-messages/${messageId}/comments`);
            const data = await res.json();
            container.innerHTML = '';
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<div class="no-comments">No comments yet.</div>';
            } else {
                data.forEach(c => {
                    const item = document.createElement('div');
                    item.className = 'comment-item';
                    item.innerHTML = `<span class="comment-author">${escapeHtml(c.displayName)}</span>: <span class="comment-text">${escapeHtml(c.comment)}</span>`;
                    container.appendChild(item);
                });
            }
            toggleBtn.textContent = `Hide Comments (${data.length})`;
            form.classList.remove('hidden');
        } catch (err) {
            container.innerHTML = '<div class="error">Failed to load comments.</div>';
        }
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function buildReactionBar(message) {
        const bar = document.createElement('div');
        bar.className = 'reactions-bar';
        reactionMeta.forEach(r => {
            const count = message.reactionCounts && message.reactionCounts[r.key] ? message.reactionCounts[r.key] : 0;
            const btn = document.createElement('button');
            btn.className = 'reaction-btn';
            if (message.userReactions && message.userReactions.includes(r.key)) {
                btn.classList.add('reacted');
            }
            btn.dataset.reaction = r.key;
            btn.innerHTML = `${r.label} <span class="reaction-count">${count}</span>`;
            btn.addEventListener('click', async () => {
                // Determine toggle (if user had reacted and is logged in) -> send remove flag
                const isActive = btn.classList.contains('reacted');
                const payload = { type: r.key };
                if (isActive) payload.remove = true;
                try {
                    const res = await fetch(`/api/public-messages/${message.id}/react`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (data.success) {
                        reactionMeta.forEach(r2 => {
                            const btn2 = bar.querySelector(`button[data-reaction="${r2.key}"]`);
                            const newCount = data.reactionCounts[r2.key] || 0;
                            btn2.querySelector('.reaction-count').textContent = newCount;
                            if (data.userReactions && data.userReactions.includes(r2.key)) btn2.classList.add('reacted'); else btn2.classList.remove('reacted');
                        });
                    }
                } catch (err) {
                    console.error('Reaction failed', err);
                }
            });
            bar.appendChild(btn);
        });
        return bar;
    }

    function renderMessages(messages) {
        messagesList.innerHTML = '';
        if (!messages.length) {
            showNoMessages(true);
            return;
        }
        showNoMessages(false);
        messages.forEach(msg => {
            const card = document.createElement('div');
            card.className = 'message-card';
            const mood = msg.mood || '';
            const emoji = moodEmojis[mood] || '';
            const header = document.createElement('div');
            header.className = 'message-header';
            header.innerHTML = `
                <span class="message-name">${escapeHtml(msg.name || 'Anonymous')}</span>
                <span class="message-mood">${emoji} ${escapeHtml(mood)}</span>
                <span class="message-date">${msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</span>
            `;
            const text = document.createElement('div');
            text.className = 'message-text';
            text.textContent = msg.message;
            const reactionsBar = buildReactionBar(msg);

            // Comments section
            const commentsSection = document.createElement('div');
            commentsSection.className = 'comments-section';
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-comments-btn';
            toggleBtn.textContent = `Show Comments (${msg.commentCount || 0})`;
            const commentsContainer = document.createElement('div');
            commentsContainer.className = 'comments-container hidden';
            const form = document.createElement('form');
            form.className = 'add-comment-form hidden';
            form.innerHTML = `
                <textarea class="comment-input" maxlength="500" placeholder="Add a comment..."></textarea>
                <label class="anon-label"><input type="checkbox" class="comment-anon-checkbox" checked> Post anonymously</label>
                <button type="submit" class="submit-comment-btn">Post</button>
            `;

            let loaded = false;
            toggleBtn.addEventListener('click', async () => {
                const hidden = commentsContainer.classList.contains('hidden');
                if (hidden && !loaded) {
                    await fetchComments(msg.id, commentsContainer, toggleBtn, form);
                    loaded = true;
                }
                commentsContainer.classList.toggle('hidden');
                form.classList.toggle('hidden');
                if (!hidden) {
                    // Closing
                    const count = commentsContainer.querySelectorAll('.comment-item').length;
                    toggleBtn.textContent = `Show Comments (${count})`;
                }
            });

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const textarea = form.querySelector('.comment-input');
                const anonCb = form.querySelector('.comment-anon-checkbox');
                const value = textarea.value.trim();
                if (!value) return;
                try {
                    const res = await fetch(`/api/public-messages/${msg.id}/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ comment: value, anonymous: anonCb.checked })
                    });
                    const data = await res.json();
                    if (data.success) {
                        const c = data.comment;
                        const item = document.createElement('div');
                        item.className = 'comment-item';
                        item.innerHTML = `<span class="comment-author">${escapeHtml(c.displayName)}</span>: <span class="comment-text">${escapeHtml(c.comment)}</span>`;
                        commentsContainer.appendChild(item);
                        textarea.value = '';
                        // Update button count
                        const count = commentsContainer.querySelectorAll('.comment-item').length;
                        toggleBtn.textContent = `Hide Comments (${count})`;
                    }
                } catch (err) {
                    console.error('Add comment failed', err);
                }
            });

            commentsSection.appendChild(toggleBtn);
            commentsSection.appendChild(commentsContainer);
            commentsSection.appendChild(form);

            card.appendChild(header);
            card.appendChild(text);
            card.appendChild(reactionsBar);
            card.appendChild(commentsSection);
            messagesList.appendChild(card);
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
