document.addEventListener('DOMContentLoaded', () => {
    const tabSignin = document.getElementById('tab-signin');
    const tabSignup = document.getElementById('tab-signup');
    const signinForm = document.getElementById('signinForm');
    const signupForm = document.getElementById('signupForm');
    const signinError = document.getElementById('signinError');
    const signupError = document.getElementById('signupError');
    const signupSuccess = document.getElementById('signupSuccess');

    // Tab switching
    tabSignin.onclick = () => {
        tabSignin.classList.add('active');
        tabSignup.classList.remove('active');
        signinForm.style.display = '';
        signupForm.style.display = 'none';
        signinError.textContent = '';
        signupError.textContent = '';
        signupSuccess.textContent = '';
    };
    tabSignup.onclick = () => {
        tabSignup.classList.add('active');
        tabSignin.classList.remove('active');
        signinForm.style.display = 'none';
        signupForm.style.display = '';
        signinError.textContent = '';
        signupError.textContent = '';
        signupSuccess.textContent = '';
    };

    // Sign In
    signinForm.onsubmit = async (e) => {
        e.preventDefault();
        signinError.textContent = '';
        const username = document.getElementById('signinUsername').value.trim();
        const password = document.getElementById('signinPassword').value;
        try {
            const res = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                window.location.href = 'index.html';
            } else {
                signinError.textContent = data.error || 'Sign in failed';
            }
        } catch {
            signinError.textContent = 'Network error';
        }
    };

    // Sign Up
    signupForm.onsubmit = async (e) => {
        e.preventDefault();
        signupError.textContent = '';
        signupSuccess.textContent = '';
        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value;
        const gmail = document.getElementById('signupGmail').value.trim();
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, gmail })
            });
            const data = await res.json();
            if (data.success) {
                signupSuccess.textContent = 'Account created! You can now sign in.';
                setTimeout(() => {
                    tabSignin.click();
                }, 1200);
            } else {
                signupError.textContent = data.error || 'Sign up failed';
            }
        } catch {
            signupError.textContent = 'Network error';
        }
    };
});