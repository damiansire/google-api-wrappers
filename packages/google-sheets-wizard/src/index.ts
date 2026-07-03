import type { Common } from "googleapis";
import getRange from "./libs/getRange";
import type { Row, MappedRow } from "./libs/getRange";

/**
 * Credentials accepted by the Google Sheets API.
 *
 * Matches the `auth` union of the underlying `googleapis` Sheets v4 client, so
 * the consumer gets autocompletion and compile-time errors instead of `any`.
 */
export type SheetsAuth =
  | string
  | Common.OAuth2Client
  | Common.JWT
  | Common.Compute
  | Common.UserRefreshClient
  | Common.BaseExternalAccountClient
  | Common.GoogleAuth;

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

  /**
   * Creates a new GoogleSheetsWizard instance.
   *
   * @param auth A Google API authentication object.
   * @param spreadsheetId The ID of the Google Sheet.
   */
  constructor(auth: SheetsAuth, spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
    this.auth = auth;
  }

  /**
   * Fetches data from the specified range in the Google Sheet.
   *
   * @param range The range of cells to fetch (e.g., "A1:B5").
   * @param objectKeys Optional keys to map each row into an object. When
   *   provided, every row is converted into an object using these keys in
   *   order; otherwise the raw 2D array of rows is returned.
   * @returns A promise that resolves to the fetched data: a 2D array of rows,
   *   or an array of objects when `objectKeys` is supplied.
   */
  getRange(
    range: string,
    objectKeys?: string[]
  ): Promise<Row[] | MappedRow[]> {
    return getRange(this.auth, this.spreadsheetId, range, objectKeys);
  }
}

export default GoogleSheetsWizard;

// For CommonJS default export support
module.exports = GoogleSheetsWizard;
module.exports.default = GoogleSheetsWizard;
module.exports.__esModule = true;
