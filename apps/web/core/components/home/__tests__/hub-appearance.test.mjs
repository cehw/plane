import test from "node:test";
import assert from "node:assert/strict";
import {
  appearanceChoice,
  isWarmWhite,
  WARM_WHITE_THEME,
  WARM_NEUTRALS,
} from "../../appearance/hub-appearance.helpers.ts";
test("warm preset survives profile round trip without taking over other custom themes", () => {
  const saved = JSON.parse(JSON.stringify(WARM_WHITE_THEME));
  assert.equal(appearanceChoice(saved), "warm-white");
  assert.equal(isWarmWhite({ ...saved, background: "#FAF8F3" }), true);
  for (const change of [
    { theme: "dark" },
    { darkPalette: true },
    { background: "#ffffff" },
    { primary: "#ff0000" },
  ])
    assert.equal(isWarmWhite({ ...saved, ...change }), false);
  assert.equal(appearanceChoice({ theme: "light-contrast" }), "light-contrast");
  assert.equal(appearanceChoice(undefined), "system");
});
function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
test("primary, secondary and tertiary text retain readable contrast on warm surfaces", () => {
  for (const bg of ["white", "100", "200", "300"])
    for (const fg of ["1000", "1100", "1200"])
      assert.ok(
        (luminance(WARM_NEUTRALS[bg]) + 0.05) / (luminance(WARM_NEUTRALS[fg]) + 0.05) >= 4.5,
        bg + "/" + fg,
      );
  assert.ok(
    (luminance(WARM_NEUTRALS.white) + 0.05) / (luminance(WARM_WHITE_THEME.primary) + 0.05) >= 4.5,
  );
});
