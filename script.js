document.addEventListener('DOMContentLoaded', () => {
	const MAX_LEN = 1000;

	const thoughtForm = document.getElementById('thoughtForm');
	const thoughtInput = document.getElementById('thoughtInput');
	const charCount = document.getElementById('charCount');
	const successMessage = document.getElementById('successMessage');
	const newThoughtBtn = document.getElementById('newThoughtBtn');
	const anonToggle = document.getElementById('anonToggle');
	const nameInput = document.getElementById('nameInput');
	const moodButtons = Array.from(document.querySelectorAll('.mood'));
	const moodInput = document.getElementById('moodInput');
	const randomPromptBtn = document.getElementById('randomPrompt');
	const promptChips = Array.from(document.querySelectorAll('.chip[data-prompt]'));
	const vibeFill = document.getElementById('vibeFill');
	const preview = document.getElementById('preview');
	const previewText = document.getElementById('previewText');
	const vibeEmoji = document.getElementById('vibeEmoji');
	const faces = vibeEmoji ? Array.from(vibeEmoji.querySelectorAll('.face')) : [];
	
	// Theme toggle
	const themeToggle = document.getElementById('themeToggle');
	const themeIcon = document.getElementById('themeIcon');
	
	// Mood emojis
	const moodEmojis = document.getElementById('moodEmojis');
	const allMoodEmojis = Array.from(moodEmojis.querySelectorAll('.mood-emoji'));

	let isSubmitting = false;

	// Prompts
	const prompts = [
		'Today I learned...',
		'A question I have is...',
		'A win I’m proud of...',
		'I’m stuck on...',
		'A shoutout to... for...',
		'Something funny that happened...',
		'What I’m excited about...',
		'What’s confusing me is...',
	];

	// Ensure maxlength
	if (thoughtInput && !thoughtInput.maxLength) {
		thoughtInput.maxLength = MAX_LEN;
	}

	// Theme toggle functionality
	function initTheme() {
		const savedTheme = localStorage.getItem('theme') || 'light';
		document.body.classList.toggle('dark-mode', savedTheme === 'dark');
		updateThemeIcon(savedTheme === 'dark');
	}
	
	function toggleTheme() {
		const isDark = document.body.classList.toggle('dark-mode');
		localStorage.setItem('theme', isDark ? 'dark' : 'light');
		updateThemeIcon(isDark);
	}
	
	function updateThemeIcon(isDark) {
		themeIcon.className = isDark ? 'fas fa-sun icon' : 'fas fa-moon icon';
	}
	
	// Initialize theme
	initTheme();
	themeToggle.addEventListener('click', toggleTheme);

	// Anonymous toggle
	function applyAnonState() {
		const anon = anonToggle.checked;
		nameInput.disabled = anon;
		nameInput.classList.toggle('disabled', anon);
		if (anon) nameInput.value = '';
	}
	anonToggle.addEventListener('change', applyAnonState);
	applyAnonState();

	// Mood picker
	moodButtons.forEach(btn => {
		btn.addEventListener('click', () => {
			moodButtons.forEach(b => {
				b.classList.remove('active');
				b.setAttribute('aria-pressed', 'false');
			});
			btn.classList.add('active');
			btn.setAttribute('aria-pressed', 'true');
			const mood = btn.dataset.mood || 'Happy';
			moodInput.value = mood;
			applyMoodTheme(mood);
		});
	});

	// Prompt chips
	promptChips.forEach(chip => {
		chip.addEventListener('click', () => {
			const text = chip.dataset.prompt || '';
			if (!text) return;
			insertPrompt(text);
		});
	});

	// Random prompt
	if (randomPromptBtn) {
		randomPromptBtn.addEventListener('click', () => {
			const text = prompts[Math.floor(Math.random() * prompts.length)];
			insertPrompt(text);
			bounce(randomPromptBtn);
		});
	}

	function insertPrompt(text) {
		if (!thoughtInput.value) {
			thoughtInput.value = text + ' ';
		} else {
			if (!thoughtInput.value.endsWith(' ')) thoughtInput.value += ' ';
			thoughtInput.value += text + ' ';
		}
		updateCharCount();
		updateVibe();
		updatePreview();
		thoughtInput.focus();
	}

	// Character counter + vibe + preview
	function updateCharCount() {
		const currentLength = thoughtInput.value.length;
		charCount.textContent = currentLength;
		if (currentLength > MAX_LEN * 0.9) {
			charCount.style.color = '#dc3545';
		} else if (currentLength > MAX_LEN * 0.6) {
			charCount.style.color = '#eab308';
		} else {
			charCount.style.color = '#6b7280';
		}
	}
	function updateVibe() {
		const len = Math.min(MAX_LEN, thoughtInput.value.length);
		const pct = Math.round((len / MAX_LEN) * 100);
		vibeFill.style.width = pct + '%';
		// emoji gauge: 0..5 faces
		const count = Math.max(0, Math.min(5, Math.round(pct / 20)));
		if (faces && faces.length) {
			faces.forEach((f, idx) => f.classList.toggle('active', idx < count));
		}
	}
	function updatePreview() {
		const text = thoughtInput.value.trim();
		if (text) {
			preview.classList.add('active');
			preview.setAttribute('aria-hidden', 'false');
			previewText.textContent = text;
		} else {
			preview.classList.remove('active');
			preview.setAttribute('aria-hidden', 'true');
			previewText.textContent = '';
		}
	}

	thoughtInput.addEventListener('input', () => {
		updateCharCount();
		updateVibe();
		updatePreview();
		// playful pulse
		thoughtInput.style.transform = 'scale(1.01)';
		setTimeout(() => { thoughtInput.style.transform = ''; }, 120);
	});

	// Form submission
	thoughtForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (isSubmitting) return;

		const message = (thoughtInput.value || '').trim();
		if (!message) {
			showError('Please share something! 💭');
			return;
		}

		isSubmitting = true;
		const submitBtn = thoughtForm.querySelector('.send-button');
		const originalText = submitBtn.innerHTML;

		// rocket launch + small confetti burst
		submitBtn.classList.add('launching');
		createConfetti(30);

		submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
		submitBtn.disabled = true;

		try {
			await submitToFormspree({
				message,
				name: anonToggle.checked ? 'Anonymous' : (nameInput.value || 'Anonymous'),
				mood: moodInput.value || 'Happy'
			});

			showSuccess();
			thoughtForm.reset();
			// Reset UI state
			applyAnonState();
			moodButtons.forEach((b, idx) => {
				b.classList.toggle('active', idx === 0);
				b.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');
			});
			moodInput.value = 'Happy';
			applyMoodTheme('Happy');
			charCount.textContent = '0';
			charCount.style.color = '#6b7280';
			vibeFill.style.width = '0%';
			updatePreview();
		} catch (err) {
			console.error(err);
			showError('Oops! Something went wrong. Please try again! 😅');
		} finally {
			isSubmitting = false;
			submitBtn.innerHTML = originalText;
			submitBtn.disabled = false;
			submitBtn.classList.remove('launching');
		}
	});

	// New thought button
	if (newThoughtBtn) {
		newThoughtBtn.addEventListener('click', () => {
			hideSuccess();
			thoughtInput.focus();
		});
	}

	// Helpers
	function bounce(el) {
		el.style.transform = 'scale(1.06)';
		setTimeout(() => { el.style.transform = ''; }, 120);
	}

	// Initial counts
	updateCharCount();
	updateVibe();
	updatePreview();
	applyMoodTheme('Happy');
	
	// Initialize mood emojis
	updateMoodEmojis('Happy');
	
	// Reposition mood emojis every 8 seconds for more dynamic feel
	setInterval(() => {
		const currentMood = moodInput.value || 'Happy';
		updateMoodEmojis(currentMood);
	}, 8000);
});

// Submit to Formspree
async function submitToFormspree(payload) {
	// Replace 'YOUR_FORM_ID' with your actual Formspree form ID
	const formData = new FormData();
	formData.append('message', payload.message);
	formData.append('name', payload.name);
	formData.append('mood', payload.mood);

	const response = await fetch('https://formspree.io/f/xnnzykwz', {
		method: 'POST',
		body: formData,
		headers: { 'Accept': 'application/json' }
	});

	if (!response.ok) {
		throw new Error('Network response was not ok');
	}
	return response.json();
}

// Success state
function showSuccess() {
	const thoughtForm = document.querySelector('.thought-form');
	const successMessage = document.getElementById('successMessage');

	thoughtForm.style.display = 'none';
	successMessage.classList.remove('hidden');
	createConfetti();
}
function hideSuccess() {
	const thoughtForm = document.querySelector('.thought-form');
	const successMessage = document.getElementById('successMessage');

	thoughtForm.style.display = 'flex';
	successMessage.classList.add('hidden');
}

// Error toast
function showError(message) {
	const errorDiv = document.createElement('div');
	errorDiv.className = 'error-message';
	errorDiv.innerHTML = `
		<i class="fas fa-exclamation-circle"></i>
		<span>${message}</span>
	`;
	errorDiv.style.cssText = `
		position: fixed;
		top: 20px;
		right: 20px;
		background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
		color: white;
		padding: 14px 18px;
		border-radius: 16px;
		box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
		z-index: 1000;
		animation: slideInRight 0.5s ease-out;
		font-family: 'Comic Neue', cursive, sans-serif;
		font-weight: 700;
		display: flex;
		align-items: center;
		gap: 10px;
		max-width: 320px;
	`;
	document.body.appendChild(errorDiv);
	setTimeout(() => {
		errorDiv.style.animation = 'slideOutRight 0.5s ease-out';
		setTimeout(() => { errorDiv.remove(); }, 480);
	}, 3600);
}

// Confetti (optional count)
function createConfetti(count = 60) {
	const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
	for (let i = 0; i < count; i++) {
		setTimeout(() => {
			const confetti = document.createElement('div');
			confetti.style.cssText = `
				position: fixed;
				width: 10px;
				height: 10px;
				background: ${colors[Math.floor(Math.random() * colors.length)]};
				top: -10px;
				left: ${Math.random() * 100}vw;
				border-radius: 50%;
				z-index: 1000;
				animation: confettiFall 2.8s linear forwards;
			`;
			document.body.appendChild(confetti);
			setTimeout(() => { confetti.remove(); }, 3000);
		}, i * 70);
	}
}

// Dynamic background colors per mood
function applyMoodTheme(mood) {
	const map = {
		'Happy': ['#FFD93D', '#FFB3D9'],
		'Stressed': ['#DDA0DD', '#E6E6FA'],
		'Excited': ['#FFB347', '#FFCC5C'],
		'In love': ['#FF69B4', '#FFB6C1'],
		'Curious': ['#87CEEB', '#98D8E8'],
		'Sad': ['#87CEEB', '#B0C4DE'],
		'Bored': ['#D3D3D3', '#F0F8FF'],
		'Fine': ['#90EE90', '#98FB98'],
	};
	const [c1, c2] = map[mood] || ['#667eea', '#764ba2'];
	const root = document.documentElement;
	root.style.setProperty('--bg1', c1);
	root.style.setProperty('--bg2', c2);
	
	// Update mood emojis
	updateMoodEmojis(mood);
}

// Update background emojis based on mood
function updateMoodEmojis(mood) {
	const allMoodEmojis = document.querySelectorAll('.mood-emoji');
	
	// Hide all emojis first with smooth transition
	allMoodEmojis.forEach(emoji => {
		emoji.classList.remove('active', 'float', 'drift', 'bounce', 'spin');
		emoji.classList.add('inactive');
	});
	
	// Show only the current mood emojis and position them randomly
	const currentMoodEmojis = document.querySelectorAll(`.mood-emoji[data-mood="${mood}"]`);
	
	// Create more varied positioning zones for increased emoji count
	const zones = [
		{ top: 5, left: 8, width: 18, height: 18 },     // Top-left
		{ top: 12, left: 75, width: 18, height: 18 },   // Top-right
		{ top: 20, left: 25, width: 20, height: 20 },   // Top-center
		{ top: 30, left: 5, width: 22, height: 22 },    // Upper-left
		{ top: 35, left: 70, width: 20, height: 20 },   // Upper-right
		{ top: 45, left: 15, width: 25, height: 25 },   // Middle-left
		{ top: 50, left: 55, width: 22, height: 22 },   // Middle-right
		{ top: 60, left: 35, width: 20, height: 20 },   // Lower-center
		{ top: 70, left: 10, width: 25, height: 25 },   // Bottom-left
		{ top: 75, left: 65, width: 20, height: 20 },   // Bottom-right
		{ top: 15, left: 45, width: 18, height: 18 },   // Upper-center
		{ top: 65, left: 45, width: 18, height: 18 }    // Bottom-center
	];
	
	// Animation types for variety
	const animationTypes = ['float', 'drift', 'bounce', 'spin'];
	
	currentMoodEmojis.forEach((emoji, index) => {
		// Use zones for better distribution, with some randomness within each zone
		const zone = zones[index % zones.length];
		const top = zone.top + Math.random() * zone.height;
		const left = zone.left + Math.random() * zone.width;
		const animationDelay = Math.random() * 4; // Random animation delay up to 4s
		const animationType = animationTypes[Math.floor(Math.random() * animationTypes.length)];
		
		// Apply positioning and animation
		emoji.style.top = `${top}%`;
		emoji.style.left = `${left}%`;
		emoji.style.animationDelay = `${animationDelay}s`;
		
		// Show the emoji with a slight delay for smooth transition
		setTimeout(() => {
			emoji.classList.remove('inactive');
			emoji.classList.add('active', animationType);
		}, index * 200);
	});
}

// Inline keyframes for toasts + confetti
const style = document.createElement('style');
style.textContent = `
	@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
	@keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
	@keyframes confettiFall { to { transform: translateY(100vh) rotate(720deg); } }
`;
document.head.appendChild(style);
