import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const connectPrompt = document.getElementById('connect-prompt');
    const formContainer = document.getElementById('form-container');
    const groupSelectorEl = document.getElementById('groupSelector');
    const loadingGroupsText = document.getElementById('loading-groups-text');
    const userTokenInput = document.getElementById('userToken');

    // Initialize Choices.js for multi-select functionality
    const groupChoices = new Choices(groupSelectorEl, {
        removeItemButton: true, // Allow users to remove selected groups
        searchPlaceholderValue: 'Type to search for groups...',
        shouldSort: false,
    });

    const oauthToken = localStorage.getItem('groupme_access_token');

    if (!oauthToken) {
        connectPrompt.style.display = 'block';
    } else {
        formContainer.style.display = 'block';
        userTokenInput.value = oauthToken;

        try {
            // Fetch and populate groups (logic is the same as before)
            groupChoices.disable();
            groupChoices.setChoices([{ value: '', label: 'Loading...', disabled: true, selected: false }]);
            
            const response = await fetch('/api/get-groups', {
                method: 'POST',
                body: JSON.stringify({ accessToken: oauthToken })
            });
            const groups = await response.json();
            if (!response.ok) throw new Error(groups.error || 'Failed to fetch groups.');

            loadingGroupsText.style.display = 'none';
            groupChoices.clearStore();

            if (groups.length === 0) {
                groupChoices.setChoices([{ value: '', label: 'No manageable groups found.', disabled: true }]);
            } else {
                const choicesData = groups.map(group => ({
                    value: group.id,
                    label: group.name,
                }));
                groupChoices.setChoices(choicesData, 'value', 'label', false);
                groupChoices.enable();
            }
        } catch (error) {
            console.error(error);
            loadingGroupsText.textContent = `Error: ${error.message}`;
        }
    }

    const addGroupForm = document.getElementById('addGroupForm');
    const submitBtn = addGroupForm.querySelector('button[type="submit"]');
    const messageEl = document.getElementById('formMessage');

    // --- NEW BATCH PROCESSING SUBMIT LOGIC ---
    addGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const selectedGroups = groupChoices.getValue(true); // Get selected items as objects {value, label}
        if (selectedGroups.length === 0) {
            alert('Please select at least one group from the dropdown.');
            return;
        }

        submitBtn.disabled = true;
        let successfulCreations = 0;
        
        for (let i = 0; i < selectedGroups.length; i++) {
            const group = selectedGroups[i];
            messageEl.textContent = `Processing group ${i + 1} of ${selectedGroups.length}: "${group.label}"...`;
            messageEl.className = 'form-message visible';

            try {
                // Step 1: Create the bot for the current group in the loop
                const createBotResponse = await fetch('/api/create-bot', {
                    method: 'POST',
                    body: JSON.stringify({
                        accessToken: userTokenInput.value,
                        groupId: group.value
                    })
                });
                const botData = await createBotResponse.json();
                if (!createBotResponse.ok) throw new Error(botData.error || `Failed to create bot for ${group.label}.`);
                
                // Step 2: Save the configuration to Supabase
                const configData = {
                    owner_user_id: session.user.id,
                    group_name: group.label,
                    group_id: group.value,
                    bot_id: botData.bot_id,
                    groupme_user_token: userTokenInput.value,
                };
                const { error: insertError } = await supabase.from('group_configs').insert([configData]);
                if (insertError) throw insertError;
                
                successfulCreations++;

            } catch (error) {
                // If any step fails, stop the process and report the error
                console.error('Error during batch setup:', error);
                messageEl.textContent = `Error processing "${group.label}": ${error.message}. Please try again.`;
                messageEl.className = 'form-message error visible';
                submitBtn.disabled = false;
                return; // Exit the function entirely
            }
        }

        // If the loop completes without errors
        messageEl.textContent = `Success! ${successfulCreations} filter(s) created. Redirecting to dashboard...`;
        messageEl.className = 'form-message success visible';
        localStorage.removeItem('groupme_access_token');
        setTimeout(() => { window.location.href = 'index.html'; }, 3000);
    });
});