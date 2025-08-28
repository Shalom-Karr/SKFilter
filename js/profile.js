import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const profileForm = document.getElementById('profileForm');
    const messageEl = document.getElementById('profileMessage');
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    const emailInput = document.getElementById('email');
    const fullNameInput = document.getElementById('fullName');
    const phoneInput = document.getElementById('phoneNumber');

    // Display the user's email
    emailInput.value = session.user.email;

    // Fetch and display existing profile data
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, phone_number')
        .eq('id', session.user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is ok
        console.error('Error fetching profile:', error);
        messageEl.textContent = 'Error loading your profile data.';
        messageEl.className = 'form-message error visible';
    }

    if (profile) {
        fullNameInput.value = profile.full_name || '';
        phoneInput.value = profile.phone_number || '';
    }

    // Handle form submission
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        messageEl.className = 'form-message';
        messageEl.textContent = '';

        const updates = {
            id: session.user.id,
            full_name: fullNameInput.value,
            phone_number: phoneInput.value,
            updated_at: new Date()
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) {
            console.error('Error updating profile:', updateError);
            messageEl.textContent = `Error: ${updateError.message}`;
            messageEl.className = 'form-message error visible';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save and Continue';
        } else {
            messageEl.textContent = 'Profile saved successfully! Redirecting to dashboard...';
            messageEl.className = 'form-message success visible';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    });
});