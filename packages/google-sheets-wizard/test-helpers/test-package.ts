export const testPackage = (GoogleSheetsWizard: any) => {
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
