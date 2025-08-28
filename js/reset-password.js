// js/reset-password.js
import { supabase } from '../supabase-client.js'; // Adjust path if needed
import { updateHeaderAuthState } from '../auth.js'; // Assuming auth.js is in parent directory or adjust path

const resetPasswordForm = document.getElementById('resetPasswordForm');
const resetTokenInput = document.getElementById('resetToken');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const resetPasswordMessageEl = document.getElementById('resetPasswordMessage');
const resetPasswordSubmitBtn = resetPasswordForm.querySelector('button[type="submit"]');

async function initializeResetPage() {
    await updateHeaderAuthState(); // Ensure header is updated if user is somehow logged in

    // Extract the confirmation token from the URL
    // Supabase typically sends a URL like: YOUR_APP_URL/reset-password?type=password_reset&access_token=THE_TOKEN&expires_in=3600&refresh_token=YOUR_REFRESH_TOKEN
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token'); // This is the token for password reset

    if (!accessToken) {
        // If no token is found, the user likely landed here incorrectly
        resetPasswordMessageEl.textContent = 'Invalid or missing reset token. Please try requesting a reset again.';
        resetPasswordMessageEl.className = 'form-message error visible';
        resetPasswordSubmitBtn.disabled = true; // Disable form if token is missing
        return;
    }

    // Store the token in a hidden input or directly in the script's scope
    resetTokenInput.value = accessToken;
    console.log("Reset token found:", accessToken);
}

resetPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetPasswordMessageEl.textContent = '';
    resetPasswordMessageEl.className = 'form-message';
    resetPasswordSubmitBtn.disabled = true;
    resetPasswordSubmitBtn.textContent = 'Resetting...';

    const accessToken = resetTokenInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Basic password confirmation check
    if (newPassword !== confirmPassword) {
        resetPasswordMessageEl.textContent = 'Passwords do not match.';
        resetPasswordMessageEl.className = 'form-message error visible';
        resetPasswordSubmitBtn.disabled = false;
        resetPasswordSubmitBtn.textContent = 'Reset Password';
        return;
    }

    if (newPassword.length < 6) {
        resetPasswordMessageEl.textContent = 'Password must be at least 6 characters long.';
        resetPasswordMessageEl.className = 'form-message error visible';
        resetPasswordSubmitBtn.disabled = false;
        return;
    }

    try {
        // Use Supabase to update the password with the token
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        }, accessToken); // Pass the access_token directly here

        if (error) {
            console.error("Password reset error:", error);
            // Display specific error messages
            if (error.message === "Invalid token provided" || error.message === "Token is expired") {
                resetPasswordMessageEl.textContent = 'The password reset link is invalid or has expired. Please request a new one.';
            } else if (error.message === "Password should be at least 6 characters") {
                resetPasswordMessageEl.textContent = 'Password must be at least 6 characters.';
            }
            else {
                resetPasswordMessageEl.textContent = `Error: ${error.message}`;
            }
            resetPasswordMessageEl.className = 'form-message error visible';
        } else {
            resetPasswordMessageEl.textContent = 'Your password has been successfully reset! You can now login.';
            resetPasswordMessageEl.className = 'form-message success visible';
            // Optionally, redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }
    } catch (error) {
        console.error("Password reset unexpected error:", error);
        resetPasswordMessageEl.textContent = `An unexpected error occurred: ${error.message}`;
        resetPasswordMessageEl.className = 'form-message error visible';
    } finally {
        // Only re-enable if the password was NOT successfully reset (e.g., if redirecting)
        // If successful, it's better to keep it disabled or let the redirect happen.
        if (newPassword !== confirmPassword || newPassword.length < 6) { // If validation failed
             resetPasswordSubmitBtn.disabled = false;
             resetPasswordSubmitBtn.textContent = 'Reset Password';
        }
    }
});

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeResetPage);