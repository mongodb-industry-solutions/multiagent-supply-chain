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
} from "./tools.js";

// Get available tools for risk analysis
const tools = [
  retrieveWeatherEvents,
  retrieveBorderIncidents,
  retrieveCarrierPerformance,
  retrieveRouteComplexity,
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
      `You are a supply chain risk analysis expert.\n\nWhen analyzing a shipment's risk:\n1. Retrieve recent weather events for the route using retrieve_weather_events.\n2. Search for historical border crossing incidents using retrieve_border_incidents.\n3. Review carrier performance using retrieve_carrier_performance.\n4. Analyze route complexity using retrieve_route_complexity.\n\nIMPORTANT: You MUST use all relevant tools for every risk analysis.\nExplain your reasoning and suggest which risk factors should be adjusted, based on the data you find.\nBe concise but thorough in your analysis.`,
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
