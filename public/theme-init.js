(function () {
  const storageKey = "bm-theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const stored = window.localStorage.getItem(storageKey);
  const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  const resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved === "dark" ? "dark" : "light";
  root.dataset.theme = preference;
})();
