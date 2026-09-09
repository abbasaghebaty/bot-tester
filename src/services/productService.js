import {
  normalizeText,
  tokenize
} from "../utils/normalize.js";

import {
  parseNumber,
  parseDiscount,
  calculateDiscountedPrice
} from "../utils/price.js";

function levenshteinDistance(a, b) {
  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  let previous = Array.from(
    { length: b.length + 1 },
    (_, index) => index
  );

  for (let i = 1; i <= a.length; i++) {
    const current = [i];

    for (let j = 1; j <= b.length; j++) {
      const insertion =
        current[j - 1] + 1;

      const deletion =
        previous[j] + 1;

      const substitution =
        previous[j - 1] +
        (a[i - 1] === b[j - 1] ? 0 : 1);

      current[j] = Math.min(
        insertion,
        deletion,
        substitution
      );
    }

    previous = current;
  }

  return previous[b.length];
}

function maxAllowedDistance(token) {
  const length = token.length;

  if (length <= 2) {
    return 0;
  }

  if (length <= 4) {
    return 1;
  }

  return 2;
}

function tokenSimilarity(queryToken, nameToken) {
  if (
    !queryToken ||
    !nameToken
  ) {
    return 0;
  }

  if (queryToken === nameToken) {
    return 1;
  }

  if (
    nameToken.includes(queryToken) ||
    queryToken.includes(nameToken)
  ) {
    return 0.9;
  }

  const distance =
    levenshteinDistance(
      queryToken,
      nameToken
    );

  const allowed =
    maxAllowedDistance(queryToken);

  if (distance > allowed) {
    return 0;
  }

  return Math.max(
    0,
    1 - distance / Math.max(
      queryToken.length,
      nameToken.length
    )
  );
}

export class ProductService {
  constructor({
    sheetsService,
    maxResults = 5,
    fuzzySearch = true
  }) {
    this.sheetsService = sheetsService;
    this.maxResults = maxResults;
    this.fuzzySearch = fuzzySearch;
  }

  rowToProduct(row, rowNumber) {
    return {
      rowNumber,

      // B
      name: String(
        row[1] ?? ""
      ).trim(),

      // D
      ourPrice: parseNumber(
        row[3]
      ),

      // E
      consumerPrice: parseNumber(
        row[4]
      ),

      // G
      discount: parseDiscount(
        row[6]
      )
    };
  }

  addCalculatedPrice(product) {
    return {
      ...product,

      finalConsumerPrice:
        calculateDiscountedPrice(
          product.consumerPrice,
          product.discount
        )
    };
  }

  scoreProduct(product, query) {
    const name =
      normalizeText(product.name);

    const normalizedQuery =
      normalizeText(query);

    if (
      !name ||
      !normalizedQuery
    ) {
      return 0;
    }

    if (name === normalizedQuery) {
      return 1000;
    }

    if (
      name.includes(normalizedQuery)
    ) {
      return 900;
    }

    const queryTokens =
      tokenize(normalizedQuery);

    const nameTokens =
      tokenize(name);

    if (
      !queryTokens.length ||
      !nameTokens.length
    ) {
      return 0;
    }

    let totalSimilarity = 0;
    let matchedTokens = 0;

    for (const queryToken of queryTokens) {
      let bestSimilarity = 0;

      for (const nameToken of nameTokens) {
        const similarity =
          this.fuzzySearch
            ? tokenSimilarity(
                queryToken,
                nameToken
              )
            : (
                nameToken.includes(
                  queryToken
                )
                  ? 1
                  : 0
              );

        bestSimilarity = Math.max(
          bestSimilarity,
          similarity
        );
      }

      if (bestSimilarity > 0) {
        matchedTokens++;
        totalSimilarity += bestSimilarity;
      }
    }

    if (!matchedTokens) {
      return 0;
    }

    const coverage =
      matchedTokens /
      queryTokens.length;

    /*
     * اگر فقط بخش بسیار کوچکی از query
     * پیدا شده باشد، نتیجه را حذف می‌کنیم.
     */
    if (
      queryTokens.length >= 2 &&
      coverage < 0.5
    ) {
      return 0;
    }

    const averageSimilarity =
      totalSimilarity /
      matchedTokens;

    /*
     * امتیاز نهایی:
     * پوشش query + شباهت کلمات
     */
    return Math.round(
      400 +
      coverage * 300 +
      averageSimilarity * 300
    );
  }

  async getAllProducts() {
    const rows =
      await this.sheetsService.getRows();

    if (
      !Array.isArray(rows) ||
      rows.length <= 1
    ) {
      return [];
    }

    return rows
      .slice(1)
      .map((row, index) =>
        this.rowToProduct(
          row,
          index + 2
        )
      )
      .filter(product =>
        product.name
      )
      .map(product =>
        this.addCalculatedPrice(
          product
        )
      );
  }

  async search(query) {
    const normalizedQuery =
      normalizeText(query);

    if (!normalizedQuery) {
      return [];
    }

    const products =
      await this.getAllProducts();

    return products
      .map(product => ({
        product,
        score:
          this.scoreProduct(
            product,
            normalizedQuery
          )
      }))
      .filter(item =>
        item.score >= 500
      )
      .sort((a, b) => {
        if (
          b.score !== a.score
        ) {
          return b.score - a.score;
        }

        return (
          a.product.name.length -
          b.product.name.length
        );
      })
      .slice(0, this.maxResults)
      .map(item =>
        item.product
      );
  }
}
