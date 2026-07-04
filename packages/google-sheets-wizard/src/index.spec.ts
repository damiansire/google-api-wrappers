import GoogleSheetsWizard from "./index";
import { testPackage } from "../test-helpers/test-package";

const mockGet = jest.fn();

jest.mock("googleapis", () => ({
  google: {
    sheets: jest.fn(() => ({
      spreadsheets: { values: { get: mockGet } },
    })),
  },
}));

// Direct handle to the underlying lib so we can exercise objectKeys mapping and
// handleError, which the thin class wrapper does not expose.
const getRange = require("./libs/getRange");

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
