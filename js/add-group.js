import { supabase } from './supabase-client.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- AUTHENTICATION CHECK ---
    // Ensure the user is logged in. If not, redirect to the login page.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    // --- DOM ELEMENT SELECTION ---
    const connectPrompt = document.getElementById('connect-prompt');
    const formContainer = document.getElementById('form-container');
    const groupSelectorEl = document.getElementById('groupSelector');
    const loadingGroupsText = document.getElementById('loading-groups-text');
    const userTokenInput = document.getElementById('userToken');
    const addGroupForm = document.getElementById('addGroupForm');
    const submitBtn = addGroupForm.querySelector('button[type="submit"]');
    const messageEl = document.getElementById('formMessage');

    // --- INITIALIZE CHOICES.JS ---
    // Initialize Choices.js for multi-select functionality on the group selector
    const groupChoices = new Choices(groupSelectorEl, {
        removeItemButton: true, // Allow users to remove selected groups
        searchPlaceholderValue: 'Type to search for groups...', // Placeholder text for the search input
        shouldSort: false, // Keep the order as fetched
        placeholder: true, // Show placeholder when nothing is selected
        placeholderValue: 'Select groups...', // The text for the placeholder
    });

    // --- CHECK FOR GROUPME TOKEN ---
    // Retrieve the GroupMe access token from local storage
    const oauthToken = localStorage.getItem('groupme_access_token');

    if (!oauthToken) {
        // If no token is found, show the prompt to connect GroupMe and hide the form
        connectPrompt.style.display = 'block';
        formContainer.style.display = 'none';
    } else {
        // If token exists, show the form and load groups
        connectPrompt.style.display = 'none';
        formContainer.style.display = 'block';
        userTokenInput.value = oauthToken; // Set the token in the hidden input field

        // --- LOAD AND POPULATE GROUPS ---
        try {
            groupChoices.disable(); // Disable Choices.js temporarily while loading
            // Set a loading state for the dropdown
            groupChoices.setChoices([{ value: '', label: 'Loading your groups...', disabled: true, selected: false }]);
            
            // Fetch groups from the backend API endpoint
            const response = await fetch('/api/get-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // Ensure content type is JSON
                body: JSON.stringify({ accessToken: oauthToken }) // Send the GroupMe access token
            });
            const groups = await response.json(); // Parse the JSON response

            // Handle potential API errors from the backend
            if (!response.ok) {
                throw new Error(groups.error || `Failed to fetch groups. Status: ${response.status}`);
            }

            loadingGroupsText.style.display = 'none'; // Hide the "Loading..." text
            groupChoices.clearStore(); // Clear any previous choices

            // Check if any groups were found
            if (groups.length === 0) {
                // Display a message if no manageable groups are found
                groupChoices.setChoices([{ value: '', label: 'No manageable groups found.', disabled: true }]);
            } else {
                // Map the fetched groups to the format Choices.js expects for options
                const choicesData = groups.map(group => ({
                    value: group.id, // The group ID is the value
                    label: group.name, // The group name is the label
                }));
                // Populate Choices.js with the fetched groups
                groupChoices.setChoices(choicesData, 'value', 'label', false);
                groupChoices.enable(); // Re-enable Choices.js after loading
            }
        } catch (error) {
            // Log errors and display a user-friendly message
            console.error("Error loading groups:", error);
            loadingGroupsText.textContent = `Error loading groups: ${error.message}`; // Update loading text with error
            messageEl.textContent = `Could not load your groups. ${error.message}`; // Show an error message on the form itself
            messageEl.className = 'form-message error visible';
            groupChoices.clearStore(); // Clear choices
            groupChoices.setChoices([{ value: '', label: 'Error loading groups.', disabled: true }]); // Show error state in dropdown
        }
    }

    // --- FORM SUBMISSION HANDLING ---
    addGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default form submission

        // Get the currently selected groups from Choices.js
        // *** CORRECTED LINE: Use getValue() without 'true' to get objects { value, label } ***
        const selectedGroups = groupChoices.getValue(); 
        
        // --- DEBUGGING LOGS ---
        console.log('--- Form Submission ---');
        console.log('Token from hidden input:', userTokenInput.value);
        console.log('Selected Groups Array:', selectedGroups); // Log the array of selected group objects
        console.log('--- End Debugging Logs ---');

        // --- VALIDATION ---
        // Ensure a token is present
        if (!userTokenInput.value) {
            messageEl.textContent = 'Error: Your GroupMe access token is missing. Please reconnect.';
            messageEl.className = 'form-message error visible';
            return; // Stop submission
        }
        // Ensure at least one group is selected
        if (!selectedGroups || selectedGroups.length === 0) { 
            messageEl.textContent = 'Please select at least one group from the dropdown.';
            messageEl.className = 'form-message error visible';
            return; // Stop submission
        }

        // --- DISABLE SUBMIT BUTTON AND START PROCESSING ---
        submitBtn.disabled = true; // Disable the button to prevent multiple submissions
        let successfulCreations = 0; // Counter for successfully created bots/configs
        
        // Iterate over each selected group to create a bot and save configuration
        for (let i = 0; i < selectedGroups.length; i++) {
            // 'group' will now be an object like { value: 'groupId', label: 'GroupName' }
            const group = selectedGroups[i]; 
            
            // --- MORE DEBUGGING LOGS ---
            console.log('Processing Group Object:', group); 
            // --- END DEBUGGING LOGS ---

            // Update UI to show progress for the current group
            messageEl.textContent = `Processing group ${i + 1} of ${selectedGroups.length}: "${group.label}"...`;
            messageEl.className = 'form-message visible';

            // --- VALIDATE GROUP ID BEFORE MAKING API CALL ---
            // Check if the group object and its 'value' (group ID) are present
            if (!group || !group.value) { 
                console.error('Skipping group due to missing ID:', group);
                // Update message to indicate a skip due to missing ID
                messageEl.textContent = `Skipping group "${group?.label || 'Unknown'}": Missing group ID.`;
                messageEl.className = 'form-message error visible';
                continue; // Skip this iteration and move to the next group
            }

            try {
                // --- STEP 1: CREATE BOT VIA GROUPME API ---
                // Call the backend API to create a bot in GroupMe for the current group
                const createBotResponse = await fetch('/api/create-bot', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json' // Specify the request body is JSON
                    },
                    body: JSON.stringify({
                        accessToken: userTokenInput.value, // The user's GroupMe access token
                        groupId: group.value // The ID of the group to create the bot in
                    })
                });
                const botData = await createBotResponse.json(); // Parse the JSON response from the /api/create-bot endpoint
                
                // Check if the bot creation request was successful (status code 2xx)
                if (!createBotResponse.ok) { 
                    // If not ok, throw an error containing the message from the backend or status code
                    throw new Error(botData.error || `Failed to create bot for "${group.label}". Status: ${createBotResponse.status}`);
                }
                
                // --- STEP 2: SAVE CONFIGURATION TO SUPABASE ---
                // Prepare the data to be saved in the Supabase 'group_configs' table
                const configData = {
                    owner_user_id: session.user.id, // The logged-in user's ID from Supabase session
                    group_name: group.label,        // The name of the group
                    group_id: group.value,          // The ID of the group
                    bot_id: botData.bot_id,         // The ID of the newly created bot from GroupMe
                    groupme_user_token: userTokenInput.value, // Store the user's GroupMe token
                };
                
                // Insert the new configuration into the 'group_configs' table
                const { error: insertError } = await supabase.from('group_configs').insert([configData]);
                if (insertError) {
                    // If Supabase insert fails, throw the error to be caught by the catch block
                    throw insertError; 
                }
                
                successfulCreations++; // Increment counter for successfully created bots/configs

            } catch (error) {
                // --- ERROR HANDLING FOR CURRENT GROUP ---
                // Log the error for debugging purposes
                console.error('Error during batch setup for group:', group?.label || group.value, error);
                // Update the message element with the specific error for this group and stop the process
                messageEl.textContent = `Error processing "${group?.label || group.value}": ${error.message}. Stopping process.`;
                messageEl.className = 'form-message error visible';
                submitBtn.disabled = false; // Re-enable the button so the user can try again
                return; // Exit the function entirely if any group fails
            }
        }

        // --- SUCCESS HANDLING ---
        // If the loop completes without any errors, all requested bots/configs were created
        messageEl.textContent = `Success! ${successfulCreations} filter(s) created. Redirecting to dashboard...`;
        messageEl.className = 'form-message success visible';
        
        // Clear the cached GroupMe token from local storage as it's no longer needed for this session
        localStorage.removeItem('groupme_access_token'); 
        
        // Redirect the user to the dashboard page after a short delay
        setTimeout(() => { window.location.href = 'index.html'; }, 3000);
    });
});
