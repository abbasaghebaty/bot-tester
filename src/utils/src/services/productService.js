import {
  normalizeText,
  tokenize
} from "../utils/normalize.js";

import {
  parseNumber,
  parseDiscount,
  calculateDiscountedPrice
} from "../utils/price.js";

export class ProductService {
  constructor({ sheetsService, maxResults = 5 }) {
    this.sheetsService = sheetsService;
    this.maxResults = maxResults;
  }

  rowToProduct(row, rowNumber) {
    return {
      rowNumber,

      // B
      name: String(row[1] ?? "").trim(),

      // D
      ourPrice: parseNumber(row[3]),

      // E
      consumerPrice: parseNumber(row[4]),

      // G - مبلغ ثابت تخفیف
      discount: parseDiscount(row[6])
    };
  }

  addCalculatedPrice(product) {
    return {
      ...product,
      finalConsumerPrice: calculateDiscountedPrice(
        product.consumerPrice,
        product.discount
      )
    };
  }

  scoreProduct(product, query) {
    const name = normalizeText(product.name);
    const normalizedQuery = normalizeText(query);

    if (!name || !normalizedQuery) return 0;

    if (name === normalizedQuery) {
      return 1000;
    }

    if (name.includes(normalizedQuery)) {
      return 700;
    }

    const queryTokens = tokenize(normalizedQuery);
    const nameTokens = tokenize(name);

    if (!queryTokens.length) return 0;

    let matched = 0;

    for (const token of queryTokens) {
      if (nameTokens.some(nameToken => nameToken.includes(token))) {
        matched++;
      }
    }

    if (!matched) return 0;

    return 400 + Math.round((matched / queryTokens.length) * 200);
  }

  async getAllProducts() {
    const rows = await this.sheetsService.getRows();

    // ردیف اول هدر است.
    return rows
      .slice(1)
      .map((row, index) =>
        this.rowToProduct(row, index + 2)
      )
      .filter(product => product.name)
      .map(product => this.addCalculatedPrice(product));
  }

  async search(query) {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return [];
    }

    const products = await this.getAllProducts();

    return products
      .map(product => ({
        product,
        score: this.scoreProduct(product, normalizedQuery)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.product.name.length - b.product.name.length;
      })
      .slice(0, this.maxResults)
      .map(item => item.product);
  }
}
