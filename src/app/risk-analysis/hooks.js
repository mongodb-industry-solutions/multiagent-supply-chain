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
  
  const routeCost = Number(routeData?.cost) || 0;
  
  // VaR formula: Base cost + risk-based penalties
  // Base: 50% of route cost (minimum operational exposure)
  // Risk premium: Route cost × weighted risk (potential additional costs from delays, penalties, etc.)
  const baseCost = routeCost * 0.5;
  const riskPremium = routeCost * weightedRisk;
  const valueAtRisk = baseCost + riskPremium;
  
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
  const [currentThreadId, setCurrentThreadId] = useState(null); // Track persistent thread ID

  // Load available routes (replace with real API if needed)
  const loadAvailableRoutes = useCallback(async () => {
    // Example: Load from sessionStorage
    const routeData = sessionStorage.getItem("selected_route_for_risk");
    if (routeData) {
      const parsed = JSON.parse(routeData);
      setAvailableRoutes([parsed]);
      setSelectedRouteId(parsed.id || null);
      
      const routeSignature = `${parsed.carrier}-${parsed.route.origin.city}-${parsed.route.destination.city}`;
      const threadId = `risk-${routeSignature.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;
      setCurrentThreadId(threadId);
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
          threadId: currentThreadId, // Pass persistent thread ID
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


        function extractWeightBlock(text) {
          const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const candidate = fenceMatch ? fenceMatch[1] : text;

          const start = candidate.indexOf('{');
          if (start === -1) return null;
          let depth = 0;
          for (let i = start; i < candidate.length; i++) {
            if (candidate[i] === '{') depth++;
            else if (candidate[i] === '}') {
              depth--;
              if (depth === 0) {
                try {
                  const parsed = JSON.parse(candidate.slice(start, i + 1));
                  const keys = ['carrierReliability', 'routeComplexity', 'weatherPatterns', 'borderCrossing'];
                  const valid = keys.some(k => parsed[k] && typeof parsed[k].suggestedWeight === 'number');
                  return valid ? parsed : null;
                } catch {
                  return null;
                }
              }
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
    [currentThreadId]
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
