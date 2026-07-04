import { google } from "googleapis";
import type { Common } from "googleapis";
import { Agent } from "https";

// Pool de sockets keep-alive (como el lado YouTube: maxSockets 10). Sin esto, cada
// getRange reconstruye la conexión y repaga el handshake TLS. Es nivel de
// transporte, así que se comparte entre distintas `auth`.
const keepAliveAgent = new Agent({ keepAlive: true, maxSockets: 10 });

// Timeout por defecto del request (ms). googleapis/gaxios NO trae timeout (0 =
// infinito): una conexión colgada (peer que no cierra, red caída post-handshake)
// dejaría la Promise sin resolver y bloquearía al consumidor para siempre. Igualamos
// el tope de 30s que el transporte de YouTube ya aplica — cerrar esa asimetría.
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Credentials accepted by the Google Sheets API. Coincide con la union `auth` del
 * cliente Sheets v4 de `googleapis`, así el consumidor obtiene autocompletado y
 * errores en tiempo de compilación en vez de `any`.
 *
 * (Definido acá, donde se usa, para no crear un ciclo de imports con index.ts; index
 * lo re-exporta como parte de la API pública.)
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
 * A single cell value. Con el render por defecto de la API (FORMATTED_VALUE, que
 * es el que usa este wrapper) los valores llegan siempre como `string`; por eso el
 * tipo es `string` y no `string | number | boolean`, que sería mentir respecto de
 * lo que el consumidor recibe en runtime.
 */
export type Cell = string;

/** A row is an ordered list of cell values. */
export type Row = Cell[];

/** A row mapped onto the supplied `objectKeys`. */
export type MappedRow = Record<string, Cell>;

async function getRange(
  auth: SheetsAuth,
  spreadsheetId: string,
  range: string,
  objectKeys?: string[],
  timeoutMs?: number
): Promise<Row[] | MappedRow[]> {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get(
      { spreadsheetId, range },
      { timeout: timeoutMs ?? DEFAULT_TIMEOUT_MS, agent: keepAliveAgent }
    );

    const raw = res.data.values;
    if (!raw || raw.length === 0) {
      // Un rango vacío (hoja/columna vacía, filtro sin resultados) es un
      // resultado NORMAL de negocio, no un fallo: devolvemos lista vacía y
      // reservamos las excepciones para errores reales de la API. Obligar al
      // consumidor a try/catch + string-matching de "No data found" para
      // distinguir "vacío" de "roto" es hostil.
      return [];
    }

    // `res.data.values` es `any[][]` en los tipos de googleapis. En vez de un
    // `as Row[]` de confianza, coercionamos cada celda a string (lo que la API
    // realmente entrega con FORMATTED_VALUE; null/hueco -> ""): el tipo publico
    // deja de mentir y no hay cast sin validacion.
    const rows: Row[] = raw.map((row) =>
      row.map((cell) => (cell === null || cell === undefined ? "" : String(cell)))
    );

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
