import { z } from "zod";

export const eventSchemas = {
  exchange_sdk_initialized: z.object({
    providerId: z.string(),
  }),
  button_clicked: z.object({
    button: z.string(),
    page: z.string(),
    flow: z.string(),
  }),

  // AUTHENTICATION
  email_confirmation_success: z.object({}),
  kyc_passed: z.object({}),
  kyc_started: z.object({}),
  login_succesful: z.object({}),
  personal_information_submitted: z.object({}),
  phone_confirmation_success: z.object({}),
  physical_address_submitted: z.object({}),

  // CARD -> FUND
  card_order_initiated: z.object({
    cardType: z.enum(["virtual", "physical"] as const),
  }),
  delegation_completed: z.object({
    limit: z.boolean(),
    currency: z.string(),
  }),
  topup_completed: z.object({
    currency_from: z.string(),
  }),
  topup_initiated: z.object({
    currency_from: z.string(),
  }),
  withdraw: z.object({
    currency_from: z.string(),
    currency_to: z.string(),
  }),
};

export type EventMap = {
  [K in keyof typeof eventSchemas]: z.infer<(typeof eventSchemas)[K]>;
};
