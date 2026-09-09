import { getConfig } from "./config/config.js";
import { GoogleSheetsService } from "./services/googleSheets.js";
import { ProductService } from "./services/productService.js";
import { TelegramService } from "./telegram/telegram.js";
import { createProductSearchHandler } from "./handlers/productSearchHandler.js";

let appInstance = null;

function createApp(env) {
  if (appInstance) {
    return appInstance;
  }

  const config = getConfig(env);

  const sheetsService = new GoogleSheetsService({
    sheetId: config.googleSheetId,
    gid: config.googleSheetGid,
    cacheTtlSeconds: config.cacheTtlSeconds
  });

  const productService = new ProductService({
    sheetsService,
    maxResults: config.maxResults,
    fuzzySearch: config.fuzzySearch
  });

  const telegramService = new TelegramService(
    config.telegramBotToken
  );

  const productSearchHandler = createProductSearchHandler({
    productService,
    telegramService
  });

  appInstance = {
    config,
    sheetsService,
    productService,
    telegramService,
    productSearchHandler
  };

  return appInstance;
}

function isTelegramUpdate(update) {
  return Boolean(update && typeof update === "object");
}

function getTextMessage(update) {
  const message = update?.message;

  if (!message) {
    return null;
  }

  const chatId = message?.chat?.id;

  if (!chatId) {
    return null;
  }

  const text = typeof message?.text === "string"
    ? message.text.trim()
    : "";

  if (!text) {
    return null;
  }

  return {
    chatId,
    text
  };
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/") {
        return Response.json({
          success: true,
          service: "google-sheets-product-search",
          status: "ok"
        });
      }

      if (request.method !== "POST" || url.pathname !== "/webhook") {
        return Response.json(
          {
            success: false,
            error: "Route not found"
          },
          {
            status: 404
          }
        );
      }

      const update = await request.json();

      if (!isTelegramUpdate(update)) {
        return Response.json({
          success: true
        });
      }

      const message = getTextMessage(update);

      if (!message) {
        return Response.json({
          success: true
        });
      }

      const { chatId, text } = message;

      // دستورات Telegram به موتور جستجوی محصول ارسال نمی‌شوند.
      if (text.startsWith("/")) {
        return Response.json({
          success: true
        });
      }

      const app = createApp(env);

      await app.productSearchHandler({
        chatId,
        query: text
      });

      return Response.json({
        success: true
      });
    } catch (error) {
      console.error("Webhook error:", error);

      return Response.json(
        {
          success: false,
          error: "Internal server error"
        },
        {
          status: 500
        }
      );
    }
  }
};
