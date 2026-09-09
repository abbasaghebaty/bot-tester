import { getConfig } from "./config/config.js";
import { GoogleSheetsService } from "./services/googleSheets.js";
import { ProductService } from "./services/productService.js";
import { TelegramService } from "./telegram/telegram.js";
import { createProductSearchHandler } from "./handlers/productSearchHandler.js";

function createApp(env) {
  const config = getConfig(env);

  const sheetsService = new GoogleSheetsService({
    sheetId: config.googleSheetId,
    gid: config.googleSheetGid,
    cacheTtlSeconds: config.cacheTtlSeconds
  });

  const productService = new ProductService({
    sheetsService,
    maxResults: config.maxResults
  });

  const telegramService = new TelegramService(
    config.telegramBotToken
  );

  const productSearchHandler = createProductSearchHandler({
    productService,
    telegramService
  });

  return {
    config,
    sheetsService,
    productService,
    telegramService,
    productSearchHandler
  };
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/") {
        return Response.json({
          success: true,
          service: "google-sheets-product-search"
        });
      }

      if (request.method !== "POST" || url.pathname !== "/webhook") {
        return Response.json(
          {
            success: false,
            error: "Route not found"
          },
          { status: 404 }
        );
      }

      const update = await request.json();

      const message = update?.message;
      const chatId = message?.chat?.id;
      const text = message?.text;

      if (!chatId || !text) {
        return Response.json({ success: true });
      }

      // دستورهای ربات را برای منطق اصلی ربات خودتان نگه دارید.
      if (text.startsWith("/")) {
        return Response.json({ success: true });
      }

      const app = createApp(env);

      await app.productSearchHandler({
        chatId,
        query: text
      });

      return Response.json({ success: true });
    } catch (error) {
      console.error(error);

      return Response.json(
        {
          success: false,
          error: error?.message ?? "Internal server error"
        },
        { status: 500 }
      );
    }
  }
};
