// js/forgot-password.js
import { supabase } from '../supabase-client.js'; // Adjust path if needed
import { updateHeaderAuthState } from '../auth.js'; // Assuming auth.js is in parent directory or adjust path

const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const forgotPasswordEmailInput = document.getElementById('forgotPasswordEmail');
const forgotPasswordMessageEl = document.getElementById('forgotPasswordMessage');
const forgotPasswordSubmitBtn = forgotPasswordForm.querySelector('button[type="submit"]');

forgotPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    forgotPasswordMessageEl.textContent = '';
    forgotPasswordMessageEl.className = 'form-message';
    forgotPasswordSubmitBtn.disabled = true;
    forgotPasswordSubmitBtn.textContent = 'Sending...';

    const email = forgotPasswordEmailInput.value;

    try {
        // Use Supabase to send the password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            // IMPORTANT: Configure this redirect URL in Supabase Project Settings -> Authentication -> Email Templates -> Password Reset
            // It must be a URL that your frontend can handle to process the reset link.
            // For example, it could point to a page like '/reset-password' or '/auth/callback?type=password_reset'
            // Ensure this URL is reachable and your app is set up to capture the confirmation/reset token.
            redirectTo: `${window.location.origin}/reset-password.html` // Assuming you'll have a reset-password.html page
        });

        if (error) {
            console.error("Password reset error:", error);
            // Display specific error messages if available
            if (error.message === "Invalid email provided") {
                forgotPasswordMessageEl.textContent = 'Please enter a valid email address.';
            } else if (error.message === "Rate limited") {
                forgotPasswordMessageEl.textContent = 'You have tried too many times. Please try again later.';
            } else if (error.message === "User not found") {
                forgotPasswordMessageEl.textContent = 'If this email address is registered, you will receive a reset link.';
                forgotPasswordMessageEl.className = 'form-message success visible'; // Show success to avoid revealing if email exists
            } else {
                forgotPasswordMessageEl.textContent = `Error: ${error.message}`;
            }
            forgotPasswordMessageEl.className = 'form-message error visible';
        } else {
            forgotPasswordMessageEl.textContent = `If an account with email "${email}" exists, you will receive a password reset link shortly. Please check your inbox and spam folder.`;
            forgotPasswordMessageEl.className = 'form-message success visible';
            forgotPasswordForm.reset(); // Clear the email input
        }
    } catch (error) {
        console.error("Password reset unexpected error:", error);
        forgotPasswordMessageEl.textContent = `An unexpected error occurred: ${error.message}`;
        forgotPasswordMessageEl.className = 'form-message error visible';
    } finally {
        forgotPasswordSubmitBtn.disabled = false;
        forgotPasswordSubmitBtn.textContent = 'Send Reset Link';
    }
});

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await updateHeaderAuthState(); // Ensure the header nav is correctly updated

    // Optional: If the user is already logged in, redirect them away from the forgot password page
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'index.html';
    }
});

const form = document.getElementById('resetForm')
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('email').value
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://127.0.0.1:5500//reset-password'
  })
  if (error) console.error('Error:', error.message)
  else alert('Check your email for reset instructions')
})
