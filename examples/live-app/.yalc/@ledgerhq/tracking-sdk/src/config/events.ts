import { z } from "zod";

export const eventSchemas = {
  asset_clicked: z.object({
    ledgerSessionId: z.string(),
    page: z.string(),
    flow: z.enum(["buy", "sell"]),
    currency: z.string(),
    live_app: z.string(),
    anonymised_url: z.url(),
  }),

  quote_requested: z.object({
    ledgerSessionId: z.string(),
    amount: z.number(),
    currency: z.string(),
  }),
};

export type EventMap = {
  [K in keyof typeof eventSchemas]: z.infer<(typeof eventSchemas)[K]>;
};
