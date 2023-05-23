import { appWithTranslation } from "next-i18next";
import { StyleProvider } from "@ledgerhq/react-ui";
import GlobalStyle from "@/styles/globalStyle";
import "@/styles/fonts.css";
import "react-loading-skeleton/dist/skeleton.css";

import type { AppProps } from "next/app";
import { FC } from "react";
import { NextPageWithLayout } from "@/types/nextjs";
import { SettingsProvider, useSettings } from "@/contexts/Settings";

export type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};
const ComponentWithSharedLayout = ({
  Component,
  pageProps,
}: AppPropsWithLayout) => {
  const getLayout = Component.getLayout || ((page) => page);

  return getLayout(<Component {...pageProps} />);
};

const StyledApp: FC<AppProps> = (props: AppProps) => {
  const { theme, mounted } = useSettings();
  console.log("theme", theme);

  return (
    <StyleProvider selectedPalette={theme}>
      {/* <GlobalStyle /> */}
      <div style={{ visibility: mounted ? "visible" : "hidden" }}>
        <ComponentWithSharedLayout {...props} />
      </div>
    </StyleProvider>
  );
};

const TranslatedApp = appWithTranslation(StyledApp);

const WrappedApp = (props: AppProps) => {
  return (
    <SettingsProvider>
      <TranslatedApp {...props} />
    </SettingsProvider>
  );
};

export default WrappedApp;
