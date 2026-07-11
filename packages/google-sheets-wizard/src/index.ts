import getRange, { getRanges } from "./libs/getRange";
import type { Row, MappedRow, SheetsAuth } from "./libs/getRange";

// SheetsAuth se define en ./libs/getRange (donde se usa) para evitar un ciclo de
// imports; acá se re-exporta como parte de la API pública.
export type { SheetsAuth };

/**
 * A class for interacting with Google Sheets data.
 *
 * Provides methods to fetch data from a specified range within a Google Sheet.
 */
class GoogleSheetsWizard {
  /** The ID of the Google Sheet to interact with. */
  spreadsheetId: string;

  /** A Google API authentication object for authorization. */
  auth: SheetsAuth;

  /** Per-request timeout in ms (default 30s). Guards against hung connections. */
  timeoutMs?: number | undefined;

  /**
   * Creates a new GoogleSheetsWizard instance.
   *
   * @param auth A Google API authentication object.
   * @param spreadsheetId The ID of the Google Sheet.
   * @param options Optional settings. `timeoutMs` caps every request (default
   *   30000) so a hung connection can't block the consumer forever.
   */
  constructor(
    auth: SheetsAuth,
    spreadsheetId: string,
    options?: { timeoutMs?: number }
  ) {
    this.spreadsheetId = spreadsheetId;
    this.auth = auth;
    this.timeoutMs = options?.timeoutMs;
  }

  /**
   * Fetches data from the specified range in the Google Sheet.
   *
   * An empty range (empty sheet/column, a filter with no hits) resolves to `[]`
   * — it is a normal result, not an error.
   *
   * @param range The range of cells to fetch (e.g., "A1:B5").
   * @param objectKeys Optional keys to map each row into an object. When
   *   provided, every row is converted into an object using these keys in
   *   order; otherwise the raw 2D array of rows is returned.
   * @returns A promise that resolves to the fetched data: a 2D array of rows,
   *   or an array of objects when `objectKeys` is supplied.
   * @throws {Error} If the API call fails. The message is human-readable
   *   ("Permission error…" for 403, "Spreadsheet not found…" for 404) and the
   *   original Gaxios error is preserved on the `cause` property.
   * @example
   * ```ts
   * const wizard = new GoogleSheetsWizard(auth, spreadsheetId);
   *
   * // Raw rows:
   * const rows = await wizard.getRange("Sheet1!A1:B2");
   * // => [["Ada", "Lovelace"], ["Alan", "Turing"]]
   *
   * // Mapped to objects with the given keys:
   * const people = await wizard.getRange("Sheet1!A1:B2", ["first", "last"]);
   * // => [{ first: "Ada", last: "Lovelace" }, { first: "Alan", last: "Turing" }]
   * ```
   */
  getRange(range: string): Promise<Row[]>;
  getRange(range: string, objectKeys: string[]): Promise<MappedRow[]>;
  getRange(
    range: string,
    objectKeys?: string[]
  ): Promise<Row[] | MappedRow[]> {
    // Ramificamos para que cada llamada matchee un overload concreto de la lib
    // (forwardear `string[] | undefined` no resuelve overload, y el repo evita `as`).
    return objectKeys
      ? getRange(this.auth, this.spreadsheetId, range, objectKeys, this.timeoutMs)
      : getRange(this.auth, this.spreadsheetId, range, undefined, this.timeoutMs);
  }

  /**
   * Fetches multiple ranges from the sheet in as few HTTP calls as possible
   * (Sheets API `spreadsheets.values.batchGet`), instead of one `getRange`
   * call per range. Useful when a screen/report needs several disjoint
   * ranges from the same spreadsheet at once.
   *
   * The result preserves request order: `result[i]` corresponds to `ranges[i]`.
   * Each entry follows the same empty-range-is-`[]` and mapping rules as
   * {@link GoogleSheetsWizard.getRange}.
   *
   * @param ranges The ranges to fetch (e.g., `["Sheet1!A1:B2", "Sheet1!D:D"]`).
   * @param objectKeys Optional keys to map every row of every range into an
   *   object, same as `getRange`.
   * @example
   * ```ts
   * const [people, totals] = await wizard.getRanges([
   *   "Sheet1!A1:B2",
   *   "Sheet1!D1:D2",
   * ]);
   * ```
   */
  getRanges(ranges: string[]): Promise<Row[][]>;
  getRanges(ranges: string[], objectKeys: string[]): Promise<MappedRow[][]>;
  getRanges(
    ranges: string[],
    objectKeys?: string[]
  ): Promise<Row[][] | MappedRow[][]> {
    return objectKeys
      ? getRanges(this.auth, this.spreadsheetId, ranges, objectKeys, this.timeoutMs)
      : getRanges(this.auth, this.spreadsheetId, ranges, undefined, this.timeoutMs);
  }
}

export default GoogleSheetsWizard;

// For CommonJS default export support
module.exports = GoogleSheetsWizard;
module.exports.default = GoogleSheetsWizard;
module.exports.__esModule = true;
