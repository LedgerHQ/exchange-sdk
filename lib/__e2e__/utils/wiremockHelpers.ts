import axios from "axios";
import { WIREMOCK_BASE_URL } from "../config";

export async function findRequestPayloads(
  method: "GET" | "POST" | "PUT" | "DELETE",
  urlPath: string,
) {
  const res = await axios.post(`${WIREMOCK_BASE_URL}/__admin/requests/find`, {
    method,
    url: urlPath,
  });

  const payloads = res.data.requests.map((req: any) => JSON.parse(req.body));
  return payloads;
}

export async function resetWireMockRequests() {
  await axios.delete(`${WIREMOCK_BASE_URL}/__admin/requests`);
}
