import { google } from "googleapis";

import type { SheetsAuth } from "../index";

/** A single cell value as returned by the Sheets v4 API. */
export type Cell = string | number | boolean | null;

/** A row is an ordered list of cell values. */
export type Row = Cell[];

/** A row mapped onto the supplied `objectKeys`. */
export type MappedRow = Record<string, Cell>;

async function getRange(
  auth: SheetsAuth,
  spreadsheetId: string,
  range: string,
  objectKeys?: string[]
): Promise<Row[] | MappedRow[]> {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = res.data.values as Row[] | undefined;
    if (!rows || rows.length === 0) {
      // Un rango vacío (hoja/columna vacía, filtro sin resultados) es un
      // resultado NORMAL de negocio, no un fallo: devolvemos lista vacía y
      // reservamos las excepciones para errores reales de la API. Obligar al
      // consumidor a try/catch + string-matching de "No data found" para
      // distinguir "vacío" de "roto" es hostil.
      return [];
    }

    if (objectKeys) {
      return rows.map((row) =>
        objectKeys.reduce<MappedRow>((obj, key, index) => {
          obj[key] = row[index] ?? "";
          return obj;
        }, {})
      );
    }

    return rows;
  } catch (error) {
    // A library must not pollute the consumer's stdout/stderr. Instead of
    // logging, enrich the error with a clear, human-readable message and
    // re-throw it so the caller decides how to surface or log it.
    throw decorateError(error);
  }
}

/**
 * Shape of the error objects thrown by the `googleapis` Sheets client (Gaxios).
 *
 * The HTTP status lives in `status` (a number) or `response.status`. Note that
 * Gaxios' `code` is a *string* (e.g. `"ERR_BAD_REQUEST"`), NOT the HTTP status —
 * reading the status from `code` silently misses every 403/404 in production.
 */
interface SheetsApiError {
  status?: number;
  response?: { status?: number };
  message?: string;
}

function isSheetsApiError(error: unknown): error is SheetsApiError {
  return typeof error === "object" && error !== null;
}

/** Extracts the HTTP status code from a Gaxios-style error, if present. */
function httpStatusOf(error: SheetsApiError): number | undefined {
  return error.status ?? error.response?.status;
}

/**
 * Maps a low-level Sheets API failure to a clearer `Error` without writing to
 * the console. The original error is preserved as `cause`.
 */
function decorateError(error: unknown): Error {
  const apiError: SheetsApiError = isSheetsApiError(error) ? error : {};
  const message = apiError.message ?? String(error);

  let friendly: string;
  switch (httpStatusOf(apiError)) {
    case 403:
      friendly =
        "Permission error: make sure you have access to the spreadsheet.";
      break;
    case 404:
      friendly = "Spreadsheet not found. Check the spreadsheetId.";
      break;
    default:
      // (El caso "No data found" ya no existe: rango vacío devuelve [] en vez
      // de lanzar — ver getRange.)
      friendly = `Error fetching data: ${message}`;
  }

  const decorated = new Error(friendly);
  // Preserve the original error for callers that want to inspect it, without
  // depending on the ES2022 `Error(message, { cause })` constructor overload
  // (this package targets es2016).
  (decorated as Error & { cause?: unknown }).cause = error;
  return decorated;
}

export default getRange;

// The whole module IS the function for CommonJS consumers (and for index.ts's
// runtime require); the `export default` above only adds the typed ES entry.
module.exports = getRange;
