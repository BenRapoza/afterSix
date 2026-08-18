"use client";
import { useEffect } from "react";

export default function SecondStopEnhancer() {
  useEffect(() => {
    document.querySelector(".planner .intensity")?.remove();
    const food = document.querySelector<HTMLSelectElement>(".planner select");
    const foodLabel = food?.closest("label");
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".planner .moods button"));
    const selected = new Set<string>();
    const sync = () => {
      buttons.forEach((button) => {
        const value = button.textContent ?? "";
        button.classList.toggle("multi-selected", selected.has(value));
        button.disabled = selected.size >= 3 && !selected.has(value);
      });
      if (foodLabel) foodLabel.hidden = !(selected.has("Dinner") || selected.has("Appetizers"));
      sessionStorage.setItem("aftersix-feelings", JSON.stringify([...selected]));
    };
    buttons.forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault(); event.stopImmediatePropagation();
      const value = button.textContent ?? "";
      if (selected.has(value)) selected.delete(value);
      else if (selected.size < 3) selected.add(value);
      window.setTimeout(sync, 0);
    }, true));
    sync();
  }, []);
  return null;
}
