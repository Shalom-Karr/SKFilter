// File: netlify/functions/groupme-oauth.js

exports.handler = async (event) => {
  // Only allow POST requests to this function
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { code, redirect_uri } = JSON.parse(event.body);

    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing authorization code' }),
      };
    }

    // Get the secrets from Netlify's environment variables
    const { GROUPME_CLIENT_ID, GROUPME_CLIENT_SECRET } = process.env;

    const tokenUrl = 'https://api.groupme.com/oauth/token';
    const body = new URLSearchParams({
      client_id: GROUPME_CLIENT_ID,
      client_secret: GROUPME_CLIENT_SECRET,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code',
      code: code,
    });

    // Exchange the code for an access token with GroupMe
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('GroupMe token exchange failed:', errorBody);
      throw new Error('Failed to exchange code for token with GroupMe.');
    }

    const tokenData = await response.json();
    const accessToken = tokenData.access_token;

    // Success! Send the access token back to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ access_token: accessToken }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};