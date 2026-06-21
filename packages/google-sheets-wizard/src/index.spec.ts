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

    expect(mockGet).toHaveBeenCalledWith({
      spreadsheetId: "sheet-id",
      range: "A1:B2",
    });
    expect(result).toEqual([["a", "b"], ["c", "d"]]);
  });

  it("throws when the range returns an empty array", async () => {
    mockGet.mockResolvedValue({ data: { values: [] } });

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    await expect(wizard.getRange("A1:B2")).rejects.toThrow(
      "No data found in the specified range."
    );
  });

  it("throws when the API response has no values field", async () => {
    mockGet.mockResolvedValue({ data: {} });

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    await expect(wizard.getRange("A1:B2")).rejects.toThrow(
      "No data found in the specified range."
    );
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
});

describe("getRange lib — error decoration", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("does not write to the console on failure (library must stay quiet)", async () => {
    const apiError: { code: number; message: string } = Object.assign(
      new Error("Forbidden"),
      { code: 403 }
    );
    mockGet.mockRejectedValue(apiError);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow();
    expect(errSpy).not.toHaveBeenCalled();

    errSpy.mockRestore();
  });

  it("throws a clear permission error preserving the original as cause on a 403", async () => {
    const apiError = Object.assign(new Error("Forbidden"), { code: 403 });
    mockGet.mockRejectedValue(apiError);

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Permission error: make sure you have access to the spreadsheet."
    );
    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toMatchObject({
      cause: apiError,
    });
  });

  it("throws a clear not-found error on a 404", async () => {
    const apiError = Object.assign(new Error("Missing"), { code: 404 });
    mockGet.mockRejectedValue(apiError);

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Spreadsheet not found. Check the spreadsheetId."
    );
  });

  it("falls back to the original message for an unknown error code", async () => {
    const apiError = Object.assign(new Error("kaboom"), { code: 500 });
    mockGet.mockRejectedValue(apiError);

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Error fetching data: kaboom"
    );
  });
});
