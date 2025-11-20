import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { createBedrockClient } from "../../integrations/bedrock/chat.js";
import { StateAnnotation } from "./state.js";
import {
  retrieveWeatherEvents,
  retrieveBorderIncidents,
  retrieveCarrierPerformance,
  retrieveRouteComplexity,
  extractWeightRecommendation,
} from "./tools.js";

// Get available tools for risk analysis
// TEMPORARILY: Start with just weather tool to debug tool display
const tools = [
  retrieveWeatherEvents,
  retrieveBorderIncidents,
  retrieveCarrierPerformance,
  // retrieveRouteComplexity,
];

const toolNode = new ToolNode(tools);

/**
 * Define the function that calls the model
 */
export async function callModel(state, config) {
  const model = createBedrockClient();
  const bindedModel = model.bindTools(tools);

  // Create a prompt template for risk analysis
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a supply chain risk analysis expert.
      
      When analyzing route risk:
      1. First, extract the shipment date from route.estimated_delivery, route.shipment_date, or route.created_at.
      2. Secondly, extract the shipment route origin and destination locations, from route.origin and route.destination.
      3. Run the retrieve_weather_events tool to get relevant weather or seasonal events.
      4. Run the retrieve_border_incidents tool to get relevant border incidents.
      5. Run the retrieve_carrier_performance tool to get recent shipment performance for the carrier.
      6. After running the tools, If you find high risks matching the shipment timeframe, recommend increasing the relevant weight slider and only if the value is below 0.8.
      7. At the end of your recommendations, show a summary of your weight adjustment recommendations in a JSON format

      IMPORTANT: You MUST use all available tools to gather data before analyzing.
      Be concise but thorough in your analysis.`,
    ],
    new MessagesPlaceholder("messages"),
  ]);

  // Format the prompt with the current state
  const formattedPrompt = await prompt.formatMessages({
    messages: state.messages,
  });

  try {
    const result = await bindedModel.invoke(formattedPrompt);
    return { messages: [result] };
  } catch (error) {
    console.error("Error calling risk analysis model:", error);
    return {
      messages: [
        {
          role: "ai",
          content: "Error analyzing risk. Please try again.",
        },
      ],
    };
  }
}

/**
 * Determine the next step in the graph
 */
export function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // If the last message has tool calls, route to tools node
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }

  // Otherwise, end the graph
  return "__end__";
}

export function createAgentGraph(client, dbName) {
  const builder = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  let checkpointer = null;
  if (client && dbName) {
    checkpointer = new MongoDBSaver({ client, dbName });
  }

  const graph = builder.compile({ checkpointer });
  graph.name = "Risk Analysis Agent";

  return graph;
}
