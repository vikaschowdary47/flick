import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  palettes,
  type AppearancePreference,
  type ColorScheme,
  type Palette,
  type ThemeName,
} from "./theme";

const STORAGE_KEY = "flick.theme.v1";

type ThemeContextValue = {
  palette: Palette;
  scheme: ColorScheme;
  appearance: AppearancePreference;
  themeName: ThemeName;
  setAppearance: (value: AppearancePreference) => void;
  setThemeName: (value: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Saved = { appearance: AppearancePreference; themeName: ThemeName };

function isSaved(value: unknown): value is Saved {
  const v = value as Partial<Saved> | null;
  return (
    !!v &&
    (v.appearance === "system" || v.appearance === "light" || v.appearance === "dark") &&
    (v.themeName === "playful" || v.themeName === "classy")
  );
}

// The choice is saved on this device only (AsyncStorage).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [appearance, setAppearanceState] = useState<AppearancePreference>("system");
  const [themeName, setThemeNameState] = useState<ThemeName>("playful");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        const saved: unknown = raw ? JSON.parse(raw) : null;
        if (isSaved(saved)) {
          setAppearanceState(saved.appearance);
          setThemeNameState(saved.themeName);
        }
      })
      .catch(() => {}); // fall back to defaults
  }, []);

  const save = useCallback((next: Saved) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setAppearance = useCallback(
    (value: AppearancePreference) => {
      setAppearanceState(value);
      save({ appearance: value, themeName });
    },
    [save, themeName],
  );

  const setThemeName = useCallback(
    (value: ThemeName) => {
      setThemeNameState(value);
      save({ appearance, themeName: value });
    },
    [save, appearance],
  );

  const scheme: ColorScheme = appearance === "system" ? (system === "dark" ? "dark" : "light") : appearance;

  const value = useMemo(
    () => ({
      palette: palettes[themeName][scheme],
      scheme,
      appearance,
      themeName,
      setAppearance,
      setThemeName,
    }),
    [themeName, scheme, appearance, setAppearance, setThemeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

// Build a StyleSheet from the active palette; rebuilt only when it changes.
export function useThemedStyles<T>(factory: (palette: Palette) => T): T {
  const { palette } = useTheme();
  return useMemo(() => factory(palette), [factory, palette]);
}
