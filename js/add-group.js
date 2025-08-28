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
    const groupSelectorEl = document.getElementById('groupSelector');
    const loadingGroupsText = document.getElementById('loading-groups-text');
    
    const groupNameInput = document.getElementById('groupName');
    const groupIdInput = document.getElementById('groupId');
    const userTokenInput = document.getElementById('userToken');

    // --- NEW: Initialize Choices.js ---
    // We create the instance here but will load the choices later.
    const groupChoices = new Choices(groupSelectorEl, {
        itemSelectText: 'Click to select',
        searchPlaceholderValue: 'Type to search for a group...',
        shouldSort: false, // Keep the order from the API
    });

    const oauthToken = localStorage.getItem('groupme_access_token');

    if (!oauthToken) {
        connectPrompt.style.display = 'block';
    } else {
        formContainer.style.display = 'block';
        userTokenInput.value = oauthToken;

        try {
            groupChoices.disable(); // Disable dropdown while loading
            groupChoices.clearStore(); // Clear any previous options
            groupChoices.setChoices([{ value: '', label: 'Loading...', disabled: true }]);

            const response = await fetch('/api/get-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: oauthToken })
            });

            const groups = await response.json();
            if (!response.ok) throw new Error(groups.error || 'Failed to fetch groups.');

            loadingGroupsText.style.display = 'none';
            
            if (groups.length === 0) {
                groupChoices.setChoices([{ value: '', label: 'No manageable groups found.', disabled: true }]);
            } else {
                // Format groups for Choices.js and load them into the dropdown
                const choicesData = groups.map(group => ({
                    value: group.id,
                    label: group.name,
                    customProperties: { name: group.name } // Store name for later use
                }));
                groupChoices.setChoices(choicesData, 'value', 'label', true);
                groupChoices.enable();
            }

        } catch (error) {
            console.error(error);
            loadingGroupsText.textContent = `Error: ${error.message}`;
            loadingGroupsText.style.color = 'red';
        }
    }

    // Event listener to auto-fill hidden inputs when a group is selected
    groupSelectorEl.addEventListener('change', (event) => {
        const selectedValue = event.detail.value;
        const selectedChoice = groupChoices.getChoice(selectedValue);
        if (selectedChoice) {
            groupIdInput.value = selectedChoice.value;
            groupNameInput.value = selectedChoice.customProperties.name;
        }
    });

    // Handle the final form submission (logic remains the same)
    const addGroupForm = document.getElementById('addGroupForm');
    const submitBtn = addGroupForm.querySelector('button[type="submit"]');
    const messageEl = document.getElementById('formMessage');

    addGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // ... The rest of your form submission logic is unchanged ...
    });
});

// NOTE: The form submission logic from the previous step can be pasted back in
// if it was removed. It remains the same.