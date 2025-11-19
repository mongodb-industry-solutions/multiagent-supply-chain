
import { useState, useCallback } from "react";
import { callRiskAnalysisAgent } from "@/lib/api/agent";

export function useRiskAnalysis() {
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [agentActive, setAgentActive] = useState(false);
  const [riskReports, setRiskReports] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);

  // Load available routes (replace with real API if needed)
  const loadAvailableRoutes = useCallback(async () => {
    // Example: Load from sessionStorage
    const routeData = sessionStorage.getItem('selected_route_for_risk');
    if (routeData) {
      setAvailableRoutes([JSON.parse(routeData)]);
      setSelectedRouteId(JSON.parse(routeData).id || null);
    }
  }, []);

  // Analyze selected route
  const handleAnalyzeSelectedRoute = useCallback(async (routeData) => {
    if (!routeData) return;
    setAgentActive(true);
    setAgentLogs([]);
    setRiskReports([]);

    try {
      setAgentLogs(prev => [...prev, {
        type: "user",
        values: {
          content: `Starting risk analysis for selected route ${routeData.id || routeData.route_id}`
        }
      }]);

      await callRiskAnalysisAgent(routeData, {
        onEvent: (evt) => {
          if (evt.type === "update" || evt.type === "tool_start" || evt.type === "tool_end") {
            setAgentLogs(prev => [...prev, evt]);
          } else if (evt.type === "final") {
            setAgentLogs(prev => [...prev, evt]);
          } else if (evt.type === "error") {
            setAgentLogs(prev => [...prev, evt]);
          }
        }
      });

      setAgentActive(false);

      // Fetch generated risk reports (replace with real API)
      // Example: setRiskReports([...riskReports, result]);
      setRiskReports([{
        _id: Date.now(),
        route: routeData,
        summary: "Sample risk analysis report. Replace with agent output.",
      }]);

    } catch (error) {
      console.error("Error analyzing selected route:", error);
      setAgentActive(false);
    }
  }, []);

  return {
    availableRoutes,
    selectedRouteId,
    setSelectedRouteId,
    agentActive,
    riskReports,
    agentLogs,
    loadAvailableRoutes,
    handleAnalyzeSelectedRoute,
  };
}
