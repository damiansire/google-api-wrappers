const getRange = require("./libs/getRange");

class GoogleSheetsWizard {
  spreadsheetId: string;
  auth;
  constructor(auth: any, spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
    this.auth = auth;
  }
  getRange(range) {
    return getRange(this.auth, this.spreadsheetId, range);
  }
}

export default GoogleSheetsWizard;

// For CommonJS default export support
module.exports = GoogleSheetsWizard;
module.exports.default = GoogleSheetsWizard;
module.exports.__esModule = true;
