import DateWizard from "../dist/index";

import { testPackage } from "../test-helpers/test-package";
describe("TEST BUILDED PACKAGE", () => {
  describe("require method", () => {
    const RequireDateWizard = require("../dist/index");
    testPackage(RequireDateWizard);
  });
  describe("import method", () => {
    testPackage(DateWizard);
  });
});
