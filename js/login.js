import { supabase } from './supabase-client.js';
import { updateHeaderAuthState } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    await updateHeaderAuthState();

    const loginForm = document.getElementById('loginForm');
    const messageEl = document.getElementById('authMessage');
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    // Redirect if user is already logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
        return; // Stop further execution
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        messageEl.textContent = '';
        messageEl.className = 'form-message';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        const email = loginForm.email.value;
        const password = loginForm.password.value;

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                messageEl.textContent = `Error: ${error.message}`;
                messageEl.className = 'form-message error visible';
            } else {
                // On successful login, redirect to the main ordering page
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error("Login error:", error);
            messageEl.textContent = `An unexpected error occurred.`;
            messageEl.className = 'form-message error visible';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
});