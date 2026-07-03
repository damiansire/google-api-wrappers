import { expectType, expectError, expectAssignable } from "tsd";
import GoogleSheetsWizard from "google-sheets-wizard";
import type { SheetsAuth } from "google-sheets-wizard";

// The cell/row shape the public API resolves to (mirrors the lib's own types).
// Con el render por defecto (FORMATTED_VALUE) la API devuelve strings.
type Cell = string;
type Row = Cell[];
type MappedRow = Record<string, Cell>;

// The constructor takes (auth, spreadsheetId). A string token is valid auth.
const wizard = new GoogleSheetsWizard("my-token", "sheet-id");
expectType<GoogleSheetsWizard>(wizard);

// A bare string is assignable to SheetsAuth (the simplest 85% case).
expectAssignable<SheetsAuth>("my-token");

// getRange(range, objectKeys?) -> Promise<Row[] | MappedRow[]>.
expectType<Promise<Row[] | MappedRow[]>>(wizard.getRange("A1:B2"));
expectType<Promise<Row[] | MappedRow[]>>(
  wizard.getRange("A1:B2", ["id", "name"])
);

// Public instance fields are typed (no `any`).
expectType<string>(wizard.spreadsheetId);
expectType<SheetsAuth>(wizard.auth);

// Negative cases: the API must reject malformed calls at compile time.
expectError(new GoogleSheetsWizard());
expectError(new GoogleSheetsWizard("token"));
expectError(new GoogleSheetsWizard(123, "sheet-id"));
expectError(wizard.getRange(123));
expectError(wizard.getRange("A1:B2", "not-an-array"));
