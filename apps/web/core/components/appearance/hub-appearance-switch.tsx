import { useState } from "react";
import { observer } from "mobx-react";
import { useTheme } from "next-themes";
import { applyCustomTheme, clearCustomTheme } from "@plane/utils";
import { useUserProfile } from "@/hooks/store/user";
import {
  appearanceChoice,
  applyWarmWhitePalette,
  WARM_WHITE_THEME,
} from "./hub-appearance.helpers";

export const HubAppearanceSwitch = observer(function HubAppearanceSwitch() {
  const { data: profile, updateUserTheme } = useUserProfile();
  const { setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const value = appearanceChoice(profile?.theme);
  async function change(choice: string) {
    setSaving(true);
    setError("");
    const next = choice === "warm-white" ? { ...WARM_WHITE_THEME } : { theme: choice };
    try {
      await updateUserTheme(next);
      if (choice === "warm-white") {
        applyCustomTheme(WARM_WHITE_THEME.primary!, WARM_WHITE_THEME.background!, "light");
        applyWarmWhitePalette(next);
      } else {
        clearCustomTheme();
      }
      setTheme(next.theme!);
      window.location.reload();
    } catch {
      setError("外观保存失败，请重试。");
      setSaving(false);
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-12 text-secondary">
        外观
        <select
          aria-label="外观"
          value={value}
          disabled={saving}
          onChange={(event) => void change(event.target.value)}
          className="rounded-md border border-subtle bg-surface-1 px-2 py-1.5 text-12 text-primary"
        >
          <option value="warm-white">暖白</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
          {!["warm-white", "light", "dark", "system"].includes(value) && (
            <option value={value}>当前自定义外观</option>
          )}
        </select>
        {saving && <span role="status">保存中…</span>}
      </label>
      {error && (
        <p role="alert" className="text-12 text-danger-primary">
          {error}
        </p>
      )}
    </div>
  );
});
