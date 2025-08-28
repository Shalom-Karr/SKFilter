import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for Supabase session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const connectPrompt = document.getElementById('connect-prompt');
    const formContainer = document.getElementById('form-container');
    const groupSelector = document.getElementById('groupSelector');
    const loadingGroupsText = document.getElementById('loading-groups-text');
    
    const groupNameInput = document.getElementById('groupName');
    const groupIdInput = document.getElementById('groupId');
    const userTokenInput = document.getElementById('userToken');

    const oauthToken = localStorage.getItem('groupme_access_token');

    if (!oauthToken) {
        connectPrompt.style.display = 'block';
    } else {
        formContainer.style.display = 'block';
        userTokenInput.value = oauthToken;

        try {
            const response = await fetch('/api/get-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: oauthToken })
            });

            const groups = await response.json();
            if (!response.ok) throw new Error(groups.error || 'Failed to fetch groups.');

            loadingGroupsText.style.display = 'none';
            groupSelector.style.display = 'block';
            
            if (groups.length === 0) {
                groupSelector.innerHTML = '<option disabled selected>No manageable groups found.</option>';
            } else {
                groupSelector.innerHTML = '<option value="" disabled selected>-- Select a Group --</option>';
                groups.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.id;
                    option.textContent = group.name;
                    option.dataset.name = group.name;
                    groupSelector.appendChild(option);
                });
            }
        } catch (error) {
            console.error(error);
            loadingGroupsText.textContent = `Error: ${error.message}`;
            loadingGroupsText.style.color = 'red';
        }
    }

    groupSelector.addEventListener('change', () => {
        const selectedOption = groupSelector.options[groupSelector.selectedIndex];
        groupIdInput.value = selectedOption.value;
        groupNameInput.value = selectedOption.dataset.name;
    });

    const addGroupForm = document.getElementById('addGroupForm');
    const submitBtn = addGroupForm.querySelector('button[type="submit"]');
    const messageEl = document.getElementById('formMessage');

    addGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const selectedGroupId = groupIdInput.value;
        if (!selectedGroupId) {
            alert('Please select a group from the dropdown.');
            return;
        }

        submitBtn.disabled = true;
        messageEl.className = 'form-message';
        
        try {
            // --- STEP 1: Create the bot via our Netlify Function ---
            messageEl.textContent = 'Creating GroupMe bot...';
            messageEl.className = 'form-message visible';
            
            const createBotResponse = await fetch('/api/create-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessToken: userTokenInput.value,
                    groupId: selectedGroupId
                })
            });
            const botData = await createBotResponse.json();
            if (!createBotResponse.ok) throw new Error(botData.error || 'Failed to create bot.');

            const newBotId = botData.bot_id;

            // --- STEP 2: Save the complete configuration to Supabase ---
            messageEl.textContent = 'Bot created! Saving configuration...';
            
            const configData = {
                owner_user_id: session.user.id,
                group_name: groupNameInput.value,
                group_id: selectedGroupId,
                bot_id: newBotId,
                groupme_user_token: userTokenInput.value,
            };

            const { error: insertError } = await supabase.from('group_configs').insert([configData]);
            if (insertError) throw insertError;

            // --- SUCCESS ---
            messageEl.textContent = 'Success! Your filter is active. Redirecting to dashboard...';
            messageEl.className = 'form-message success visible';
            localStorage.removeItem('groupme_access_token');
            setTimeout(() => { window.location.href = 'index.html'; }, 3000);

        } catch (error) {
            console.error('Error during setup:', error);
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.className = 'form-message error visible';
            submitBtn.disabled = false;
        }
    });
});