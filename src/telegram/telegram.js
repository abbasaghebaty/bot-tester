export class TelegramService {
  constructor(token) {
    if (!token) {
      throw new Error(
        "TELEGRAM_BOT_TOKEN is required."
      );
    }

    this.baseUrl =
      `https://api.telegram.org/bot${token}`;
  }

  async call(
    method,
    payload = {}
  ) {
    const response = await fetch(
      `${this.baseUrl}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `Telegram API returned invalid JSON. Status: ${response.status}`
      );
    }

    if (
      !response.ok ||
      !data?.ok
    ) {
      throw new Error(
        `Telegram API error: ${response.status} ${JSON.stringify(data)}`
      );
    }

    return data.result;
  }

  async sendMessage(
    chatId,
    text,
    options = {}
  ) {
    if (!chatId) {
      throw new Error(
        "chatId is required."
      );
    }

    if (!text) {
      throw new Error(
        "text is required."
      );
    }

    return this.call(
      "sendMessage",
      {
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...options
      }
    );
  }

  async setWebhook(
    url,
    options = {}
  ) {
    if (!url) {
      throw new Error(
        "Webhook URL is required."
      );
    }

    return this.call(
      "setWebhook",
      {
        url,
        ...options
      }
    );
  }
}
