/**
 * Structural shape of the GoogleSheetsWizard constructor, so the helper works
 * against both the source class and the built artifact without `any`.
 */
type GoogleSheetsWizardCtor = new (
  auth: string,
  spreadsheetId: string
) => {
  auth: unknown;
  spreadsheetId: unknown;
  getRange: (range: string, objectKeys?: string[]) => Promise<unknown>;
};

export const testPackage = (GoogleSheetsWizard: GoogleSheetsWizardCtor) => {
  describe("GoogleSheetsWizard package exports", () => {
    it("exposes the GoogleSheetsWizard class", () => {
      expect(GoogleSheetsWizard).toBeDefined();
      expect(typeof GoogleSheetsWizard).toBe("function");
    });

    it("stores auth and spreadsheetId and exposes getRange", () => {
      const wizard = new GoogleSheetsWizard("my-auth", "my-sheet-id");
      expect(wizard.spreadsheetId).toBe("my-sheet-id");
      expect(wizard.auth).toBe("my-auth");
      expect(typeof wizard.getRange).toBe("function");
    });
  });
};
