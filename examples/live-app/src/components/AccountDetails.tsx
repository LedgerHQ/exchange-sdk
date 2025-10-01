import { formatCurrencyUnit } from "@ledgerhq/coin-framework/currencies/formatCurrencyUnit";
import { Account, Currency } from "@ledgerhq/wallet-api-client";
import { Group, Stack, Text } from "@mantine/core";

const FORMAT_CONFIG = {
  alwaysShowSign: false,
  showCode: true,
  discreet: false,
  locale: "en-EN",
};

export function AccountDetails({
  account,
  selectedCurrencies,
}: {
  account: Account | undefined;
  selectedCurrencies: Currency[];
}) {
  if (!account) return <div>No account selected</div>;

  const currency = selectedCurrencies.find((c) => c.id === account.currency);

  if (!currency) return <div>Currency not found</div>;

  const unit = {
    name: currency.id,
    code: currency.ticker,
    magnitude: currency.decimals,
  };

  const spendableBalance = formatCurrencyUnit(
    unit,
    account.spendableBalance,
    FORMAT_CONFIG,
  );

  return (
    <Stack>
      <Group>
        <Text>{account.name}</Text>
        <Text size="sm">{spendableBalance}</Text>
      </Group>
      <Text size="sm">{account.address}</Text>
    </Stack>
  );
}
