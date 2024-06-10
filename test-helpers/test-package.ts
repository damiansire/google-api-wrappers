export const testPackage = (YOUR_PACKAGE: any) => {
  describe("YOUR_PACKAGE", () => {
    let wizard: any;

    beforeAll(() => {
      expect(YOUR_PACKAGE).toBeDefined();
    });
  });
};
