/**
 * LiveApp query params.
 * @property QuoteId {string} - the rate identifier used by the user in your system
 * @property FromAmount {string} - initial amount the user want to swap
 * @property FromAccountId {string} - user's account id in Ledger Live repository
 * @property ToAccountId {string} - user's account id in Ledger Live repository
 * @property FeeStrategy {string}
 * @property CustomFeeConfig {object} - fee configuration (URI encoded)
 * @property ToNewTokenId {string}
 */
export const QueryParams = {
  QuoteId: "quoteId",
  FromAmount: "fromAmount",
  FromAccountId: "fromAccountId",
  ToAccountId: "toAccountId",
  FeeStrategy: "feeStrategy",
  CustomFeeConfig: "customFeeConfig",
  ToNewTokenId: "toNewTokenId",
};
