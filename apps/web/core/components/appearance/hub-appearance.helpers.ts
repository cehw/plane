import type { IUserTheme } from "@plane/types";

export const WARM_WHITE_THEME: IUserTheme = {
  theme: "custom",
  primary: "#2864b4",
  background: "#faf8f3",
  darkPalette: false,
};
export const WARM_NEUTRALS: Record<string, string> = {
  white: "#faf8f3",
  "100": "#f7f4ee",
  "200": "#f3efe7",
  "300": "#eee9df",
  "400": "#e2dbcf",
  "500": "#d5ccbe",
  "600": "#b9af9f",
  "700": "#9b9080",
  "800": "#837869",
  "900": "#746a5d",
  "1000": "#655c50",
  "1100": "#494238",
  "1200": "#2e2923",
  black: "#1d1915",
};
export function isWarmWhite(theme?: Partial<IUserTheme>) {
  return (
    theme?.theme === "custom" &&
    theme.darkPalette === false &&
    theme.primary?.toLowerCase() === WARM_WHITE_THEME.primary &&
    theme.background?.toLowerCase() === WARM_WHITE_THEME.background
  );
}
export function appearanceChoice(theme?: Partial<IUserTheme>) {
  return isWarmWhite(theme) ? "warm-white" : theme?.theme || "system";
}
export function applyWarmWhitePalette(theme?: Partial<IUserTheme>) {
  if (!isWarmWhite(theme)) return;
  const style = document.documentElement.style;
  for (const [key, color] of Object.entries(WARM_NEUTRALS))
    style.setProperty("--neutral-" + key, color);
  // Warm, dark overlays must remain legible on the light surfaces.
  for (const [index, opacity] of [
    0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95,
  ].entries()) {
    style.setProperty("--alpha-black-" + (index + 1) * 100, "rgb(29 25 21 / " + opacity + ")");
    style.setProperty("--alpha-white-" + (index + 1) * 100, "rgb(250 248 243 / " + opacity + ")");
  }
}
