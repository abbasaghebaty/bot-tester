// src/services/productService.js

import { normalizeText } from "../utils/normalize.js";
import {
  parseNumber,
  parseDiscount,
  calculateDiscountedPrice
} from "../utils/price.js";

/**
 * فاصله ویرایشی Levenshtein
 * مشخص می‌کند برای تبدیل یک رشته به رشته دیگر
 * چند تغییر لازم است.
 */
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  // برای کاهش مصرف حافظه، همیشه b را کوتاه‌تر نگه می‌داریم
  if (a.length < b.length) {
    [a, b] = [b, a];
  }

  let previous = Array.from(
    { length: b.length + 1 },
    (_, index) => index
  );

  for (let i = 1; i <= a.length; i++) {
    const current = [i];

    for (let j = 1; j <= b.length; j++) {
      const insertion = current[j - 1] + 1;
      const deletion = previous[j] + 1;
      const substitution =
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);

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

/**
 * حداکثر تعداد غلط قابل قبول
 *
 * 1 تا 3 حرف → بدون fuzzy جدی
 * 4 حرف → 1 غلط
 * 5 تا 7 حرف → 2 غلط
 * 8 حرف به بالا → 3 غلط
 */
function getMaxDistance(length) {
  if (length <= 3) return 0;
  if (length === 4) return 1;
  if (length <= 7) return 2;
  return 3;
}

/**
 * آیا query به اندازه کافی به target نزدیک است؟
 */
function fuzzyMatch(query, target) {
  if (!query || !target) return false;

  if (query === target) {
    return true;
  }

  const maxDistance = getMaxDistance(query.length);

  if (maxDistance <= 0) {
    return false;
  }

  /*
   * اگر طول‌ها خیلی متفاوت باشند،
   * احتمال match واقعی بسیار کم است.
   */
  if (Math.abs(query.length - target.length) > maxDistance) {
    return false;
  }

  return levenshteinDistance(query, target) <= maxDistance;
}

/**
 * پیدا کردن یک عبارت در تمام بخش‌های ممکن نام محصول
 *
 * مثال:
 *
 * query:
 * سافتلن
 *
 * product:
 * تاید سافتلن 4 لیتری
 *
 * نتیجه:
 * true
 *
 * همچنین:
 *
 * query:
 * تایدسافتلن
 *
 * product:
 * تاید سافتلن 4 لیتری
 *
 * با بررسی نسخه بدون فاصله می‌تواند match شود.
 */
function containsSearchTerm(productName, query) {
  const normalizedName = normalizeText(productName);
  const normalizedQuery = normalizeText(query);

  if (!normalizedName || !normalizedQuery) {
    return false;
  }

  // تطبیق مستقیم
  if (normalizedName.includes(normalizedQuery)) {
    return true;
  }

  // حذف فاصله برای مواردی مثل:
  // تاید سافتلن
  // تایدسافتلن
  const compactName = normalizedName.replace(/\s+/g, "");
  const compactQuery = normalizedQuery.replace(/\s+/g, "");

  if (compactName.includes(compactQuery)) {
    return true;
  }

  return false;
}

/**
 * بررسی fuzzy روی کل نام و بخش‌های مختلف آن.
 *
 * این قسمت باعث می‌شود مثلاً:
 *
 * سافتلن
 * سافتلنن
 * سافتلین
 * سافتل
 *
 * بتوانند به سافتلن برسند.
 */
function fuzzyContains(productName, query) {
  const normalizedName = normalizeText(productName);
  const normalizedQuery = normalizeText(query);

  if (!normalizedName || !normalizedQuery) {
    return false;
  }

  const compactName = normalizedName.replace(/\s+/g, "");
  const compactQuery = normalizedQuery.replace(/\s+/g, "");

  if (!compactQuery) {
    return false;
  }

  /*
   * اول خود query را با کلمات نام محصول مقایسه می‌کنیم.
   */
  const nameTokens = normalizedName.split(/\s+/);

  for (const token of nameTokens) {
    if (fuzzyMatch(normalizedQuery, token)) {
      return true;
    }
  }

  /*
   * حالا اگر query خودش ترکیبی از چند کلمه باشد،
   * بخش‌های متوالی نام محصول را هم بررسی می‌کنیم.
   *
   * مثال:
   * query = تایدسافتلن
   *
   * name = تاید سافتلن
   */
  const queryLength = compactQuery.length;

  if (queryLength < 3) {
    return false;
  }

  /*
   * به جای مقایسه فقط کلمه‌ها،
   * تمام پنجره‌های ممکن از نام محصول را بررسی می‌کنیم.
   */
  for (
    let start = 0;
    start < compactName.length;
    start++
  ) {
    const minLength = Math.max(
      1,
      queryLength - 3
    );

    const maxLength = Math.min(
      compactName.length - start,
      queryLength + 3
    );

    for (
      let length = minLength;
      length <= maxLength;
      length++
    ) {
      const part = compactName.slice(
        start,
        start + length
      );

      if (fuzzyMatch(compactQuery, part)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * محاسبه امتیاز جستجو
 *
 * ترتیب اهمیت:
 *
 * 10000 = تطبیق دقیق
 * 9000  = عبارت دقیق داخل نام
 * 8500  = عبارت دقیق بدون فاصله
 * 7000+ = تطبیق کلمه‌ای
 * 5000+ = fuzzy
 */
function scoreProduct(product, query) {
  const name = normalizeText(product.name);
  const normalizedQuery = normalizeText(query);

  if (!name || !normalizedQuery) {
    return 0;
  }

  /*
   * 1. تطبیق کاملاً دقیق
   *
   * سافتلن
   * →
   * سافتلن
   */
  if (name === normalizedQuery) {
    return 10000;
  }

  /*
   * 2. عبارت جستجو مستقیماً داخل نام است
   *
   * query:
   * سافتلن
   *
   * name:
   * تاید سافتلن 4 لیتری
   */
  if (name.includes(normalizedQuery)) {
    return 9000 + Math.min(
      normalizedQuery.length,
      100
    );
  }

  /*
   * 3. بدون فاصله
   *
   * query:
   * تایدسافتلن
   *
   * name:
   * تاید سافتلن
   */
  const compactName = name.replace(/\s+/g, "");
  const compactQuery = normalizedQuery.replace(/\s+/g, "");

  if (
    compactQuery &&
    compactName.includes(compactQuery)
  ) {
    return 8500 + Math.min(
      compactQuery.length,
      100
    );
  }

  /*
   * 4. بررسی کلمات query
   *
   * اگر کاربر بزند:
   *
   * تاید سافتلن
   *
   * محصول:
   *
   * تاید سافتلن 4 لیتری
   *
   * هر دو بخش match می‌شوند.
   */
  const queryTokens = normalizedQuery.split(/\s+/);
  const nameTokens = name.split(/\s+/);

  let exactTokenMatches = 0;
  let fuzzyTokenMatches = 0;

  for (const queryToken of queryTokens) {
    if (queryToken.length < 3) {
      continue;
    }

    let exactMatch = false;
    let fuzzyMatchFound = false;

    for (const nameToken of nameTokens) {
      if (
        nameToken === queryToken ||
        nameToken.includes(queryToken)
      ) {
        exactMatch = true;
        break;
      }

      if (
        queryToken.length >= 4 &&
        fuzzyMatch(queryToken, nameToken)
      ) {
        fuzzyMatchFound = true;
      }
    }

    if (exactMatch) {
      exactTokenMatches++;
    } else if (fuzzyMatchFound) {
      fuzzyTokenMatches++;
    }
  }

  if (exactTokenMatches > 0) {
    const coverage =
      exactTokenMatches / queryTokens.length;

    return Math.round(
      7000 +
      coverage * 1000
    );
  }

  /*
   * 5. fuzzy search
   *
   * اینجا همان چیزی اتفاق می‌افتد که می‌خواهی:
   *
   * سافتلن
   * سافتلنن
   * سافتلین
   * سافتل
   *
   * و حتی ترکیب‌هایی مثل:
   *
   * تایدسافتلن
   */
  if (fuzzyContains(product.name, query)) {
    return 5000;
  }

  if (fuzzyTokenMatches > 0) {
    const coverage =
      fuzzyTokenMatches / queryTokens.length;

    if (coverage >= 0.5) {
      return Math.round(
        4500 +
        coverage * 500
      );
    }
  }

  return 0;
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

  /**
   * تبدیل یک ردیف Google Sheet به محصول
   *
   * B = نام محصول
   * D = قیمت ما
   * E = قیمت مصرف‌کننده
   * G = تخفیف
   */
  rowToProduct(row, rowNumber) {
    return {
      rowNumber,

      name: String(
        row?.[1] ?? ""
      ).trim(),

      ourPrice: parseNumber(
        row?.[3]
      ),

      consumerPrice: parseNumber(
        row?.[4]
      ),

      discount: parseDiscount(
        row?.[6]
      )
    };
  }

  /**
   * محاسبه قیمت نهایی
   */
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

  /**
   * دریافت همه محصولات
   */
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

      .map(
        (row, index) =>
          this.rowToProduct(
            row,
            index + 2
          )
      )

      .filter(
        product =>
          product.name
      )

      .map(
        product =>
          this.addCalculatedPrice(
            product
          )
      );
  }

  /**
   * جستجوی محصول
   */
  async search(query) {
    const normalizedQuery =
      normalizeText(query);

    if (!normalizedQuery) {
      return [];
    }

    const products =
      await this.getAllProducts();

    const results = [];

    for (const product of products) {
      let score =
        scoreProduct(
          product,
          normalizedQuery
        );

      /*
       * اگر fuzzySearch خاموش باشد،
       * فقط تطبیق‌های دقیق را قبول می‌کنیم.
       */
      if (
        !this.fuzzySearch &&
        score < 8500
      ) {
        score = 0;
      }

      if (score > 0) {
        results.push({
          product,
          score
        });
      }
    }

    return results

      /*
       * اول امتیاز بالاتر
       */
      .sort(
        (a, b) => {
          if (
            b.score !== a.score
          ) {
            return (
              b.score - a.score
            );
          }

          /*
           * اگر امتیاز برابر بود،
           * اسم کوتاه‌تر اول بیاید.
           */
          return (
            a.product.name.length -
            b.product.name.length
          );
        }
      )

      .slice(
        0,
        this.maxResults
      )

      .map(
        item =>
          item.product
      );
  }
}
