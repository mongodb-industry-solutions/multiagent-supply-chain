export async function callRiskAnalysisAgent(route, { onEvent, weights, threadId } = {}) {
  // Use /api/chat for risk analysis agent
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Analyze risk for this route:\n${JSON.stringify({ route, weights }, null, 2)}`,
      agentId: "risk-analysis",
      threadId, // Pass threadId if provided
    }),
  });
  if (!response.body) throw new Error("No response body");
  let fullText = "";
  for await (const evt of streamAgentEvents(response.body)) {
    if (onEvent) onEvent(evt);
    if (evt.type === "update" || evt.type === "final") {
      fullText += evt.values?.content || "";
    }
    // handle errors or other event types as needed
  }
  return fullText;
}
import { streamAgentEvents } from "@/lib/stream/agent";

// Agent API (for /api/agent/* and /api/chat endpoints)

export async function fetchAgentOptions() {
  const res = await fetch("/api/agent/options");
  if (!res.ok) throw new Error("Failed to fetch agent options");
  return await res.json();
}

export async function sendChatMessage({
  message,
  agentId,
  threadId,
  setLogs,
  setThreadId,
  setError,
}) {
  const url = threadId ? `/api/chat/${threadId}` : "/api/chat";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, agentId }),
  });
  if (!res.body) throw new Error("No response body");
  let newThreadId = threadId;
  for await (const evt of streamAgentEvents(res.body)) {
    if (evt.type === "update") {
      setLogs((prev) => [...prev, evt]);
    } else if (evt.type === "final") {
      setLogs((prev) => [...prev, { ...evt, type: "final" }]);
    } else if (evt.type === "error") {
      setError(evt.values?.name || "Error");
      setLogs((prev) => [...prev, evt]);
    }
    if (!newThreadId && evt.threadId) {
      newThreadId = evt.threadId;
      setThreadId(newThreadId);
    }
  }
  if (!newThreadId) setThreadId((prev) => prev || Date.now().toString());
}

export async function callRootCauseAgent(shipment, { onEvent } = {}) {
  // Use /api/chat for root cause analysis agent
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Analyze delayed shipment:\n${JSON.stringify(shipment, null, 2)}`,
      agentId: "root-cause-analysis",
    }),
  });
  if (!response.body) throw new Error("No response body");
  let fullText = "";
  for await (const evt of streamAgentEvents(response.body)) {
    if (onEvent) onEvent(evt);
    if (evt.type === "update" || evt.type === "final") {
      fullText += evt.values?.content || "";
    }
    // handle errors or other event types as needed
  }
  return fullText;
}

export async function callTransportationPlanningAgent(shipment, { onEvent } = {}) {
  // Use /api/chat for transportation planning agent
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Find alternative routes for delayed shipment:\n${JSON.stringify(shipment, null, 2)}`,
      agentId: "transportation-planning",
    }),
  });
  if (!response.body) throw new Error("No response body");
  let fullText = "";
  for await (const evt of streamAgentEvents(response.body)) {
    if (onEvent) onEvent(evt);
    if (evt.type === "update" || evt.type === "final") {
      fullText += evt.values?.content || "";
    }
    // handle errors or other event types as needed
  }
  return fullText;
}
