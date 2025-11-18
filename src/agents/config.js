// Agent registry for multi-agent support
import { createAgentGraph as createTestAgentGraph } from "./test/graph.js";
// import { createAgentGraph as createSupervisorAgentGraph } from "./supervisor/graph.js";
import { createAgentGraph as createRootCauseAgentGraph } from "./root-cause-analysis/graph.js";
import { createAgentGraph as createTransportationAgentGraph } from "./transportation/graph.js";

export const AGENTS = [
  {
    id: "test",
    name: "Test Agent",
    createGraph: createTestAgentGraph,
    description: "A simple test agent.",
  },
  // {
  //   id: "supervisor",
  //   name: "Supervisor Agent",
  //   createGraph: createSupervisorAgentGraph,
  //   description:
  //     "Multi-agent workflow: Supervisor coordinates Failure, Workorder, and Planning agents.",
  // },
  {
    id: "root-cause-analysis",
    name: "Root Cause Analysis Agent",
    createGraph: createRootCauseAgentGraph,
    description: "Analyzes delayed shipments and generates detailed incident reports with root cause analysis.",
  },
  {
    id: "transportation-planning",
    name: "Transportation Planning Agent",
    createGraph: createTransportationAgentGraph,
    description: "Finds alternative carriers and routes for delayed shipments using geospatial optimization.",
  },
];

/**
 * Get agent config by id
 * @param {string} id
 * @returns {object|null}
 */
export function getAgentById(id) {
  return AGENTS.find((agent) => agent.id === id) || null;
}

/**
 * Get all agent options for UI
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function getAgentOptions() {
  return AGENTS.map(({ id, name, description }) => ({ id, name, description }));
}
