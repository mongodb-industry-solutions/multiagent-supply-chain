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
      1. First, REVIEW the conversation history to see if you've already analyzed this route and made weight recommendations.
      2. If you previously recommended weight changes and they were applied, DO NOT repeat the same recommendations. Instead, acknowledge that weights are already optimized.
      3. Extract the shipment date from route.estimated_delivery, route.shipment_date, or route.created_at.
      4. Extract the shipment route origin and destination locations, from route.origin and route.destination.
      5. Run the retrieve_weather_events tool to get relevant weather or seasonal events.
      6. Run the retrieve_border_incidents tool to get relevant border incidents.
      7. Run the retrieve_carrier_performance tool to get recent shipment performance for the carrier.
      8. After running the tools, ONLY recommend NEW weight adjustments if you find NEW risk factors that weren't previously addressed.
      9. If current weights are already at 0.8 or higher for a risk factor, do NOT recommend increasing them further.
      10. At the end of your recommendations, show a summary of your weight adjustment recommendations in a JSON format.

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
