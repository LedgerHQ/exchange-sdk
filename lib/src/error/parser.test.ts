import { ExchangeBaseError } from "./ExchangeSdkError";
import { CustomErrorType, parseError, StepError } from "./parser";
import { SwapError } from "./SwapError";

describe("parseError", () => {
  const mockDownstreamError = new Error("error message");

  it.each(Object.values(StepError))(
    "%s - returns generic error when customErrorType is not passed in",
    (step) => {
      const error = parseError({
        error: mockDownstreamError,
        step,
      }) as ExchangeBaseError;

      if (error?.cause?.exchangeErrorCode) {
        expect(error.cause.exchangeErrorCode).toContain("exchange");
      } else {
        expect(error).toBe(mockDownstreamError);
      }
    }
  );
  it.each(Object.values(StepError))(
    "%s - returns custom swap error when customErrorType is 'swap'",
    (step) => {
      const error = parseError({
        error: mockDownstreamError,
        step,
        customErrorType: CustomErrorType.SWAP,
      }) as SwapError;

      if (error?.cause?.swapCode) {
        expect(error.cause.swapCode).toContain("swap");
      } else {
        expect(error).toBe(mockDownstreamError);
      }
    }
  );
});
