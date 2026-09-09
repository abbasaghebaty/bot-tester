export class TelegramService {
  constructor(token) {
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is required.");
    }

    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async call(method, payload = {}) {
    const response = await fetch(`${this.baseUrl}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        `Telegram API error: ${response.status} ${JSON.stringify(data)}`
      );
    }

    return data.result;
  }

  async sendMessage(chatId, text, options = {}) {
    return this.call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...options
    });
  }

  async setWebhook(url, options = {}) {
    return this.call("setWebhook", {
      url,
      ...options
    });
  }
}
