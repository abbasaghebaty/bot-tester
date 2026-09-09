import { parseCsv } from "../utils/csv.js";

export class GoogleSheetsService {
  constructor({ sheetId, gid = "", cacheTtlSeconds = 60 }) {
    if (!sheetId) {
      throw new Error("GOOGLE_SHEET_ID is required.");
    }

    this.sheetId = sheetId;
    this.gid = gid;
    this.cacheTtlSeconds = cacheTtlSeconds;
    this.cache = null;
  }

  getCsvUrl() {
    const base =
      `https://docs.google.com/spreadsheets/d/${encodeURIComponent(this.sheetId)}/export?format=csv`;

    return this.gid
      ? `${base}&gid=${encodeURIComponent(this.gid)}`
      : base;
  }

  async getRows({ forceRefresh = false } = {}) {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cache &&
      now - this.cache.timestamp < this.cacheTtlSeconds * 1000
    ) {
      return this.cache.rows;
    }

    const response = await fetch(this.getCsvUrl(), {
      method: "GET",
      headers: {
        "Accept": "text/csv"
      }
    });

    if (!response.ok) {
      throw new Error(
        `Google Sheets request failed: ${response.status} ${response.statusText}`
      );
    }

    const csv = await response.text();
    const rows = parseCsv(csv);

    this.cache = {
      timestamp: now,
      rows
    };

    return rows;
  }

  clearCache() {
    this.cache = null;
  }
}
