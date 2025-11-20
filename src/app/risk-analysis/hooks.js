import { useState, useCallback } from "react";
import { callRiskAnalysisAgent } from "@/lib/api/agent";

const WEATHER_PRONE_STATES = new Set([
  "FL",
  "TX",
  "CA",
  "LA",
  "MS",
  "AL",
  "GA",
  "SC",
  "NC",
  "AZ",
  "NM",
]);

const FACTOR_KEYS = [
  "carrierReliability",
  "routeComplexity",
  "weatherPatterns",
  "borderCrossing",
];

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const safeParseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const deriveCarrierReliability = (routeData) => {
  const rawScore = routeData?.reliability_score;
  const normalized =
    typeof rawScore === "number"
      ? rawScore > 1
        ? clamp01(rawScore / 100)
        : clamp01(rawScore)
      : 0.7;
  return {
    score: clamp01(1 - normalized),
    detail: rawScore
      ? `Carrier reliability score ${normalized.toFixed(2)} → risk ${
          1 - normalized
        }`
      : "No carrier reliability score provided; assuming moderate risk",
  };
};

const deriveRouteComplexity = (routeData) => {
  const transitHours = routeData?.time_hours ?? 48;
  const durationRisk = clamp01(transitHours / 96);
  const originCountry = routeData?.route?.origin?.country;
  const destinationCountry = routeData?.route?.destination?.country;
  const crossBorder =
    originCountry &&
    destinationCountry &&
    originCountry.toLowerCase() !== destinationCountry.toLowerCase();
  const score = clamp01(durationRisk * 0.7 + (crossBorder ? 0.2 : 0));
  return {
    score,
    detail: `Transit duration ${transitHours}h${
      crossBorder ? " + international border" : ""
    }`,
  };
};

const deriveWeatherRisk = (routeData) => {
  const originState = routeData?.route?.origin?.state;
  const destinationState = routeData?.route?.destination?.state;
  const riskRegion =
    (originState && WEATHER_PRONE_STATES.has(originState)) ||
    (destinationState && WEATHER_PRONE_STATES.has(destinationState));
  const score = clamp01(riskRegion ? 0.65 : 0.35);
  return {
    score,
    detail: riskRegion
      ? "Route touches weather-prone region"
      : "No extreme-weather states detected",
  };
};

const deriveBorderRisk = (routeData) => {
  const originCountry = routeData?.route?.origin?.country;
  const destinationCountry = routeData?.route?.destination?.country;
  const crossBorder =
    originCountry &&
    destinationCountry &&
    originCountry.toLowerCase() !== destinationCountry.toLowerCase();
  const score = clamp01(crossBorder ? 0.7 : 0.25);
  return {
    score,
    detail: crossBorder
      ? `Cross-border shipment ${originCountry} → ${destinationCountry}`
      : "Domestic shipment",
  };
};

const deriveFactorDefaults = (routeData) => ({
  carrierReliability: deriveCarrierReliability(routeData),
  routeComplexity: deriveRouteComplexity(routeData),
  weatherPatterns: deriveWeatherRisk(routeData),
  borderCrossing: deriveBorderRisk(routeData),
});

const mergeFactorData = (parsedFactors, derivedFactors) =>
  FACTOR_KEYS.reduce((acc, key) => {
    const parsed = parsedFactors?.[key];
    if (parsed && typeof parsed.score === "number") {
      acc[key] = {
        score: clamp01(parsed.score),
        detail: parsed.detail || derivedFactors[key].detail,
      };
    } else {
      acc[key] = derivedFactors[key];
    }
    return acc;
  }, {});

const calculateRiskMetrics = (factors, weights, routeData) => {
  const totalWeight = FACTOR_KEYS.reduce(
    (sum, key) => sum + (Number(weights?.[key]) || 0),
    0
  );
  const normalizedWeight = totalWeight || 1;
  const weightedRisk =
    FACTOR_KEYS.reduce(
      (sum, key) =>
        sum + (Number(weights?.[key]) || 0) * (factors[key]?.score ?? 0),
      0
    ) / normalizedWeight;
  const shipmentValue = Number(routeData?.cost) || 0;
  const valueAtRisk = shipmentValue * weightedRisk;
  return {
    weightedRisk: clamp01(weightedRisk),
    valueAtRisk,
  };
};

export function useRiskAnalysis() {
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [agentActive, setAgentActive] = useState(false);
  const [riskReports, setRiskReports] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [riskAnalysis, setRiskAnalysis] = useState(null);

  // Load available routes (replace with real API if needed)
  const loadAvailableRoutes = useCallback(async () => {
    // Example: Load from sessionStorage
    const routeData = sessionStorage.getItem("selected_route_for_risk");
    if (routeData) {
      const parsed = JSON.parse(routeData);
      setAvailableRoutes([parsed]);
      setSelectedRouteId(parsed.id || null);
    }
  }, []);

  // Analyze selected route
  const handleAnalyzeSelectedRoute = useCallback(
    async (routeData, weights) => {
      if (!routeData) return;
      setAgentActive(true);
      setAgentLogs([]);
      setRiskReports([]);
      setRiskAnalysis(null);

      console.log("Analyzing route:", routeData, "with weights:", weights);

      try {
        setAgentLogs((prev) => [
          ...prev,
          {
            type: "user",
            values: {
              content: `Starting risk analysis for selected route ${
                routeData.route.origin.city || "N/A"
              } → ${
                routeData.route.destination.city || "N/A"
              }`,
            },
          },
        ]);

        const agentResponse = await callRiskAnalysisAgent(routeData, {
          weights,
          onEvent: (evt) => {
            // Simplified event handling - match root cause analysis pattern exactly
            if (evt.type === "update" || evt.type === "tool_start" || evt.type === "tool_end") {
              setAgentLogs((prev) => [...prev, evt]);
            } else if (evt.type === "final") {
              setAgentLogs((prev) => [...prev, evt]);
            } else if (evt.type === "error") {
              setAgentLogs((prev) => [...prev, evt]);
            }
          },
        });


        // Extrae el bloque JSON de weights sugeridos del texto del agente
        function extractWeightBlock(text) {
          const match = text.match(/\{[^}]*\}/);
          if (match) {
            try {
              return JSON.parse(match[0]);
            } catch {
              return null;
            }
          }
          return null;
        }

        const parsed = safeParseJson(agentResponse);
        const derivedFactors = deriveFactorDefaults(routeData);
        const mergedFactors = mergeFactorData(parsed?.factors, derivedFactors);
        const metrics = calculateRiskMetrics(mergedFactors, weights, routeData);

        // Si el agente no devuelve parsed.summary, usa el texto completo
        const summaryText = parsed?.summary || agentResponse || "Risk analysis completed successfully.";

        // Busca el bloque JSON en el texto completo si no está en parsed
        const weightBlock = parsed?.weightRecommendations || extractWeightBlock(agentResponse);

        console.log("Risk analysis summary:", summaryText);
        console.log("Suggested weights block:", weightBlock);

        setRiskAnalysis({
          ...metrics,
          summary: summaryText,
          recommendations: parsed?.recommendations || [],
          weightRecommendations: weightBlock || null,
          factors: mergedFactors,
          weightsUsed: weights,
          rawResponse: parsed || agentResponse,
          route: routeData,
        });

        setRiskReports([
          {
            _id: Date.now(),
            route: routeData,
            summary: summaryText,
            weightedRisk: metrics.weightedRisk,
            valueAtRisk: metrics.valueAtRisk,
          },
        ]);
      } catch (error) {
        console.error("Error analyzing selected route:", error);
        setAgentLogs((prev) => [
          ...prev,
          {
            type: "error",
            values: {
              content: `Error: ${error.message}`,
            },
          },
        ]);
      } finally {
        setAgentActive(false);
      }
    },
    []
  );

  return {
    availableRoutes,
    selectedRouteId,
    setSelectedRouteId,
    agentActive,
    riskReports,
    agentLogs,
    riskAnalysis,
    loadAvailableRoutes,
    handleAnalyzeSelectedRoute,
  };
}
