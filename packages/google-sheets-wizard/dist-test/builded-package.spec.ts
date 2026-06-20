import GoogleSheetsWizard from "../dist/index";

import { testPackage } from "../test-helpers/test-package";
describe("TEST BUILDED PACKAGE", () => {
  describe("require method", () => {
    const RequireGoogleSheetsWizard = require("../dist/index");
    testPackage(RequireGoogleSheetsWizard);
  });
  describe("import method", () => {
    testPackage(GoogleSheetsWizard);
  });
});
