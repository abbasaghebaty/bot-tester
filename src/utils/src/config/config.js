export function getConfig(env) {
  const maxResults = Number(env.MAX_RESULTS ?? 5);
  const cacheTtl = Number(env.CACHE_TTL_SECONDS ?? 60);

  return {
    googleSheetId: env.GOOGLE_SHEET_ID,
    googleSheetGid: env.GOOGLE_SHEET_GID || "",
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    cacheTtlSeconds: Number.isFinite(cacheTtl) ? cacheTtl : 60,
    maxResults: Number.isFinite(maxResults) && maxResults > 0 ? maxResults : 5
  };
}
