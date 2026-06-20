export const testPackage = (GoogleSheetsWizard: any) => {
  describe("GoogleSheetsWizard", () => {
    let wizard: any;

    beforeAll(() => {
      expect(GoogleSheetsWizard).toBeDefined();
    });

    it("it is defined", () => {
      expect(GoogleSheetsWizard).toBeDefined();
    });
  });
};
