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
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    await expect(wizard.getRange("A1:B2")).rejects.toThrow(
      "No data found in the specified range."
    );

    errSpy.mockRestore();
  });

  it("throws when the API response has no values field", async () => {
    mockGet.mockResolvedValue({ data: {} });
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    const wizard = new GoogleSheetsWizard("auth-token", "sheet-id");
    await expect(wizard.getRange("A1:B2")).rejects.toThrow(
      "No data found in the specified range."
    );

    errSpy.mockRestore();
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

describe("getRange lib — handleError", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("logs a permission message and re-throws on a 403", async () => {
    const apiError: any = new Error("Forbidden");
    apiError.code = 403;
    mockGet.mockRejectedValue(apiError);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Forbidden"
    );
    expect(errSpy).toHaveBeenCalledWith(
      "Permission error: Make sure you have access to the spreadsheet."
    );

    errSpy.mockRestore();
  });

  it("logs a not-found message and re-throws on a 404", async () => {
    const apiError: any = new Error("Missing");
    apiError.code = 404;
    mockGet.mockRejectedValue(apiError);
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(getRange("auth", "sheet-id", "A1:B2")).rejects.toThrow(
      "Missing"
    );
    expect(errSpy).toHaveBeenCalledWith(
      "Spreadsheet not found. Check the spreadsheetId."
    );

    errSpy.mockRestore();
  });
});
