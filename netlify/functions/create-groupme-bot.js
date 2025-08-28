// File: netlify/functions/create-groupme-bot.js

// IMPORTANT: You must set this in your Netlify Environment Variables
const { GOOGLE_SCRIPT_CALLBACK_URL } = process.env;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { accessToken, groupId } = JSON.parse(event.body);
    if (!accessToken || !groupId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing access token or group ID' }) };
    }
    if (!GOOGLE_SCRIPT_CALLBACK_URL) {
        throw new Error("Server configuration error: Callback URL not set.");
    }

    const createBotUrl = 'https://api.groupme.com/v3/bots';
    const botPayload = {
      bot: {
        name: 'SK Filter',
        group_id: groupId,
        callback_url: GOOGLE_SCRIPT_CALLBACK_URL
      }
    };

    const response = await fetch(createBotUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': accessToken,
      },
      body: JSON.stringify(botPayload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('GroupMe bot creation failed:', errorBody);
      throw new Error(errorBody.errors ? errorBody.errors.join(', ') : 'Failed to create bot in GroupMe.');
    }

    const responseData = await response.json();
    const botId = responseData.response.bot.bot_id;

    // Success! Send the new bot's ID back to the frontend.
    return {
      statusCode: 200,
      body: JSON.stringify({ bot_id: botId }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};