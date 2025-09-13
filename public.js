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
    let isShen = false;

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
            btn.setAttribute('type', 'button');
            btn.setAttribute('aria-label', `${r.key} reaction, count ${count}`);
            btn.setAttribute('aria-pressed', btn.classList.contains('reacted') ? 'true' : 'false');
            btn.setAttribute('role', 'button');
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
                            const active = data.userReactions && data.userReactions.includes(r2.key);
                            btn2.classList.toggle('reacted', active);
                            btn2.setAttribute('aria-pressed', active ? 'true' : 'false');
                            btn2.setAttribute('aria-label', `${r2.key} reaction, count ${newCount}${active ? ', active' : ''}`);
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

            // SHEN-only controls
            let shenControls = null;
            if (isShen) {
                shenControls = document.createElement('div');
                shenControls.className = 'shen-controls';
                // Reveal poster info
                if (msg._posterInfo && (msg._posterInfo.name || msg._posterInfo.gmail)) {
                    const revealBtn = document.createElement('button');
                    revealBtn.className = 'shen-reveal-btn';
                    revealBtn.type = 'button';
                    revealBtn.textContent = '👁 Reveal Poster';
                    let revealed = false;
                    const infoDiv = document.createElement('span');
                    infoDiv.className = 'shen-poster-info';
                    revealBtn.addEventListener('click', () => {
                        revealed = !revealed;
                        if (revealed) {
                            infoDiv.textContent = `Name: ${msg._posterInfo.name || 'N/A'}`;
                            revealBtn.textContent = '🙈 Hide Poster';
                        } else {
                            infoDiv.textContent = '';
                            revealBtn.textContent = '👁 Reveal Poster';
                        }
                    });
                    shenControls.appendChild(revealBtn);
                    shenControls.appendChild(infoDiv);
                }
                // Delete button
                const delBtn = document.createElement('button');
                delBtn.className = 'shen-delete-btn';
                delBtn.type = 'button';
                delBtn.textContent = '🗑 Delete';
                delBtn.addEventListener('click', async () => {
                    if (!confirm('Delete this public message?')) return;
                    try {
                        const res = await fetch(`/api/public-messages/${msg.id}`, { method: 'DELETE' });
                        const data = await res.json();
                        if (data.success) {
                            card.remove();
                        } else {
                            alert(data.error || 'Delete failed');
                        }
                    } catch (err) {
                        alert('Delete failed');
                    }
                });
                shenControls.appendChild(delBtn);
            }

            // Comments section
            const commentsSection = document.createElement('div');
            commentsSection.className = 'comments-section';
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-comments-btn';
            toggleBtn.textContent = `Show Comments (${msg.commentCount || 0})`;
            toggleBtn.setAttribute('type', 'button');
            toggleBtn.setAttribute('aria-expanded', 'false');
            toggleBtn.setAttribute('aria-controls', `comments-for-${msg.id}`);
            const commentsContainer = document.createElement('div');
            commentsContainer.className = 'comments-container hidden';
            commentsContainer.id = `comments-for-${msg.id}`;
            const form = document.createElement('form');
            form.className = 'add-comment-form hidden';
            form.innerHTML = `
                <textarea class="comment-input" maxlength="500" placeholder="Add a comment..."></textarea>
                <label class="anon-label"><input type="checkbox" class="comment-anon-checkbox" checked> Post anonymously</label>
                <button type="submit" class="submit-comment-btn">Post</button>
            `;
            const addCommentToggle = document.createElement('button');
            addCommentToggle.type = 'button';
            addCommentToggle.className = 'add-comment-toggle-btn';
            addCommentToggle.textContent = 'Add Comment';
            addCommentToggle.setAttribute('aria-expanded', 'false');
            addCommentToggle.addEventListener('click', () => {
                const hidden = form.classList.contains('hidden');
                form.classList.toggle('hidden');
                addCommentToggle.setAttribute('aria-expanded', hidden ? 'true' : 'false');
                addCommentToggle.textContent = hidden ? 'Hide Comment Form' : 'Add Comment';
                if (hidden) {
                    form.querySelector('.comment-input').focus();
                }
            });

            let loaded = false;
            toggleBtn.addEventListener('click', async () => {
                const hidden = commentsContainer.classList.contains('hidden');
                if (hidden && !loaded) {
                    await fetchComments(msg.id, commentsContainer, toggleBtn, form);
                    loaded = true;
                }
                commentsContainer.classList.toggle('hidden');
                const expanded = !commentsContainer.classList.contains('hidden');
                toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
                if (!hidden) {
                    // Closing
                    const count = commentsContainer.querySelectorAll('.comment-item').length;
                    toggleBtn.textContent = `Show Comments (${count})`;
                } else {
                    const count = commentsContainer.querySelectorAll('.comment-item').length;
                    toggleBtn.textContent = `Hide Comments (${count})`;
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
            commentsSection.appendChild(addCommentToggle);
            commentsSection.appendChild(form);

            card.appendChild(header);
            card.appendChild(text);
            if (shenControls) card.appendChild(shenControls);
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
                // If any message has _posterInfo, SHEN is logged in
                isShen = Array.isArray(data) && data.some(m => m && typeof m === 'object' && '_posterInfo' in m);
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
