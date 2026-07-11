import GoogleSheetsWizard from "./index";
import { testPackage } from "../test-helpers/test-package";

const mockGet = jest.fn();
const mockBatchGet = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    sheets: jest.fn(() => ({
      spreadsheets: { values: { get: mockGet, batchGet: mockBatchGet } },
    })),
  },
}));

// Direct handle to the underlying lib so we can exercise objectKeys mapping and
// handleError, which the thin class wrapper does not expose.
const getRange = require("./libs/getRange");
const { getRanges } = getRange;

// Package-level smoke checks (also run against the built artifact in dist-test).
testPackage(GoogleSheetsWizard);

describe("GoogleSheetsWizard.getRange", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("returns the raw rows as a 2D array when no objectKeys are given", async () => {
    mockGet.mockResolvedValue({
      data: { values: [["a", "b"], ["c", "d"]] },
    });

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    const result = await wizard.getRange("A1:B2");

    expect(mockGet).toHaveBeenCalledWith(
      { spreadsheetId: "sheet-id", range: "A1:B2" },
      expect.objectContaining({ timeout: 30000 })
    );
    expect(result).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("returns an empty list when the range returns an empty array", async () => {
    mockGet.mockResolvedValue({ data: { values: [] } });

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    await expect(wizard.getRange("A1:B2")).resolves.toEqual([]);
  });

  it("returns an empty list when the API response has no values field", async () => {
    mockGet.mockResolvedValue({ data: {} });

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    await expect(wizard.getRange("A1:B2")).resolves.toEqual([]);
  });
});

describe("getRange — transporte (timeout + keep-alive)", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("pasa el timeout por defecto (30s) y un agente keep-alive a la API", async () => {
    mockGet.mockResolvedValue({ data: { values: [["a"]] } });

    await new GoogleSheetsWizard("auth", "sheet-id").getRange("A1:A1");

    const options = mockGet.mock.calls[0][1];
    expect(options.timeout).toBe(30000);
    // El agente keep-alive va en cada request (evita repagar el handshake TLS).
    expect(options.agent).toBeDefined();
  });

  it("respeta un timeout custom pasado por el constructor", async () => {
    mockGet.mockResolvedValue({ data: { values: [["a"]] } });

    await new GoogleSheetsWizard("auth", "sheet-id", {
      timeoutMs: 5000,
    }).getRange("A1:A1");

    expect(mockGet.mock.calls[0][1].timeout).toBe(5000);
  });
});

describe("getRange lib — objectKeys mapping", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("maps each row to an object keyed by objectKeys", async () => {
    mockGet.mockResolvedValue({
      data: { values: [["1", "Alice"], ["2", "Bob"]] },
    });

    const result = await getRange("auth", "sheet-id", "A1:B2", ["id", "name"]);

    expect(result).toEqual([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);
  });

  it("fills missing cells with an empty string", async () => {
    mockGet.mockResolvedValue({
      data: { values: [["1"]] },
    });

    const result = await getRange("auth", "sheet-id", "A1:B1", ["id", "name"]);

    expect(result).toEqual([{ id: "1", name: "" }]);
  });

  it("rechaza objectKeys=[] con TypeError en vez de descartar los datos en silencio", async () => {
    // Sin el guard, [] (truthy) daría [{}, {}...] perdiendo todas las celdas.
    mockGet.mockResolvedValue({
      data: { values: [["1", "Alice"]] },
    });

    await expect(getRange("auth", "sheet-id", "A1:B1", [])).rejects.toThrow(
      TypeError
    );
  });
});

describe("getRange lib — coerción de tipos (invariante #3: los tipos no mienten)", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  // El invariante clave del paquete: getRange declara devolver `string` (Cell) y
  // coerciona cada celda con String(cell). La API `values.get` tipa las celdas como
  // `any[][]` y con FORMATTED_VALUE entrega strings, PERO un mock/config distinto puede
  // traer number/boolean/null. Sin este test, todos los mocks entregan solo strings, así
  // que reemplazar `String(cell)` por un `as Row[]` de confianza pasaría en verde mientras
  // el consumidor recibiría number/null tipados como string. Este test lo prohíbe.
  it("coerciona celdas no-string (number/boolean) a string en modo crudo", async () => {
    mockGet.mockResolvedValue({
      data: { values: [[1, true], [2.5, false]] },
    });

    const result = await getRange("auth", "sheet-id", "A1:B2");

    expect(result).toEqual([["1", "true"], ["2.5", "false"]]);
    // No basta con la igualdad: afirmamos el TIPO real en runtime (no `as`).
    for (const row of result) {
      for (const cell of row) expect(typeof cell).toBe("string");
    }
  });

  it("normaliza null/undefined a cadena vacía (no 'null'/'undefined')", async () => {
    mockGet.mockResolvedValue({
      data: { values: [[null, undefined, 0]] },
    });

    const result = await getRange("auth", "sheet-id", "A1:C1");

    expect(result).toEqual([["", "", "0"]]);
  });

  it("coerciona también en modo objectKeys (el mapeo no reintroduce el tipo crudo)", async () => {
    mockGet.mockResolvedValue({
      data: { values: [[42, null, true]] },
    });

    const result = await getRange("auth", "sheet-id", "A1:C1", ["n", "empty", "flag"]);

    expect(result).toEqual([{ n: "42", empty: "", flag: "true" }]);
    const [obj] = result;
    for (const v of Object.values(obj)) expect(typeof v).toBe("string");
  });
});

describe("getRange lib — error decoration", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("does not write to the console on failure (library must stay quiet)", async () => {
    // Gaxios-shaped error: HTTP status in `status` (number); `code` is a string.
    const apiError = Object.assign(new Error("Forbidden"), {
      status: 403,
      code: "ERR_BAD_REQUEST",
    });
    mockGet.mockRejectedValue(apiError);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow();
    expect(errSpy).not.toHaveBeenCalled();

    errSpy.mockRestore();
  });

  it("throws a clear permission error preserving the original as cause on a 403 (status)", async () => {
    const apiError = Object.assign(new Error("Forbidden"), { status: 403 });
    mockGet.mockRejectedValue(apiError);

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Permission error: make sure you have access to the spreadsheet."
    );
    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toMatchObject({
      cause: apiError,
    });
  });

  it("reads the status from response.status when the top-level status is absent", async () => {
    // Older/alternate Gaxios shapes expose the HTTP status only on response.
    const apiError = Object.assign(new Error("Forbidden"), {
      code: "ERR_BAD_REQUEST",
      response: { status: 403 },
    });
    mockGet.mockRejectedValue(apiError);

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Permission error: make sure you have access to the spreadsheet."
    );
  });

  it("does NOT treat a string Gaxios `code` as an HTTP status", async () => {
    // Regression guard: reading the status from `code` (a string in Gaxios)
    // would silently miss 403/404. A string code must fall through to default.
    const apiError = Object.assign(new Error("Forbidden"), {
      code: "ERR_BAD_REQUEST",
    });
    mockGet.mockRejectedValue(apiError);

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Error fetching data: Forbidden"
    );
  });

  it("throws a clear not-found error on a 404", async () => {
    const apiError = Object.assign(new Error("Missing"), { status: 404 });
    mockGet.mockRejectedValue(apiError);

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Spreadsheet not found. Check the spreadsheetId."
    );
  });

  it("falls back to the original message for an unknown error status", async () => {
    const apiError = Object.assign(new Error("kaboom"), { status: 500 });
    mockGet.mockRejectedValue(apiError);

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Error fetching data: kaboom"
    );
  });
});

describe("GoogleSheetsWizard.getRanges", () => {
  beforeEach(() => {
    mockBatchGet.mockReset();
  });

  it("fetches multiple ranges in a single batchGet call", async () => {
    mockBatchGet.mockResolvedValue({
      data: {
        valueRanges: [
          { range: "Sheet1!A1:B2", values: [["a", "b"]] },
          { range: "Sheet1!D1:D2", values: [["1"], ["2"]] },
        ],
      },
    });

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    const result = await wizard.getRanges(["Sheet1!A1:B2", "Sheet1!D1:D2"]);

    expect(mockBatchGet).toHaveBeenCalledTimes(1);
    expect(mockBatchGet).toHaveBeenCalledWith(
      {
        spreadsheetId: "sheet-id",
        ranges: ["Sheet1!A1:B2", "Sheet1!D1:D2"],
      },
      expect.objectContaining({ timeout: 30000 })
    );
    expect(result).toEqual([[["a", "b"]], [["1"], ["2"]]]);
  });

  it("preserves request order in the returned array", async () => {
    // La API documenta que el orden de valueRanges sigue el orden pedido; el
    // test emula esa garantía devolviendo los rangos en el mismo orden que
    // `ranges` para confirmar que result[i] corresponde a ranges[i].
    mockBatchGet.mockResolvedValue({
      data: {
        valueRanges: [
          { range: "Sheet1!C1", values: [["third"]] },
          { range: "Sheet1!A1", values: [["first"]] },
          { range: "Sheet1!B1", values: [["second"]] },
        ],
      },
    });

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    const result = await wizard.getRanges([
      "Sheet1!C1",
      "Sheet1!A1",
      "Sheet1!B1",
    ]);

    expect(result).toEqual([[["third"]], [["first"]], [["second"]]]);
  });

  it("maps each range's rows to objects when objectKeys is given", async () => {
    mockBatchGet.mockResolvedValue({
      data: {
        valueRanges: [
          { range: "Sheet1!A1:B2", values: [["1", "Alice"], ["2", "Bob"]] },
        ],
      },
    });

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    const result = await wizard.getRanges(["Sheet1!A1:B2"], ["id", "name"]);

    expect(result).toEqual([
      [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ],
    ]);
  });

  it("returns [] for a range with no values, without failing the whole batch", async () => {
    mockBatchGet.mockResolvedValue({
      data: {
        valueRanges: [
          { range: "Sheet1!A1:B2", values: [["a", "b"]] },
          { range: "Sheet1!Z1:Z2" }, // sin `values`: rango vacío
        ],
      },
    });

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    const result = await wizard.getRanges(["Sheet1!A1:B2", "Sheet1!Z1:Z2"]);

    expect(result).toEqual([[["a", "b"]], []]);
  });
});

describe("getRanges lib — chunking de rangos que exceden el límite por request", () => {
  beforeEach(() => {
    mockBatchGet.mockReset();
  });

  it("parte una lista grande de rangos en múltiples llamadas a batchGet respetando rangesPerChunk", async () => {
    // Sin un tope documentado por Google, este repo aplica un default conservador
    // (100) porque `ranges` viaja en la query string de un GET y el largo de URL
    // es el límite real. Acá forzamos un chunk chico (2) para no armar un array de
    // cientos de rangos en el test.
    mockBatchGet
      .mockResolvedValueOnce({
        data: {
          valueRanges: [
            { range: "A1", values: [["1"]] },
            { range: "A2", values: [["2"]] },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: { valueRanges: [{ range: "A3", values: [["3"]] }] },
      });

    const result = await getRanges(
      "auth",
      "sheet-id",
      ["A1", "A2", "A3"],
      undefined,
      undefined,
      2 // rangesPerChunk
    );

    expect(mockBatchGet).toHaveBeenCalledTimes(2);
    expect(mockBatchGet).toHaveBeenNthCalledWith(
      1,
      { spreadsheetId: "sheet-id", ranges: ["A1", "A2"] },
      expect.any(Object)
    );
    expect(mockBatchGet).toHaveBeenNthCalledWith(
      2,
      { spreadsheetId: "sheet-id", ranges: ["A3"] },
      expect.any(Object)
    );
    // El resultado se concatena en el mismo orden que los `ranges` pedidos,
    // sin importar que hayan viajado en llamadas HTTP distintas.
    expect(result).toEqual([[["1"]], [["2"]], [["3"]]]);
  });

  it("rechaza ranges=[] con TypeError", async () => {
    await expect(getRanges("auth", "sheet-id", [])).rejects.toThrow(TypeError);
    expect(mockBatchGet).not.toHaveBeenCalled();
  });

  it("rechaza objectKeys=[] con TypeError en vez de descartar los datos en silencio", async () => {
    mockBatchGet.mockResolvedValue({
      data: { valueRanges: [{ range: "A1", values: [["1"]] }] },
    });

    await expect(
      getRanges("auth", "sheet-id", ["A1"], [])
    ).rejects.toThrow(TypeError);
  });

  it("decora un error de la API (403) igual que getRange, sin loguear a consola", async () => {
    const apiError = Object.assign(new Error("Forbidden"), { status: 403 });
    mockBatchGet.mockRejectedValue(apiError);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(getRanges("auth", "sheet-id", ["A1"])).rejects.toThrow(
      "Permission error: make sure you have access to the spreadsheet."
    );
    expect(errSpy).not.toHaveBeenCalled();

    errSpy.mockRestore();
  });
});
