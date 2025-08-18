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
			moodInput.value = btn.dataset.mood || 'Happy';
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
});

// Submit to Formspree
async function submitToFormspree(payload) {
	// Replace 'YOUR_FORM_ID' with your actual Formspree form ID
	const formData = new FormData();
	formData.append('message', payload.message);
	formData.append('name', payload.name);
	formData.append('mood', payload.mood);

	const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
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

// Confetti
function createConfetti() {
	const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
	for (let i = 0; i < 60; i++) {
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

// Inline keyframes for toasts + confetti
const style = document.createElement('style');
style.textContent = `
	@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
	@keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
	@keyframes confettiFall { to { transform: translateY(100vh) rotate(720deg); } }
`;
document.head.appendChild(style);
