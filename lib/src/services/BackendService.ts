import axios, { AxiosInstance } from "axios";

import { environmentConfig, type Environment } from "../config/environment";
import { VERSION } from "../version";

export class BackendService {
  private buyApiClient: AxiosInstance;

  constructor({ environment = "production" }: { environment?: Environment }) {
    this.buyApiClient = BackendService.createClient(
      environmentConfig[environment].BUY_API_URL,
    );
  }

  private static createClient(baseUrl: string): AxiosInstance {
    const client = axios.create({ baseURL: baseUrl });
    client.interceptors.request.use((config) => {
      config.headers = config.headers || {};
      config.headers["x-exchange-sdk-version"] = VERSION;
      return config;
    });
    return client;
  }

  async getLedgerSessionId(
    providerSessionId?: string,
  ): Promise<string | null> {
    const params = providerSessionId ? { providerSessionId } : undefined;
    try {
      const { data } = await this.buyApiClient.get<{
        ledgerSessionId?: string;
      }>("/session", { params });
      if (!data.ledgerSessionId) {
        throw new Error("Response missing 'ledgerSessionId'");
      }
      return data.ledgerSessionId;
    } catch (err) {
      console.error("Failed to get ledgerSessionId:", err);
      return null;
    }
  }
}
