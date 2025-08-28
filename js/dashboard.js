import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    const mainDashboardContent = document.getElementById('mainDashboardContent');
    const profilePrompt = document.getElementById('profileCompletionPrompt');
    const groupsList = document.getElementById('groups-list');
    const loadingEl = document.getElementById('loading-groups');
    const errorEl = document.getElementById('groups-error');

    // --- NEW: CHECK IF PROFILE IS COMPLETE ---
    async function checkProfileCompletion() {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', session.user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
            // Allow access but log the error
            return true; 
        }

        // If the profile doesn't exist or the full_name is empty/null
        if (!profile || !profile.full_name || profile.full_name.trim() === '') {
            // Profile is incomplete: show the prompt and hide the dashboard
            mainDashboardContent.style.display = 'none';
            profilePrompt.style.display = 'block';
            return false; // Indicates profile is not complete
        } else {
            // Profile is complete: hide the prompt and show the dashboard
            mainDashboardContent.style.display = 'block';
            profilePrompt.style.display = 'none';
            return true; // Indicates profile is complete
        }
    }

    // --- UPDATED: Main execution flow ---
    const isProfileComplete = await checkProfileCompletion();

    // Only load the groups if the profile is complete
    if (isProfileComplete) {
        loadGroups();
    }


    async function loadGroups() {
        loadingEl.style.display = 'block';
        groupsList.innerHTML = '';
        errorEl.textContent = '';

        const { data: groups, error } = await supabase
            .from('group_configs')
            .select('*')
            .eq('owner_user_id', session.user.id);

        loadingEl.style.display = 'none';

        if (error) {
            console.error('Error fetching groups:', error);
            errorEl.textContent = 'Could not load your group configurations. Please try again later.';
            return;
        }

        if (groups.length === 0) {
            groupsList.innerHTML = '<p>You haven\'t configured any groups yet. Click "Add New Group Filter" to get started.</p>';
        } else {
            groups.forEach(group => {
                const groupCard = document.createElement('div');
                groupCard.className = 'card group-card';
                groupCard.innerHTML = `
                    <h3>${group.group_name}</h3>
                    <p><strong>Group ID:</strong> ${group.group_id}</p>
                    <p><strong>Status:</strong> <span class="${group.is_active ? 'status-active' : 'status-inactive'}">${group.is_active ? 'Active' : 'Inactive'}</span></p>
                    <button class="button-danger delete-btn" data-id="${group.id}">Delete</button>
                `;
                groupsList.appendChild(groupCard);
            });
        }
    }

    // Handle delete button clicks
    groupsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const groupId = e.target.dataset.id;
            const confirmed = confirm('Are you sure you want to delete this group configuration? This cannot be undone.');

            if (confirmed) {
                const { error } = await supabase
                    .from('group_configs')
                    .delete()
                    .eq('id', groupId);

                if (error) {
                    console.error('Error deleting group:', error);
                    alert('Failed to delete group configuration.');
                } else {
                    loadGroups();
                }
            }
        }
    });
});