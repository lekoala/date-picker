import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/test/fixtures/classic.html");
});

for (const order of ["override before definition", "defaults before override"]) {
  test(`partial control classes inherit live defaults: ${order}`, async ({ page }) => {
    if (order === "override before definition") {
      await page.goto("/test/fixtures/classic.html?partial=before");
    }
    const result = await page.evaluate((order) => {
      const Picker = customElements.get("date-picker");
      const elements = ["global-picker", "global-range", "global-calendar"].map((id) =>
        document.getElementById(id),
      );
      Picker.setDefaultControlClasses({ month: "global-month", year: "global-year", nav: "global-nav" });
      if (order === "defaults before override") {
        for (const element of elements) element.controlClasses = { month: " own-month own-month " };
      }
      const initial = elements.map((element) => element.controlClasses);
      Picker.setDefaultControlClasses({ month: "later-month", year: "later-year", nav: "later-nav" });
      const later = elements.map((element) => element.controlClasses);
      return { initial, later };
    }, order);
    expect(result.initial).toEqual(
      Array(3).fill({ month: "own-month", year: "global-year", nav: "global-nav" }),
    );
    expect(result.later).toEqual(Array(3).fill({ month: "own-month", year: "later-year", nav: "later-nav" }));
    for (const id of ["global-picker", "global-range", "global-calendar"]) {
      await expect(page.locator(`#${id} .dp-month-select`)).toHaveClass("dp-month-select own-month");
      await expect(page.locator(`#${id} .dp-year-input`)).toHaveClass("dp-year-input later-year");
      await expect(page.locator(`#${id} .dp-next`)).toHaveClass("dp-nav dp-next later-nav");
    }
    const reset = await page.evaluate(() => {
      const elements = ["global-picker", "global-range", "global-calendar"].map((id) =>
        document.getElementById(id),
      );
      for (const element of elements) element.controlClasses = { nav: "" };
      customElements
        .get("date-picker")
        .setDefaultControlClasses({ month: "latest-month", nav: "latest-nav" });
      const skin = elements.map((element) => ({
        classes: element.controlClasses,
        navSkin: element.querySelector(".dp-next").classList.contains("dp-skin"),
      }));
      for (const element of elements) element.controlClasses = null;
      return { skin, inherited: elements.map((element) => element.controlClasses) };
    });
    expect(reset.skin).toEqual(
      Array(3).fill({ classes: { month: "latest-month", year: "later-year", nav: "" }, navSkin: true }),
    );
    expect(reset.inherited).toEqual(
      Array(3).fill({ month: "latest-month", year: "later-year", nav: "latest-nav" }),
    );
  });
}

test("classic constructors share defaults and return defensive copies", async ({ page }) => {
  const result = await page.evaluate(() => {
    const Picker = customElements.get("date-picker");
    const Calendar = customElements.get("date-calendar");
    Picker.setDefaultControlClasses({ month: "host-select", year: "host-input", nav: "host-button" });
    Picker.setDefaultMessages({ nextMonth: "Next shared month" });
    const classes = Calendar.getDefaultControlClasses();
    const messages = Calendar.getDefaultMessages();
    classes.month = "mutated";
    messages.nextMonth = "mutated";
    const picker = document.createElement("date-picker");
    picker.innerHTML = "<input>";
    const calendar = document.createElement("date-calendar");
    document.body.append(picker, calendar);
    Calendar.setDefaultControlClasses({ nav: "later-button" });
    Calendar.setDefaultMessages({ nextMonth: "Later month" });
    return {
      controls: [picker, calendar].map((element) => ({
        month: element.querySelector(".dp-month-select").classList.contains("host-select"),
        year: element.querySelector(".dp-year-input").classList.contains("host-input"),
        nav: element.querySelector(".dp-next").classList.contains("later-button"),
        next: element.querySelector(".dp-next").getAttribute("aria-label"),
      })),
      classes: Picker.getDefaultControlClasses(),
      next: Picker.getDefaultMessages().nextMonth,
      existing: document.getElementById("calendar").messages.nextMonth,
    };
  });
  expect(result.controls).toEqual(Array(2).fill({ month: true, year: true, nav: true, next: "Later month" }));
  expect(result.classes).toEqual({ month: "host-select", year: "host-input", nav: "later-button" });
  expect(result.next).toBe("Later month");
  expect(result.existing).toBe("Forward");
});

test("defaults update initial markup, open popups and range fields while preserving overrides", async ({
  page,
}) => {
  await page.evaluate(() => {
    customElements
      .get("date-picker")
      .setDefaultControlClasses({ month: "global-select", year: "global-input", nav: "global-button" });
    customElements.get("date-picker").setDefaultMessages({
      chooseDate: "Global choice",
      nextMonth: "Global next",
      calendar: "Global calendar",
      rangeStart: "Global start",
      invalidDate: "Global invalid",
    });
  });
  for (const id of ["global-picker", "global-range", "global-calendar"]) {
    await expect(page.locator(`#${id} .dp-month-select`)).toHaveClass(/global-select/);
    await expect(page.locator(`#${id} .dp-next`)).toHaveAttribute("aria-label", "Global next");
  }
  await expect(page.locator("#global-picker .dp-picker-button")).toHaveAttribute(
    "aria-label",
    "Global choice",
  );
  await expect(page.locator("#global-range .dp-picker-button").first()).toHaveAttribute(
    "aria-label",
    "Global choice, Global start",
  );
  await expect(page.locator("#picker .dp-month-select")).toHaveClass(/select sm/);
  await expect(page.locator("#calendar .dp-next")).toHaveAttribute("aria-label", "Forward");
  await page.locator("#global-picker .dp-picker-button").click();
  const state = await page.evaluate(async () => {
    const picker = document.getElementById("global-picker");
    const before = [
      picker.calendar.value,
      picker.calendar.display,
      picker.calendar.focusedDate,
      document.activeElement.dataset.date,
    ];
    customElements.get("date-calendar").setDefaultControlClasses({ month: "updated-select" });
    customElements
      .get("date-calendar")
      .setDefaultMessages({ nextMonth: "Updated next", calendar: "Updated calendar" });
    await Promise.resolve();
    return {
      before,
      after: [
        picker.calendar.value,
        picker.calendar.display,
        picker.calendar.focusedDate,
        document.activeElement.dataset.date,
      ],
      open: picker.open,
    };
  });
  expect(state.after).toEqual(state.before);
  expect(state.open).toBe(true);
  await expect(page.locator("#global-picker .dp-month-select")).toHaveClass(/updated-select/);
  await expect(page.locator("#global-picker .dp-picker-panel")).toHaveAttribute(
    "aria-label",
    "Updated calendar",
  );
  await expect(page.locator("#global-calendar .dp-next")).toHaveAttribute("aria-label", "Updated next");
  const invalid = await page.evaluate(async () => {
    const picker = document.getElementById("global-picker");
    picker.input.value = "invalid";
    await picker.validate();
    const range = document.getElementById("global-range");
    const input = range.querySelector("[data-range-end]");
    input.value = "invalid";
    await range.validate();
    return [picker.input.validationMessage, input.validationMessage];
  });
  expect(invalid).toEqual(["Global invalid", "Global invalid"]);
});

test("null resumes defaults and disconnected instances refresh when reconnected", async ({ page }) => {
  const result = await page.evaluate(() => {
    const Picker = customElements.get("date-picker");
    const calendar = document.getElementById("global-calendar");
    const picker = document.getElementById("global-picker");
    // An empty class map inherits every role; messages keep their instance override.
    calendar.controlClasses = {};
    calendar.messages = {};
    picker.controlClasses = { month: "own-select" };
    picker.messages = { chooseDate: "Own choice" };
    Picker.setDefaultControlClasses({ month: "live-select" });
    Picker.setDefaultMessages({ nextMonth: "Live next" });
    const pinned = [calendar.controlClasses.month, calendar.messages.nextMonth];
    calendar.controlClasses = null;
    calendar.messages = null;
    picker.controlClasses = null;
    picker.messages = null;
    calendar.remove();
    picker.remove();
    let renders = 0;
    const render = calendar.render.bind(calendar);
    calendar.render = () => {
      renders++;
      render();
    };
    Picker.setDefaultControlClasses({ month: "reconnected-select" });
    Picker.setDefaultMessages({ chooseDate: "Reconnected choice", nextMonth: "Reconnected next" });
    const detachedRenders = renders;
    document.body.append(calendar, picker);
    return {
      pinned,
      detachedRenders,
      classes: [calendar.controlClasses.month, picker.controlClasses.month],
      next: calendar.messages.nextMonth,
    };
  });
  expect(result).toEqual({
    pinned: ["live-select", "Next month"],
    detachedRenders: 0,
    classes: ["reconnected-select", "reconnected-select"],
    next: "Reconnected next",
  });
  await expect(page.locator("#global-picker .dp-picker-button")).toHaveAttribute(
    "aria-label",
    "Reconnected choice",
  );
  await expect(page.locator("#global-calendar .dp-month-select")).toHaveClass(/reconnected-select/);
});

test("pre-definition assignments reach every writable public accessor", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.reload();
  const result = await page.evaluate(async () => {
    const picker = document.getElementById("picker");
    const range = document.getElementById("range");
    const calendar = document.getElementById("calendar");
    range.calendar.display = "2026-09";
    await Promise.all(
      [picker.calendar, range.calendar, calendar].map((element) => element.ensureDate("2026-09-12")),
    );
    return {
      shadowed: [picker, range, calendar].flatMap((element) =>
        Object.entries(Object.getOwnPropertyDescriptors(Object.getPrototypeOf(element)))
          .filter(([name, descriptor]) => descriptor.set && Object.hasOwn(element, name))
          .map(([name]) => name),
      ),
      options: [picker, range, calendar].map((element) => ({
        locale: element.locale,
        min: element.min,
        max: element.max,
        monthFormat: element.monthFormat,
        classes: element.controlClasses,
        next: element.messages.nextMonth,
        callbacks: [element.source, element.dateState, element.renderDay, element.isDateDisabled].map(
          (value) => typeof value,
        ),
      })),
      value: picker.value,
      range: range.range,
      display: calendar.display,
      focused: calendar.focusedDate,
      selected: calendar.value,
      band: calendar.highlightedRange,
      selection: calendar.selection,
      firstDay: calendar.firstDay,
      fixedWeeks: calendar.fixedWeeks,
      weeks: calendar.showWeekNumbers,
      openOnFocus: picker.openOnFocus,
      coordinateSpace: picker.coordinateSpace,
    };
  });
  expect(result.shadowed).toEqual([]);
  for (const options of result.options) {
    expect(options).toEqual({
      locale: "en-GB",
      min: "2026-01-01",
      max: "2027-12-31",
      monthFormat: "short",
      classes: { month: "select sm", year: "input sm", nav: "btn outline sm icon-only" },
      next: "Forward",
      callbacks: Array(4).fill("function"),
    });
  }
  expect(result).toMatchObject({
    value: "2026-09-10",
    range: { start: "2026-09-10", end: "2026-09-15" },
    display: "2026-09",
    focused: "2026-09-11",
    selected: "2026-09-10",
    band: { start: "2026-09-10", end: "2026-09-15" },
    selection: "none",
    firstDay: 0,
    fixedWeeks: true,
    weeks: true,
    openOnFocus: false,
    coordinateSpace: "document",
  });
  for (const selector of ["#picker", "#range", "#calendar"]) {
    await expect(page.locator(`${selector} .dp-month-select`)).toHaveClass(/select sm/);
    await expect(page.locator(`${selector} .dp-next`)).toHaveAttribute("aria-label", "Forward");
    await expect(page.locator(`${selector} .dp-day[data-date='2026-09-12']`)).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  }
  expect(errors).toEqual([]);
});
