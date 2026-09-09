import { parseCsv } from "../utils/csv.js";

export class GoogleSheetsService {
  constructor({
    sheetId,
    gid = "",
    cacheTtlSeconds = 60
  }) {
    if (!sheetId) {
      throw new Error(
        "GOOGLE_SHEET_ID is required."
      );
    }

    this.sheetId = sheetId;
    this.gid = gid;
    this.cacheTtlSeconds = cacheTtlSeconds;

    this.cache = null;
    this.loadingPromise = null;
  }

  getCsvUrl() {
    const base =
      `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
        this.sheetId
      )}/export?format=csv`;

    if (!this.gid) {
      return base;
    }

    return `${base}&gid=${encodeURIComponent(this.gid)}`;
  }

  isCacheValid() {
    if (!this.cache) {
      return false;
    }

    return (
      Date.now() - this.cache.timestamp <
      this.cacheTtlSeconds * 1000
    );
  }

  async fetchRowsFromGoogle() {
    const response = await fetch(
      this.getCsvUrl(),
      {
        method: "GET",
        headers: {
          Accept: "text/csv"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Google Sheets request failed: ${response.status} ${response.statusText}`
      );
    }

    const csv = await response.text();

    if (!csv.trim()) {
      throw new Error(
        "Google Sheets returned an empty CSV."
      );
    }

    return parseCsv(csv);
  }

  async getRows({
    forceRefresh = false
  } = {}) {
    if (
      !forceRefresh &&
      this.isCacheValid()
    ) {
      return this.cache.rows;
    }

    /*
     * اگر چند درخواست همزمان برسند،
     * فقط یکی Google Sheets را درخواست می‌کند.
     */
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise =
      this.fetchRowsFromGoogle()
        .then(rows => {
          this.cache = {
            timestamp: Date.now(),
            rows
          };

          return rows;
        })
        .finally(() => {
          this.loadingPromise = null;
        });

    return this.loadingPromise;
  }

  clearCache() {
    this.cache = null;
  }
}
