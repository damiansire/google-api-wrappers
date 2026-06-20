const { google } = require("googleapis");

async function getRange(
  auth: any,
  spreadsheetId: string,
  range: string,
  objectKeys: any | undefined
) {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      // Throw a specific error instead of just logging it
      throw new Error("No data found in the specified range.");
    }

    if (objectKeys) {
      return rows.map((row: any) =>
        objectKeys.reduce((obj: any, key: any, index: any) => {
          obj[key] = row[index] || "";
          return obj;
        }, {})
      );
    }

    return rows;
  } catch (error) {
    handleError(error);
    throw error; // Re-throw for higher-level handling
  }
}

function handleError(error: any) {
  switch (error.code) {
    case 403:
      console.error(
        "Permission error: Make sure you have access to the spreadsheet."
      );
      break;
    case 404: // Not found
      console.error("Spreadsheet not found. Check the spreadsheetId.");
      break;
    default:
      if (error.message.includes("No data found")) {
        console.error("No data found in the specified range.");
      } else {
        console.error("Error fetching data:", error.message);
      }
  }
}

module.exports = getRange;
