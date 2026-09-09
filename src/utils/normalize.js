const characterMap = {
  "ي": "ی",
  "ى": "ی",
  "ئ": "ی",
  "ك": "ک",
  "ۀ": "ه",
  "ة": "ه",
  "ؤ": "و",
  "إ": "ا",
  "أ": "ا",
  "ٱ": "ا"
};

const digitMap = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
};

export function normalizeDigits(value) {
  return String(value ?? "").replace(/[۰-۹٠-٩]/g, char => digitMap[char] ?? char);
}

export function normalizeText(value) {
  let text = normalizeDigits(value)
    .toLowerCase()
    .replace(/ي|ى|ئ|ك|ۀ|ة|ؤ|إ|أ|ٱ/g, char => characterMap[char] ?? char)
    .replace(/[\u200c\u200d\u0640]/g, " ")
    .replace(/[إأآ]/g, "ا")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

export function tokenize(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ") : [];
}
