import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ThemeNames } from "@ledgerhq/react-ui/styles";

export interface QuerySettings {
  theme: ThemeNames;
  lang: string;
  currencyTicker: string;
}

const SettingsContext = React.createContext<
  QuerySettings & { mounted: boolean }
>({
  lang: "en",
  theme: "light",
  mounted: false,
  currencyTicker: "USD",
});

const isThemeName = (theme: unknown): theme is ThemeNames => {
  if (typeof theme !== "string") return false;
  return ["dark", "light"].includes(theme);
};

export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();

  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [lang, setLang] = React.useState<string>("en");

  const [currencyTicker, setCurrencyTicker] = React.useState<string>("USD");

  const [mounted, hasMounted] = useState(false);

  useEffect(() => {
    hasMounted(true);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    async function setupSettings() {
      const storedSettingsSerialised = await localStorage.getItem("settings");
      const storedSettings: Partial<QuerySettings> | null =
        typeof storedSettingsSerialised === "string"
          ? JSON.parse(storedSettingsSerialised)
          : null;

      const querySettings: Partial<QuerySettings> = {};
      if (router.query.lang && typeof router.query.lang === "string") {
        setLang(router.query.lang);
        querySettings.lang = router.query.lang;
      } else {
        const storedLang = storedSettings?.lang;
        if (storedLang) {
          setLang(storedLang);
        }
      }

      if (router.query.theme && isThemeName(router.query.theme)) {
        await setTheme(router.query.theme);
        querySettings.theme = router.query.theme;
      } else {
        const storedTheme = storedSettings?.theme;
        if (storedTheme && isThemeName(storedTheme)) {
          await setTheme(storedTheme);
        }
      }

      if (Object.keys(querySettings).length > 0) {
        localStorage.setItem(
          "settings",
          JSON.stringify({ ...storedSettings, ...querySettings })
        );
      }
    }

    setupSettings();
  }, [router.isReady, router.query]);

  return (
    <SettingsContext.Provider value={{ theme, currencyTicker, mounted, lang }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => React.useContext(SettingsContext);
