"use client";

import { Button, Group, TextInput, JsonInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { DashboardCard } from "./DashboardCard";

import { useExchangeSDK } from "@/providers/ExchangeProvider";

export function TrackEvent() {
  const sdk = useExchangeSDK();

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      eventName: "",
      eventParams: '{\n  "example_key": "example_value",\n  "price": 100\n}',
    },
    validate: {
      eventParams: (value) => {
        try {
          JSON.parse(value);
          return null;
        } catch (e) {
          console.log(e);
          return "Invalid JSON";
        }
      },
    },
  });

  async function handleTrackEvent({
    eventName,
    eventParams,
  }: {
    eventName: string;
    eventParams: string;
  }) {
    let paramObject: Record<string, any> = {};

    try {
      paramObject = JSON.parse(eventParams);
    } catch (e) {
      console.error("Failed to parse event parameters:", e);
      return;
    }

    // @ts-ignore
    sdk?.tracking.trackEvent(eventName, paramObject);
  }

  return (
    <DashboardCard
      title="Track Event"
      description="Event name and parameters must be supported within the TrackingSDK"
    >
      <form onSubmit={form.onSubmit(handleTrackEvent)}>
        <TextInput
          label="Event Name"
          placeholder="Event Name"
          withAsterisk
          key={form.key("eventName")}
          {...form.getInputProps("eventName")}
        />

        <JsonInput
          label="Event Parameters"
          placeholder="Enter parameters as JSON"
          validationError="Invalid JSON"
          formatOnBlur
          autosize
          minRows={4}
          mt="md"
          withAsterisk
          key={form.key("eventParams")}
          {...form.getInputProps("eventParams")}
        />

        <Group justify="flex-end" mt="md">
          <Button type="submit" radius="md">
            Track Event
          </Button>
        </Group>
      </form>
    </DashboardCard>
  );
}
