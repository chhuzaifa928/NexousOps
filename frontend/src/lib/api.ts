import type {
  CopilotRequest,
  CopilotResponse,
  LiveDiscoverResponse,
  OverviewResponse,
  StatusResponse,
} from "./types";

async function clientFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function getOverview() {
  return clientFetch<OverviewResponse>("/api/overview");
}

export function getStatus() {
  return clientFetch<StatusResponse>("/api/status");
}

export function postCopilot(payload: CopilotRequest) {
  return clientFetch<CopilotResponse>("/api/copilot", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getLiveDiscoverState() {
  return clientFetch<LiveDiscoverResponse>("/api/live-discover");
}

export function setLiveDiscoverState(action: "activate" | "deactivate") {
  return clientFetch<LiveDiscoverResponse>("/api/live-discover", {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}
