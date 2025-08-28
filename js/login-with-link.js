// login-with-link.js
import { supabase } from './supabase-client.js';

// --- DOM ELEMENTS ---
const magicLinkForm = document.getElementById('magicLinkFormForm');
const magicLinkEmailInput = document.getElementById('magicLinkEmail');
const magicLinkFormMessageEl = document.getElementById('magicLinkFormMessage');
const magicLinkSubmitBtn = magicLinkForm.querySelector('button[type="submit"]');

// --- EVENT LISTENERS ---

// Magic Link (Passwordless Email Login) Form
magicLinkForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    magicLinkFormMessageEl.textContent = '';
    magicLinkFormMessageEl.className = 'form-message';
    magicLinkSubmitBtn.disabled = true;
    magicLinkSubmitBtn.textContent = 'Sending...';

    const email = magicLinkEmailInput.value;

    try {
        // Send magic link email with a specified redirect URL on successful login
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { redirectTo: window.location.origin + '/index.html' } // Update this path to your desired post-login page
        });

        if (error) {
            magicLinkFormMessageEl.textContent = `Error: ${error.message}`;
            magicLinkFormMessageEl.className = 'form-message error visible';
        } else {
            magicLinkFormMessageEl.textContent = 'Magic link sent! Please check your email to log in.';
            magicLinkFormMessageEl.className = 'form-message success visible';
        }
    } catch (error) {
        console.error("Magic link error:", error);
        magicLinkFormMessageEl.textContent = `An unexpected error occurred: ${error.message}`;
        magicLinkFormMessageEl.className = 'form-message error visible';
    } finally {
        magicLinkSubmitBtn.disabled = false;
        magicLinkSubmitBtn.textContent = 'Send Link';
    }
});