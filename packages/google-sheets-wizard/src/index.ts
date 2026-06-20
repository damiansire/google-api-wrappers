const getRange = require("./libs/getRange");

/**
 * A class for interacting with Google Sheets data.
 *
 * Provides methods to fetch data from a specified range within a Google Sheet.
 */
class GoogleSheetsWizard {
  /** The ID of the Google Sheet to interact with. */
  spreadsheetId: string;

  /** A Google API authentication object for authorization. */
  auth: any;

  /**
   * Creates a new GoogleSheetsWizard instance.
   *
   * @param auth A Google API authentication object.
   * @param spreadsheetId The ID of the Google Sheet.
   */
  constructor(auth: any, spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
    this.auth = auth;
  }

  /**
   * Fetches data from the specified range in the Google Sheet.
   *
   * @param range The range of cells to fetch (e.g., "A1:B5").
   * @returns A promise that resolves to the fetched data (likely an array of arrays).
   *
   * The returned data's format depends on the implementation of the external 'getRange' function.
   * It's likely a 2D array where each inner array represents a row of data.
   */
  getRange(range: string): Promise<any> {
    return getRange(this.auth, this.spreadsheetId, range);
  }
}

export default GoogleSheetsWizard;

// For CommonJS default export support
module.exports = GoogleSheetsWizard;
module.exports.default = GoogleSheetsWizard;
module.exports.__esModule = true;
