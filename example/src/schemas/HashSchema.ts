import { FeeStrategy } from "@ledgerhq/exchange-sdk";
import BigNumber from "bignumber.js";
import { z } from "zod";

const ZBigNumber = () =>
  z.custom<BigNumber | string | number>().transform((arg) => {
    if (arg instanceof BigNumber) {
      return arg;
    }
    return new BigNumber(arg);
  });

const ZFeeStrategy = () => z.custom<FeeStrategy>();

export const HashSchema = z.object({
  fromAccountId: z.string(),
  fromAmount: ZBigNumber(),
  initFeeTotalValue: ZBigNumber(),
  provider: z.string(),
  quoteId: z.string().optional(),
  rate: ZBigNumber().optional(),
  toAccountId: z.string(),
  feeStrategy: ZFeeStrategy(),
});

const KeySchema = z.object({
  key: z.string(),
});
export const HashStateSchema = HashSchema.merge(KeySchema);

export type HashSchemaType = z.infer<typeof HashSchema>;
export type HashStateSchemaType = z.infer<typeof HashStateSchema>;
