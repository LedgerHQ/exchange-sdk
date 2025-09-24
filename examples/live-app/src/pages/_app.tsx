import "@/styles/globals.css";
import "@mantine/core/styles.css";
import {
  createTheme,
  MantineProvider,
  MantineColorsTuple,
} from "@mantine/core";
import type { AppProps } from "next/app";

const myColor: MantineColorsTuple = [
  "#eff2ff",
  "#dfe2f2",
  "#bdc2de",
  "#99a0ca",
  "#7a84b9",
  "#6672af",
  "#5c69ac",
  "#4c5897",
  "#424e88",
  "#36437a",
];

const theme = createTheme({
  colors: {
    myColor,
  },
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme}>
      <Component {...pageProps} />
    </MantineProvider>
  );
}
