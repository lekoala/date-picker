import "../src/define.js";
import { dates, linkDateRange } from "../src/index.js";
import fr from "../src/locales/fr.js";

for (const element of document.querySelectorAll("date-calendar, date-picker")) {
  element.messages = fr;
}

const inline = document.getElementById("inline");
const inlineState = document.getElementById("inline-state");
inline.addEventListener("datechange", (event) => {
  inlineState.textContent = `value: ${event.detail.value}; display: ${inline.display}; focused: ${inline.focusedDate}`;
});

const form = document.getElementById("simple-form");
const formState = document.getElementById("form-state");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  formState.textContent = `submitted date=${data.get("date")}`;
});

const constrained = document.getElementById("constrained");
constrained.isDateDisabled = (date) => [0, 6].includes(dates.dayOfWeek(date));
constrained.dateState = (date) => ({
  enabled: date === "2026-09-12" ? true : undefined,
  description:
    date === "2026-09-12"
      ? "Ouverture exceptionnelle"
      : [0, 6].includes(dates.dayOfWeek(date))
        ? "Cabinet fermé"
        : "Disponible",
});

const start = document.getElementById("start-picker");
const end = document.getElementById("end-picker");
const rangeState = document.getElementById("range-state");
start.messages = fr;
end.messages = fr;
linkDateRange(start, end);
function updateRange() {
  rangeState.textContent = `start=${start.value || "—"}; end=${end.value || "—"}; effective end.min=${end.min || "—"}; start.max=${start.max || "—"}`;
}
start.addEventListener("valuechange", updateRange);
end.addEventListener("valuechange", updateRange);
updateRange();

const availability = document.getElementById("availability");
availability.source = async ({ start, end }, { signal }) => {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 80);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
  const states = {};
  for (let date = start; dates.compareDates(date, end) <= 0; date = dates.addDays(date, 1)) {
    const day = Number(date.slice(8, 10));
    if (day % 3 === 0)
      states[date] = { morning: true, afternoon: true, description: "Disponible matin et après-midi" };
    else if (day % 2 === 0)
      states[date] = { morning: true, afternoon: false, description: "Disponible le matin" };
  }
  return { dates: states };
};
availability.renderDay = (_date, state) => {
  if (!state.morning && !state.afternoon) return "";
  const span = document.createElement("span");
  span.className = "availability";
  if (state.morning) span.append(document.createElement("i"));
  if (state.afternoon) span.append(document.createElement("i"));
  return span;
};

const mini = document.getElementById("mini");
const agenda = document.getElementById("agenda");
let anchorDate = agenda.getAttribute("date");
mini.dateState = (date) => ({
  description: date === anchorDate ? "Date affichée dans l’agenda" : "Naviguer à cette date",
  anchor: date === anchorDate,
});
mini.renderDay = (date) => {
  if (Number(date.slice(8, 10)) % 5 !== 0) return "";
  const span = document.createElement("span");
  span.className = "availability";
  span.append(document.createElement("i"));
  return span;
};
mini.addEventListener("dateactivate", (event) => {
  agenda.gotoDate(event.detail.date);
});
agenda.addEventListener("calendar:datechange", (event) => {
  anchorDate = event.detail.date.toString();
  mini.display = anchorDate.slice(0, 7);
  mini.focusedDate = anchorDate;
  mini.render();
});
