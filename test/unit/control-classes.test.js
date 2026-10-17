import { afterEach, expect, test } from "bun:test";
import {
  getDefaultControlClasses,
  normalizeControlClass,
  resolveControlClasses,
  setDefaultControlClasses,
} from "../../src/control-classes.js";

afterEach(() => setDefaultControlClasses({ month: "", year: "", nav: "" }));

test("author classes normalize whitespace and reject controls or reserved tokens", () => {
  expect(normalizeControlClass("a b")).toBe("a b");
  expect(normalizeControlClass("  a\t b\n a ")).toBe("a b");
  expect(normalizeControlClass('safe bad" onclick="alert(1) <tag> dp-skin')).toBe(
    'safe bad" onclick="alert(1) <tag>',
  );
  expect(
    normalizeControlClass("btn [&>svg]:size-4 data-[state=open]:bg-muted aria-[disabled=true]:opacity-50"),
  ).toBe("btn [&>svg]:size-4 data-[state=open]:bg-muted aria-[disabled=true]:opacity-50");
  expect(normalizeControlClass("safe bad\u0000token bad\u007ftoken dp-skin")).toBe("safe");
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
