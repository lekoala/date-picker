import { expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDefaultMessages } from "../../src/messages.js";

const localeDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../src/locales");

const localeFiles = readdirSync(localeDir)
  .filter((file) => file.endsWith(".js"))
  .sort();

const expectedKeys = Object.keys(getDefaultMessages()).sort();

for (const file of localeFiles) {
  test(`locale ${path.basename(file, ".js")} mirrors the default message keys`, async () => {
    const locale = (await import(path.join(localeDir, file))).default;
    expect(Object.keys(locale).sort()).toEqual(expectedKeys);
  });

  test(`locale ${path.basename(file, ".js")} has no empty strings`, async () => {
    const locale = (await import(path.join(localeDir, file))).default;
    for (const [key, value] of Object.entries(locale)) {
      expect(`${value}`.trim(), `${path.basename(file, ".js")}.${key}`).not.toBe("");
    }
  });
}
