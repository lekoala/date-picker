import { expect, test } from "bun:test";
import { createDateAdapter } from "../../src/intl.js";

/** @param {string} locale */
function maskOf(locale) {
  const adapter = createDateAdapter(locale);
  if (!adapter.mask) throw new Error(`expected a mask for ${locale}`);
  return adapter.mask;
}

test("typing digits inserts locale separators and keeps the caret after the last digit", () => {
  const mask = maskOf("fr-BE");
  const steps = ["2", "29", "291", "2910", "29102", "291020", "2910202", "29102026"];
  const rendered = steps.map((digits) => mask.render(digits));
  expect(rendered).toEqual(["2", "29", "29/1", "29/10", "29/10/2", "29/10/20", "29/10/202", "29/10/2026"]);
  expect(steps.map((digits) => mask.caretIndex(digits, digits.length))).toEqual([1, 2, 4, 5, 7, 8, 9, 10]);
});

test("the mask follows the locale component order", () => {
  expect(maskOf("en-US").render("10292026")).toBe("10/29/2026");
  expect(maskOf("de-DE").render("29102026")).toBe("29.10.2026");
  expect(maskOf("sv-SE").render("20261029")).toBe("2026-10-29");
});

test("the adapter exposes the length of one complete value as the field bound", () => {
  expect(createDateAdapter("fr-BE").entryLength).toBe(10);
  expect(createDateAdapter("en-US").entryLength).toBe(10);
  expect(createDateAdapter("sv-SE").entryLength).toBe(10);
  // Bidi marks and spaced literals widen the bound with the format itself.
  expect(createDateAdapter("ar-EG").entryLength).toBe(12);
  expect(createDateAdapter("ko-KR").entryLength).toBe(13);
});

test("only drafts the mask could have produced are re-rendered", () => {
  const mask = maskOf("fr-BE");
  for (const draft of ["2", "29", "29/", "29/1", "29/10", "29/10/", "29/10/2026"]) {
    expect(mask.accepts(draft)).toBe(true);
  }
  // Whitespace is a separator, so a space at a group boundary stays a
  // projection: no digit changes component.
  for (const draft of ["29 10 2026", "29 1"]) {
    expect(mask.accepts(draft)).toBe(true);
  }
  // A separator typed inside a group is explicit input: never redistributed.
  // That holds for whitespace too: skipping it would move the following digits
  // into another component (`2 9 2026` would become `29/20/26`).
  for (const draft of ["2/9/2026", "2/9/202", "1/1", "garbage", "29//10", "/29", "2 9 2026", "2 "]) {
    expect(mask.accepts(draft)).toBe(false);
  }
  // More digits than the pattern holds are never truncated silently.
  for (const draft of ["291020269", "29/10/20926"]) {
    expect(mask.accepts(draft)).toBe(false);
  }
});

test("normalization is idempotent for every locale formatted value", () => {
  const locales = [
    "ar",
    "de",
    "en",
    "es",
    "fr",
    "hi",
    "id",
    "it",
    "ja",
    "ko",
    "nl",
    "pl",
    "pt-BR",
    "pt-PT",
    "ru",
    "tr",
    "zh-CN",
    "hu-HU",
    "bg-BG",
    "ko-KR",
    "th-TH",
    "fa-IR",
    "ar-EG",
  ];
  const failures = locales.filter((locale) => {
    const adapter = createDateAdapter(locale);
    const formatted = adapter.format("2026-09-06");
    if (!adapter.mask) return false;
    return adapter.mask.render(adapter.mask.digits(formatted)) !== formatted;
  });
  expect(failures).toEqual([]);
});

test("localized digits round-trip through the mask", () => {
  const adapter = createDateAdapter("ar-EG");
  const mask = adapter.mask;
  expect(mask).not.toBeNull();
  const formatted = adapter.format("2026-10-29");
  expect(mask.render("29102026")).toBe(formatted);
  expect(mask.digits(formatted)).toBe("29102026");
});

test("the adapter accepts separator variants and compact entry without guessing the order", () => {
  const be = createDateAdapter("fr-BE");
  expect(be.parse("29-10-2026")).toBe("2026-10-29");
  expect(be.parse("29.10.2026")).toBe("2026-10-29");
  expect(be.parse("29 10 2026")).toBe("2026-10-29");
  expect(be.parse("29102026")).toBe("2026-10-29");
  expect(be.parse("2/9/2026")).toBe("2026-09-02");
  // A foreign order and an implicit two-digit year stay invalid.
  expect(be.parse("10/29/2026")).toBe("");
  expect(be.parse("29/10/26")).toBe("");
  expect(be.parse("31/02/2026")).toBe("");
  const us = createDateAdapter("en-US");
  expect(us.parse("10-29-2026")).toBe("2026-10-29");
  expect(us.parse("10292026")).toBe("2026-10-29");
  expect(us.parse("20261029")).toBe("");
});

test("formats with embedded literals keep plain typing", () => {
  const korean = createDateAdapter("ko-KR");
  expect(korean.mask).toBeNull();
  expect(korean.parse("2026. 09. 06.")).toBe("2026-09-06");
  expect(korean.parse("2026-09-06")).toBe("2026-09-06");
});
