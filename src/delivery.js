function truncateText(text, maxLength = 3800) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

function buildMessageHeader(title) {
  return `Perplexity Agent API Demo\n${title}\n\n`;
}

function buildDeliveryText(title, markdown) {
  return truncateText(`${buildMessageHeader(title)}${markdown}`);
}

async function sendTelegramMessage({ token, chatId, text }) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  const payload = await response.json();
  if (!response.ok || payload.ok !== true) {
    const message = payload?.description ?? `Telegram send failed with status ${response.status}`;
    throw new Error(message);
  }

  return {
    channel: "telegram",
    message_id: payload.result?.message_id ?? null
  };
}

async function sendSlackWebhook({ webhookUrl, text }) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed with status ${response.status}`);
  }

  return {
    channel: "slack"
  };
}

export async function sendConfiguredDelivery({ title, markdown }) {
  const text = buildDeliveryText(title, markdown);
  const deliveries = [];
  const errors = [];

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (telegramToken && telegramChatId) {
    try {
      deliveries.push(await sendTelegramMessage({ token: telegramToken, chatId: telegramChatId, text }));
    } catch (error) {
      errors.push(`Telegram: ${error.message}`);
    }
  }

  if (slackWebhookUrl) {
    try {
      deliveries.push(await sendSlackWebhook({ webhookUrl: slackWebhookUrl, text }));
    } catch (error) {
      errors.push(`Slack: ${error.message}`);
    }
  }

  return {
    deliveries,
    errors
  };
}

export function getConfiguredDestinations() {
  const destinations = [];

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    destinations.push("telegram");
  }

  if (process.env.SLACK_WEBHOOK_URL) {
    destinations.push("slack");
  }

  return destinations;
}
