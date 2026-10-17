import { afterEach, expect, test } from "bun:test";
import {
  getDefaultControlClasses,
  normalizeControlClass,
  resolveControlClasses,
  setDefaultControlClasses,
} from "../../src/control-classes.js";

afterEach(() => setDefaultControlClasses({ month: "", year: "", nav: "" }));

test("author classes normalize whitespace and reject unsafe or reserved tokens", () => {
  expect(normalizeControlClass("a b")).toBe("a b");
  expect(normalizeControlClass("  a\t b\n a ")).toBe("a b");
  expect(normalizeControlClass('safe bad" onclick="alert(1) <tag> dp-skin')).toBe("safe");
  expect(normalizeControlClass("")).toBe("");
  expect(normalizeControlClass(null)).toBe("");
  expect(normalizeControlClass("a&b hover:bg-red")).toBe("a&b hover:bg-red");
});

test("defaults merge by role, return copies and allow explicit skin resets", () => {
  setDefaultControlClasses({ month: " select  sm ", nav: "btn" });
  setDefaultControlClasses({ year: "input" });
  const copy = getDefaultControlClasses();
  copy.month = "changed";
  expect(resolveControlClasses({ month: "" })).toEqual({ month: "", year: "input", nav: "btn" });
  expect(resolveControlClasses(null)).toEqual({ month: "select sm", year: "input", nav: "btn" });
});
