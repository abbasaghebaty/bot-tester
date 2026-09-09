import { normalizeDigits } from "./normalize.js";

export function parseNumber(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const raw = String(value).trim();

  if (!raw) {
    return null;
  }

  const text = normalizeDigits(raw)
    .replace(/[٬,]/g, "")
    .replace(/[٫]/g, ".")
    .replace(/[^\d.-]/g, "");

  if (!text) {
    return null;
  }

  const number = Number(text);

  return Number.isFinite(number)
    ? number
    : null;
}

/*
 * ستون G مبلغ ثابت تخفیف است، نه درصد.
 */
export function parseDiscount(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return 0;
  }

  return parseNumber(value) ?? 0;
}

export function calculateDiscountedPrice(
  consumerPrice,
  discount
) {
  if (consumerPrice === null) {
    return null;
  }

  const discountAmount =
    Math.max(0, discount ?? 0);

  return Math.max(
    0,
    consumerPrice - discountAmount
  );
}

export function formatPrice(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "ثبت نشده";
  }

  return `${new Intl.NumberFormat("fa-IR").format(
    Math.round(value)
  )} تومان`;
}

export function formatDiscount(value) {
  if (!value) {
    return "بدون تخفیف";
  }

  return `${new Intl.NumberFormat("fa-IR").format(
    Math.round(value)
  )} تومان`;
}
