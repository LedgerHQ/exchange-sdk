"use client";

import { Button, Card, Group, Text, TextInput, JsonInput } from "@mantine/core";
import { TrackingSdkFactory } from "@ledgerhq/tracking-sdk";
import { useForm } from "@mantine/form";

// Removed useExchangeSdk as it wasn't used in the example
// import { useExchangeSdk } from "@/hooks/useExchangeSdk";

export function TrackEvent() {
  // const { execute } = useExchangeSdk(); // Not used in the tracking logic

  const trackingSdk = TrackingSdkFactory.getInstance({
    environment: "staging", // or 'production'
  });

  const form = useForm({
    mode: "uncontrolled",
    initialValues: {
      eventName: "",
      // The parameters are now a single JSON string
      eventParams: '{\n  "example_key": "example_value",\n  "price": 100\n}',
    },
    // You can add built-in JSON validation
    validate: {
      eventParams: (value) => {
        try {
          JSON.parse(value);
          return null; // No error
        } catch (e) {
          return "Invalid JSON"; // Error message
        }
      },
    },
  });

  async function handleTrackEvent({
    eventName,
    eventParams, // This is now a JSON string
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

    trackingSdk.trackEvent(
      // @ts-ignore
      eventName,
      paramObject,
    );

    console.log("Tracking event:", eventName, paramObject);
  }

  return (
    <Card withBorder radius="md" p="xl">
      <Text fz="lg" fw={500}>
        Track Event
      </Text>
      <Text fz="xs" c="dimmed" mt={3} mb="md">
        Event name and parameters must be supported within the TrackingSDK
      </Text>
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
    </Card>
  );
}
