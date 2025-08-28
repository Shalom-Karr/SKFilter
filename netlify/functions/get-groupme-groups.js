// File: netlify/functions/get-groupme-groups.js

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { accessToken } = JSON.parse(event.body);
    if (!accessToken) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing access token' }) };
    }

    // Step 1: Find out who the current user is to get their ID
    const meResponse = await fetch('https://api.groupme.com/v3/users/me', {
      headers: { 'X-Access-Token': accessToken },
    });
    if (!meResponse.ok) throw new Error('Failed to verify user with GroupMe.');
    const meData = await meResponse.json();
    const userId = meData.response.user_id;

    // Step 2: Fetch all groups the user is a member of (up to 100)
    const groupsResponse = await fetch('https://api.groupme.com/v3/groups?per_page=100', {
      headers: { 'X-Access-Token': accessToken },
    });
    if (!groupsResponse.ok) throw new Error('Failed to fetch groups from GroupMe.');
    const groupsData = await groupsResponse.json();
    const allGroups = groupsData.response;

    // Step 3: Filter the list to find groups where the user is an admin or owner
    const manageableGroups = allGroups.filter(group => {
      const currentUserAsMember = group.members.find(member => member.user_id === userId);
      return currentUserAsMember && (currentUserAsMember.roles.includes('admin') || currentUserAsMember.roles.includes('owner'));
    });

    // Step 4: Format the data cleanly for the frontend dropdown
    const formattedGroups = manageableGroups.map(group => ({
      id: group.id,
      name: group.name,
    }));

    // Success! Send the filtered list back.
    return {
      statusCode: 200,
      body: JSON.stringify(formattedGroups),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};