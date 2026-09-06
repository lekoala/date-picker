import css from "../src/date-picker.css";
import { defineDatePicker } from "../src/define.js";

const id = "lekoala-date-picker-styles";
if (!document.getElementById(id)) {
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}
defineDatePicker();
