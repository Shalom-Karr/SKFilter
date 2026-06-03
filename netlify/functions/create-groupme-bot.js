// File: netlify/functions/create-groupme-bot.js

// IMPORTANT: You must set this in your Netlify Environment Variables
const { GOOGLE_SCRIPT_CALLBACK_URL } = process.env;

/**
 * Finds and destroys an existing bot with the same callback URL in the given group.
 * Returns true if a bot was destroyed, false otherwise.
 */
async function destroyExistingBot(accessToken, groupId) {
  // List all bots for this user
  const listResponse = await fetch('https://api.groupme.com/v3/bots?token=' + accessToken);
  if (!listResponse.ok) {
    console.error('Failed to list bots:', listResponse.status);
    return false;
  }

  const listData = await listResponse.json();
  const bots = listData.response || [];

  // Find a bot in this group with the same callback URL
  const existingBot = bots.find(
    (bot) => bot.group_id === groupId && bot.callback_url === GOOGLE_SCRIPT_CALLBACK_URL
  );

  if (!existingBot) {
    return false;
  }

  // Destroy the existing bot
  console.log(`Destroying existing bot ${existingBot.bot_id} in group ${groupId}`);
  const destroyResponse = await fetch('https://api.groupme.com/v3/bots/destroy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Access-Token': accessToken },
    body: JSON.stringify({ bot_id: existingBot.bot_id }),
  });

  if (!destroyResponse.ok) {
    console.error('Failed to destroy existing bot:', destroyResponse.status);
    return false;
  }

  return true;
}

/**
 * Creates a bot in a GroupMe group with the configured callback URL.
 */
async function createBot(accessToken, groupId) {
  const response = await fetch('https://api.groupme.com/v3/bots', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Access-Token': accessToken,
    },
    body: JSON.stringify({
      bot: {
        name: 'SK Filter',
        group_id: groupId,
        callback_url: GOOGLE_SCRIPT_CALLBACK_URL,
      },
    }),
  });
  const responseText = await response.text();
  return { response, responseText };
}

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

    let { response, responseText } = await createBot(accessToken, groupId);
    let usedPlaceholderCallback = false;

    // If bot creation failed due to duplicate callback URL, destroy existing bot and retry
    if (!response.ok && /callback url.*already registered/i.test(responseText)) {
      console.log('Duplicate callback URL detected. Destroying existing bot and retrying...');
      const destroyed = await destroyExistingBot(accessToken, groupId);
      if (destroyed) {
        ({ response, responseText } = await createBot(accessToken, groupId));
      }

      // If still failing, fall back to a placeholder callback URL
      if (!response.ok && /callback url.*already registered/i.test(responseText)) {
        console.log('Retry failed. Creating bot with placeholder callback URL...');
        const placeholderResponse = await fetch('https://api.groupme.com/v3/bots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Access-Token': accessToken,
          },
          body: JSON.stringify({
            bot: {
              name: 'SK Filter',
              group_id: groupId,
              callback_url: 'https://skfilter.netlify.app/fake/callback',
            },
          }),
        });
        responseText = await placeholderResponse.text();
        response = placeholderResponse;
        usedPlaceholderCallback = true;
      }
    }

    if (!response.ok) {
      let errorMessage = `GroupMe API error (status ${response.status})`;
      try {
        const errorBody = JSON.parse(responseText);
        console.error('GroupMe bot creation failed:', errorBody);
        if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
          errorMessage = errorBody.errors.join(', ');
        } else if (errorBody.meta && Array.isArray(errorBody.meta.errors) && errorBody.meta.errors.length > 0) {
          errorMessage = errorBody.meta.errors.join(', ');
        }
      } catch (parseError) {
        console.error('GroupMe bot creation failed with non-JSON response:', response.status, responseText);
      }
      throw new Error(errorMessage);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse GroupMe success response:', responseText);
      throw new Error('Unexpected response format from GroupMe API.');
    }

    if (!responseData.response || !responseData.response.bot || !responseData.response.bot.bot_id) {
      console.error('Unexpected response structure from GroupMe:', responseData);
      throw new Error('GroupMe API returned an unexpected response structure.');
    }

    const botId = responseData.response.bot.bot_id;

    // Success! Send the new bot's ID back to the frontend.
    const result = { bot_id: botId };
    if (usedPlaceholderCallback) {
      result.warning = 'Bot was created with a placeholder callback URL. You must manually update the callback URL in GroupMe to: ' + GOOGLE_SCRIPT_CALLBACK_URL;
      result.needs_manual_callback_fix = true;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};