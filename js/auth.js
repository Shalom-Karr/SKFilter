import { supabase } from './supabase-client.js';

export async function updateHeaderAuthState() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;

    // Helper function to determine if a nav link should be 'active'
    function isCurrentPage(path) {
        // Handle root/index.html correctly
        if (path === 'index.html' && (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html'))) {
            return true;
        }
        return window.location.pathname.endsWith(path);
    }

    // Clear existing navigation before building
    nav.innerHTML = ''; 
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // --- LOGGED-IN USER NAVIGATION ---
        let navHTML = `
            <a href="index.html" class="${isCurrentPage('index.html') ? 'active' : ''}">My Groups</a>
            <a href="profile.html" class="${isCurrentPage('profile.html') ? 'active' : ''}">My Profile</a>
            <a href="#" id="logoutLink">Logout</a>
        `;
        
        nav.innerHTML = navHTML;
        
        // Add event listener for logout
        document.getElementById('logoutLink').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'login.html'; // Redirect to login after logout
        });

    } else {
        // --- LOGGED-OUT USER NAVIGATION ---
        nav.innerHTML = `
            <a href="index.html" class="${isCurrentPage('index.html') ? 'active' : ''}">Home</a>
            <a href="login.html" class="${isCurrentPage('login.html') ? 'active' : ''}">Login</a>
            <a href="signup.html" class="${isCurrentPage('signup.html') ? 'active' : ''}">Sign Up</a>
        `;
    }
}

// Initial call to update header state when the DOM content is loaded
document.addEventListener('DOMContentLoaded', updateHeaderAuthState);

// Listen for authentication state changes and update header if needed
supabase.auth.onAuthStateChange(() => {
    updateHeaderAuthState();
});