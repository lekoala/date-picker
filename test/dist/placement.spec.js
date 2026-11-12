import { test } from "@playwright/test";
import { placementTests } from "../helpers/placement.js";

for (const path of ["/test/fixtures/classic.html", "/test/fixtures/dist.html"]) {
  test.describe(path, () => placementTests(path));
}
