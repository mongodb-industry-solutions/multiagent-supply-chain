import { StateGraph } from "@langchain/langgraph";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { HumanMessage } from "@langchain/core/messages";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { createBedrockClient } from "../../integrations/bedrock/chat.js";
import { StateAnnotation } from "./state.js";
import {
  retrieveWeatherEvents,
  retrieveBorderIncidents,
  retrieveCarrierPerformance,
} from "./tools.js";

function extractRouteParams(content) {
  let parsed = {};
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    // ignore parse errors
  }

  // Message shape: { route: <riskAnalysisData>, weights: {...} }
  // riskAnalysisData shape: { carrier, route: { origin, destination }, estimated_delivery, shipment_date, ... }
  const data = parsed.route || {};
  const nestedRoute = data.route || {};

  const origin = nestedRoute.origin || {};
  const destination = nestedRoute.destination || {};
  const carrier = data.carrier || "";
  const rawDate =
    data.estimated_delivery || data.shipment_date || data.created_at;
  const date =
    typeof rawDate === "string"
      ? rawDate
      : rawDate?.$date ?? new Date().toISOString();
  const border =
    origin.country &&
    destination.country &&
    origin.country.toLowerCase() !== destination.country.toLowerCase()
      ? `${origin.country}-${destination.country}`
      : "";

  const weights = parsed.weights || {};

  return { origin, destination, carrier, date, border, weights };
}

// Node 1: fetch all tool data in parallel — no LLM call
async function fetchData(state, config) {
  const lastMessage = state.messages[state.messages.length - 1];
  const content =
    typeof lastMessage.content === "string" ? lastMessage.content : "";
  const { origin, destination, carrier, date, border, weights } =
    extractRouteParams(content);

  const [weatherResults, borderResults, carrierResults] = await Promise.all([
    retrieveWeatherEvents.invoke(
      { origin, destination, date, name: "retrieve_weather_events" },
      config
    ),
    retrieveBorderIncidents.invoke(
      { border: border || "N/A", date, name: "retrieve_border_incidents" },
      config
    ),
    retrieveCarrierPerformance.invoke(
      { carrier, name: "retrieve_carrier_performance" },
      config
    ),
  ]);

  const currentWeights = Object.entries(weights)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join("\n");

  return {
    messages: [
      new HumanMessage(
        `Current risk weights:\n${currentWeights}\n\nData retrieved:\nWeather Events: ${weatherResults}\nBorder Incidents: ${borderResults}\nCarrier Performance: ${carrierResults}`
      ),
    ],
  };
}

const analyzePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a supply chain risk analysis expert. Be concise.
Based on the weather events, border incidents, and carrier performance data provided, write a brief risk analysis (3-5 sentences).
End with a JSON block using exactly these keys: carrierReliability, routeComplexity, weatherPatterns, borderCrossing.
Each value: {{"suggestedWeight": <number 0-1>, "reason": "<short string>"}}.
IMPORTANT: The current weights are shown in the message. For any factor whose current weight is already 0.8 or higher, you MUST keep suggestedWeight at or below its current value. Never suggest a higher value for those factors.`,
  ],
  new MessagesPlaceholder("messages"),
]);

// Node 2: analyze the fetched data — one LLM call
async function analyze(state) {
  const model = createBedrockClient();
  const formattedPrompt = await analyzePrompt.formatMessages({
    messages: state.messages,
  });

  try {
    const result = await model.invoke(formattedPrompt);
    return { messages: [result] };
  } catch (error) {
    console.error("Error in risk analysis:", error);
    return {
      messages: [{ role: "ai", content: "Error analyzing risk. Please try again." }],
    };
  }
}

export function createAgentGraph(client, dbName) {
  const builder = new StateGraph(StateAnnotation)
    .addNode("fetchData", fetchData)
    .addNode("analyze", analyze)
    .addEdge("__start__", "fetchData")
    .addEdge("fetchData", "analyze")
    .addEdge("analyze", "__end__");

  let checkpointer = null;
  if (client && dbName) {
    checkpointer = new MongoDBSaver({ client, dbName });
  }

  const graph = builder.compile({ checkpointer });
  graph.name = "Risk Analysis Agent";
  return graph;
}
