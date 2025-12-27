export function ThemeScript() {
  const script = `
    try {
      const theme = localStorage.getItem("theme") || "system";
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const resolvedTheme = theme === "system" ? systemTheme : theme;
      
      if (resolvedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  `

  return <script>{script}</script>
}
