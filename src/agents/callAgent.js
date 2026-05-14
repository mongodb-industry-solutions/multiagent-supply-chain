import { HumanMessage } from "@langchain/core/messages";
import getMongoClientPromise from "@/integrations/mongodb/client.js";
import { getAgentById } from "./config.js";

/**
 * Cache for compiled agent graphs by agentId
 * @type {Object<string, import("@langchain/core").AgentGraph>}
 */
const agentGraphCache = {};

/**
 * Create agent callbacks that write logs to a stream
 * @param {WritableStreamDefaultWriter} writer
 */
function createAgentCallbacks(writer) {
  const runIdToToolName = {};
  const writeLog = async (obj) => {
    await writer.ready;
    writer.write(JSON.stringify(obj) + "\n");
  };
  return {
    async handleToolStart(tool, input, runId) {
      const parsed = JSON.parse(input);
      const toolName = parsed.name || tool?.name || "Tool";
      runIdToToolName[runId] = toolName;
      console.log("[Tool Start]", toolName);
      await writeLog({
        type: "update",
        name: "tool_start",
        values: parsed,
      });
    },
    async handleToolEnd(output, runId) {
      const toolName = runIdToToolName[runId] || output?.name || "Tool";
      delete runIdToToolName[runId];
      console.log("[Tool End]", toolName);
      // output may be a string or a ToolMessage class instance — extract a safe string
      const result = typeof output === "string"
        ? output
        : (output?.content != null ? String(output.content) : null);
      await writeLog({
        type: "update",
        name: "tool_end",
        values: { name: toolName, result },
      });
    },
    async handleToolError(err, runId) {
      const toolName = runIdToToolName[runId] || "Tool";
      delete runIdToToolName[runId];
      // Emit tool_end so the loading spinner clears even on error
      await writeLog({
        type: "update",
        name: "tool_end",
        values: { name: toolName, result: null },
      });
      await writeLog({
        type: "error",
        name: "tool_error",
        values: { name: err?.name || "unknown" },
      });
    },
    async handleLLMError(err, runId) {
      await writeLog({
        type: "error",
        name: "llm_error",
        values: { name: err?.name || "unknown" },
      });
    },
    async handleChainError(err, runId) {
      await writeLog({
        type: "error",
        name: "chain_error",
        values: { name: err?.name || "unknown" },
      });
    },
  };
}

// LangChain callback handlers
export const agentCallbacks = {
  handleToolStart(tool, input, runId) {
    console.log("[Tool Start]", JSON.parse(input).name);
  },
  handleToolEnd(output, runId) {
    console.log("[Tool End]", output.name);
  },
  handleToolError(err, runId) {
    console.error("[Tool Error]", err);
  },
  handleLLMError(err, runId) {
    console.error("[LLM Error]", err);
  },
  handleChainError(err, runId) {
    console.error("[Chain Error]", err);
  },
};

/**
 * Call the agent with a message and get a response, streaming logs to writer if provided
 * @param {string} message - User's message
 * @param {string} threadId - Thread ID for conversation tracking
 * @param {string} agentId - Agent ID to select which agent to use
 * @param {WritableStreamDefaultWriter} [writer] - Optional stream writer for logs
 * @returns {Promise<string>} Agent's response
 */
export async function callAgent(message, threadId, agentId = "test", writer) {
  try {
    // Initialize MongoDB client
    const dbName = process.env.DATABASE_NAME;
    if (!dbName)
      throw new Error(
        "DATABASE_NAME environment variable is required but not set"
      );
    const client = await getMongoClientPromise();

    // Get the agent config
    const agentConfig = getAgentById(agentId);
    if (!agentConfig) throw new Error(`Agent not found: ${agentId}`);

    // Only create the agent graph if not already cached
    let agentGraph = agentGraphCache[agentId];
    if (!agentGraph) {
      agentGraph = agentConfig.createGraph(client, dbName);
      agentGraphCache[agentId] = agentGraph;
    }

    // Use streaming callbacks if writer is provided
    const callbacks = writer
      ? [createAgentCallbacks(writer)]
      : [agentCallbacks];

    // Invoke the agent with the user's message
    const finalState = await agentGraph.invoke(
      {
        messages: [new HumanMessage(message)],
      },
      {
        recursionLimit: 25,
        configurable: { thread_id: threadId },
        callbacks,
      }
    );

    // Extract the agent's response (last message)
    const messages = finalState.messages;
    const lastMessage = messages[messages.length - 1];

    // If streaming, send the final response
    if (writer) {
      await writer.ready;
      await writer.write(
        JSON.stringify({
          type: "final",
          name: "agent_response",
          values: { name: "response", content: lastMessage.content },
        }) + "\n"
      );
      await writer.close();
    }

    return lastMessage.content;
  } catch (error) {
    if (writer) {
      await writer.ready;
      await writer.write(
        JSON.stringify({
          type: "error",
          name: "agent_error",
          values: { name: error.message },
        }) + "\n"
      );
      await writer.close();
    }
    console.error("Error in callAgent:", error);
    throw new Error(`Failed to get agent response: ${error.message}`);
  }
}

/**
 * Handle API request to chat with the agent (non-streaming)
 * @param {Object} req - Request object
 * @returns {Promise<Object>} Response object
 */
export async function handleChatRequest(req) {
  const { message, threadId = Date.now().toString(), agentId = "test" } = req;

  if (!message) {
    throw new Error('Missing required field: "message"');
  }

  const response = await callAgent(message, threadId, agentId);

  return {
    threadId,
    response,
  };
}

/**
 * Handle API request to chat with the agent (streaming)
 * @param {Object} req - Request object
 * @param {WritableStreamDefaultWriter} writer - Stream writer
 * @returns {Promise<void>}
 */
export async function handleChatRequestStream(req, writer) {
  const { message, threadId = Date.now().toString(), agentId = "test" } = req;
  if (!message) {
    await writer.ready;
    await writer.write(
      JSON.stringify({
        type: "error",
        message: 'Missing required field: "message"',
      }) + "\n"
    );
    await writer.close();
    return;
  }
  await callAgent(message, threadId, agentId, writer);
}
