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

// Overloads: el input decide la forma del retorno, sin union ni cast.
// Sin objectKeys -> filas crudas; con objectKeys -> objetos mapeados.
expectType<Promise<Row[]>>(wizard.getRange("A1:B2"));
expectType<Promise<MappedRow[]>>(wizard.getRange("A1:B2", ["id", "name"]));

// getRanges: mismo patrón de overloads, un nivel de array extra (uno por rango
// pedido). result[i] corresponde a ranges[i].
expectType<Promise<Row[][]>>(wizard.getRanges(["A1:B2", "D1:D2"]));
expectType<Promise<MappedRow[][]>>(
  wizard.getRanges(["A1:B2"], ["id", "name"])
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
