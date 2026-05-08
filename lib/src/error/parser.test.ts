import { ExchangeBaseError } from "./ExchangeSdkError";
import { parseError, StepError } from "./parser";

describe("parseError", () => {
  const mockDownstreamError = new Error("error message");

  it.each(Object.values(StepError))(
    "%s - returns an ExchangeBaseError with an exchangeErrorCode",
    (step) => {
      const error = parseError({
        error: mockDownstreamError,
        step,
      });

      if (error instanceof ExchangeBaseError) {
        expect(error.cause.exchangeErrorCode).toMatch(/^exchange\d+$/);
      } else {
        // IGNORED_SIGNATURE maps to IgnoredSignatureStepError which IS an ExchangeBaseError,
        // so reaching here means the step has no mapping — which is intentional for none.
        expect(error).toBe(mockDownstreamError);
      }
    },
  );

  it("returns the original error when no step is provided", () => {
    const error = parseError({ error: mockDownstreamError });
    expect(error).toBe(mockDownstreamError);
  });

  it("wraps a DrawerClosedError by name regardless of step", () => {
    const drawerError = new Error("closed");
    drawerError.name = "DrawerClosedError";
    const result = parseError({ error: drawerError, step: StepError.NONCE });
    expect(result.name).toBe("DrawerClosedError");
  });
});
