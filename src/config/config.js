function positiveNumber(value, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }

  return number;
}

export function getConfig(env) {
  const maxResults = positiveNumber(
    env.MAX_RESULTS,
    5
  );

  const cacheTtlSeconds = positiveNumber(
    env.CACHE_TTL_SECONDS,
    60
  );

  const fuzzySearch = String(
    env.FUZZY_SEARCH ?? "true"
  ).toLowerCase() === "true";

  return {
    googleSheetId: String(
      env.GOOGLE_SHEET_ID ?? ""
    ).trim(),

    googleSheetGid: String(
      env.GOOGLE_SHEET_GID ?? ""
    ).trim(),

    telegramBotToken: String(
      env.TELEGRAM_BOT_TOKEN ?? ""
    ).trim(),

    cacheTtlSeconds,

    maxResults,

    fuzzySearch
  };
}
