# Google Sheets Wizard 🧙‍♂️

[![npm version](https://img.shields.io/npm/v/google-sheets-wizard)](https://www.npmjs.com/package/google-sheets-wizard)

Google Sheets Wizard simplifies fetching data from Google Sheets within your Node.js projects. With enhanced error handling and authentication support, you can extract cell ranges as JavaScript arrays or convert them into JSON objects.

## Key Features

- **Class Interface:** Fetch Google Sheets data using a straightforward, object-oriented approach.
- **Custom Error Handling:** Catch common issues (permissions, missing spreadsheets) with more informative error messages.
- **Flexible Output Format:** Retrieve data as raw arrays or transform it directly into JSON objects.

## Installation

```bash
npm install google-sheets-wizard googleapis
```

## Setup

1.  **Google Sheets Authentication:**

    - Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
    - Enable the [Google Sheets API](https://developers.google.com/sheets/api).
    - Generate credentials (e.g., a service account JSON file) and store them securely.

2.  **Get Your Spreadsheet ID:**

    - Open your spreadsheet in Google Sheets.
    - The URL will contain the ID (e.g., `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`).

## Usage

The first step in usage is to choose your authentication method with Google (to gain access to the Google Sheet you want to use).

If you're unsure how to do this, the setup step explained how to set it up.

Below is an example using `service_account`.

```javascript
import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  //Here (in keyFile), place the address where you saved your credentials file.
  keyFile: "./service_account_auth_credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
```

```javascript
//Here is the spreadsheet ID from which you want to retrieve the data. Step 2 of the setup explains how to obtain it.
const spreadsheetId = "YOUR_SPREADSHEET_ID";

// Creating an instance of GoogleSheetsWizard
const test = new GoogleSheetsWizard(auth, spreadsheetId);

//Here we will fetch all the data from columns A and B, starting from row 2.
test.getRange("A2:B").then((data) => {
  console.log(data);
});
```

**Response**

```
[
  ['Alice', 30],
  ['Bob', 25]
]
```

### Complete code Example with multiple functions and code modularization

```javascript
import { google } from "googleapis";
import GoogleSheetsWizard from "google-sheets-wizard";

const auth = new google.auth.GoogleAuth({
  //Here (in keyFile), place the address where you saved your credentials file.
  keyFile: "./service_account_auth_credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const spreadsheetId = "YOUR_SPREADSHEET_ID";

const sheetsWizard = new GoogleSheetsWizard(auth, spreadsheetId);

async function getUserData() {
  try {
    const data = await sheetsWizard.getRange("A1:B"); // Fetch data from range A1:B
    console.log(data);
  } catch (error) {
    // Custom errors will help you debug
    console.error(error.message);
  }
}

async function getUserLocation() {
  try {
    const data = await sheetsWizard.getRange("C:D"); // Fetch data from columns C and D
    console.log(data);
  } catch (error) {
    // Custom errors will help you debug
    console.error(error.message);
  }
}

getUserLocation().then(console.log);
getUserData().then(console.log);
```

**Response getUserData**

```javascript
[
  ["Alice", 30],
  ["Bob", 25],
  ["Damian", 25],
];
```

**Response getUserLocation**

```javascript
[
  ["Montevideo", "Uruguay"],
  ["Buenos Aires", "Argentina"],
  ["New York", "USA"],
];
```

### Example of automatic conversion to JavaScript object

**JavaScript code**

```javascript
const sheetsWizard = new GoogleSheetsWizard(auth, spreadsheetId);

const dataAsObjects = await sheetsWizard.getRange("A1:D3", [
  "name",
  "age",
  "city",
  "country",
]);
```

**Response**

```javascript
[
  {
    name: "Alice",
    age: "30",
    city: "Montevideo",
    country: "Uruguay",
  },
  {
    name: "Bob",
    age: "25",
    city: "Buenos Aires",
    country: "Argentina",
  },
  {
    name: "Damian",
    age: "25",
    city: "New York",
    country: "USA",
  },
];
```

## Api Reference

### `new GoogleSheetsWizard(auth, spreadsheetId)`

Creates an instance of the wizard.

- `auth`: A Google API authentication object.
- `spreadsheetId`: The ID of your Google Sheets spreadsheet.

### `getRange(range, objectKeys?)`

Fetches data from a specific range.

- `range`: The cell range to fetch (e.g., "A1:B5").
- `objectKeys` (optional): An array of property names to convert rows into objects.

## Contributing

Contributions are welcome! If you have suggestions or find any issues, please feel free to open an issue or submit a pull request.
