import { environmentConfig } from "../config/environment";
import type { SDKConfig } from "../sdk.types";

export class BackendApiService {
  private apiUrl: string;
  private providerSessionId: string | undefined;

  constructor({ environment, providerSessionId }: SDKConfig) {
    const { BUY_API_URL } = environmentConfig[environment];
    this.apiUrl = BUY_API_URL;
    this.providerSessionId = providerSessionId;
  }

  async getLedgerSessionId(): Promise<string> {
    const url = `${this.apiUrl}/session`;

    const finalUrl = new URL(url);

    if (this.providerSessionId) {
      finalUrl.searchParams.append("providerSessionId", this.providerSessionId);
    }

    try {
      const response = await fetch(finalUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} – ${response.statusText}`);
      }

      const data: { ledgerSessionId?: string } = await response.json();

      if (!data.ledgerSessionId) {
        throw new Error("Response missing 'ledgerSessionId'");
      }

      return data.ledgerSessionId;
    } catch (error) {
      console.error("Error fetching session ID:", error);
      throw error;
    }
  }
}
