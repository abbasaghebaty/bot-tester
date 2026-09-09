import {
  formatPrice,
  formatDiscount
} from "../utils/price.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatProduct(product) {
  const lines = [
    `<b>${escapeHtml(product.name)}</b>`,
    "",
    `قیمت ما: ${formatPrice(product.ourPrice)}`,
    `قیمت مصرف‌کننده: ${formatPrice(product.consumerPrice)}`,
    `تخفیف: ${formatDiscount(product.discount)}`,
    `قیمت نهایی: ${formatPrice(product.finalConsumerPrice)}`
  ];

  return lines.join("\n");
}

export function createProductSearchHandler({
  productService,
  telegramService
}) {
  return async function productSearchHandler({ chatId, query }) {
    const products = await productService.search(query);

    if (!products.length) {
      await telegramService.sendMessage(
        chatId,
        "محصولی با این نام پیدا نشد."
      );

      return {
        found: false,
        products: []
      };
    }

    const text = products
      .map(formatProduct)
      .join("\n\n");

    await telegramService.sendMessage(chatId, text);

    return {
      found: true,
      products
    };
  };
}
