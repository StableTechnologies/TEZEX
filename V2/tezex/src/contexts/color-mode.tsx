import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

export type ColorMode = "dark" | "light";

interface ColorModeContextValue {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
}

interface ColorModeProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = "tezex-color-mode";
const ColorModeContext = createContext<ColorModeContextValue | undefined>(
  undefined
);

const getStoredMode = (): ColorMode | undefined => {
  try {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    return storedMode === "dark" || storedMode === "light"
      ? storedMode
      : undefined;
  } catch {
    return undefined;
  }
};

const getInitialMode = (): ColorMode => {
  const storedMode = getStoredMode();
  if (storedMode) return storedMode;

  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
};

export const ColorModeProvider: FC<ColorModeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ColorMode>(getInitialMode);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  useEffect(() => {
    if (getStoredMode()) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const handleSystemModeChange = (event: MediaQueryListEvent) => {
      if (getStoredMode()) return;
      setModeState(event.matches ? "light" : "dark");
    };

    mediaQuery.addEventListener("change", handleSystemModeChange);
    return () =>
      mediaQuery.removeEventListener("change", handleSystemModeChange);
  }, []);

  const setMode = useCallback((nextMode: ColorMode) => {
    setModeState(nextMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // The selected mode still applies for this session when storage is blocked.
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = useMemo(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode]
  );

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  );
};

export const useColorMode = (): ColorModeContextValue => {
  const context = useContext(ColorModeContext);
  if (!context) {
    throw new Error("useColorMode must be used within a ColorModeProvider");
  }
  return context;
};
