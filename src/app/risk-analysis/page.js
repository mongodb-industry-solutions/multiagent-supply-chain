"use client";
import React, { useState, useEffect } from "react";
import AgentStatus from "@/components/agentStatus/AgentStatus";

import { H3, Description, Subtitle } from "@leafygreen-ui/typography";
import Button from "@leafygreen-ui/button";
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";
import { useRiskAnalysis } from "./hooks";

export default function RiskAnalysis() {
  const [selectedRouteData, setSelectedRouteData] = useState(null);

  // Slider weights state (0-1)
  const [weights, setWeights] = useState({
    carrierReliability: 0.8,
    routeComplexity: 0.6,
    weatherPatterns: 0.5,
    borderCrossing: 0.7,
  });

  useEffect(() => {
    // Check for selected route data from Transportation Planning
    const routeData = sessionStorage.getItem('selected_route_for_risk');
    if (routeData) {

      console.log("Retrieved route data for risk analysis:", routeData);
      const parsedData = JSON.parse(routeData);

      setSelectedRouteData(parsedData);
    }
  }, []);

  const {
    agentActive,
    agentLogs,
    riskAnalysis,
    loadAvailableRoutes,
    handleAnalyzeSelectedRoute,
  } = useRiskAnalysis();

      useEffect(() => {
        loadAvailableRoutes();
      }, [loadAvailableRoutes]);

  return (
    <LeafyGreenProvider baseFontSize={16}>
      <main className="flex flex-col w-full h-full">
        {/* Page Title & Subheader */}
        <div className="flex flex-col items-start justify-center px-6 py-4">
          <H3 className="mb-1 text-left">Risk Analysis</H3>
          <Description className="text-left max-w-2xl mb-2">
            Analyze supply chain risks and forecast potential disruptions using historical data and predictive modeling.
          </Description>
        </div>

        <div className="flex flex-1 min-h-0 w-full gap-6 px-6 pb-4">
          {/* Panel 1: Selected Route Info */}
          {selectedRouteData && (
            <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4">
              {/* ...existing code for route details and sliders... */}
              <div className="space-y-2 text-lg font-semibold text-black bg-white p-4 rounded-lg mb-4">
                <Subtitle className="mb-3 text-black">Selected Route</Subtitle>
                <div><strong>Carrier:</strong> {selectedRouteData.carrier}</div>
                <div><strong>Origin:</strong> {selectedRouteData.route.origin.city}, {selectedRouteData.route.origin.state}</div>
                <div><strong>Destination:</strong> {selectedRouteData.route.destination.city}, {selectedRouteData.route.destination.state}</div>
                <div><strong>Estimated Cost:</strong> ${Number(selectedRouteData.cost).toLocaleString()}</div>
                <div><strong>Transit Time:</strong> {selectedRouteData.time_hours} hours</div>
                <div><strong>Reliability:</strong> {(
                  selectedRouteData.reliability_score > 1
                    ? selectedRouteData.reliability_score
                    : selectedRouteData.reliability_score * 100
                ).toFixed(2)}%</div>
              </div>
              <div className="mt-2 p-4 rounded-lg bg-white">
                <Subtitle className="mb-2 text-gray-800">Risk Factor Weights</Subtitle>
                <div className="space-y-4">
                  {/* ...existing code for sliders... */}
                  <div>
                    <label htmlFor="carrierReliability" className="block text-sm font-medium text-gray-700">Carrier Reliability</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-black">0</span>
                      <input
                        type="range"
                        id="carrierReliability"
                        min="0"
                        max="1"
                        step="0.01"
                        value={weights.carrierReliability}
                        onChange={e => setWeights(w => ({ ...w, carrierReliability: parseFloat(e.target.value) }))}
                        className="w-full accent-[#00ED64]" style={{ background: '#00684A' }}
                      />
                        <span className="text-sm font-semibold text-black">1</span>
                    </div>
                      <div className="text-base font-bold text-black mt-1">Weight: {weights.carrierReliability.toFixed(2)}</div>
                  </div>
                  <div>
                    <label htmlFor="routeComplexity" className="block text-sm font-medium text-gray-700">Route Complexity</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-black">0</span>
                      <input
                        type="range"
                        id="routeComplexity"
                        min="0"
                        max="1"
                        step="0.01"
                        value={weights.routeComplexity}
                        onChange={e => setWeights(w => ({ ...w, routeComplexity: parseFloat(e.target.value) }))}
                        className="w-full accent-[#00ED64]" style={{ background: '#00684A' }}
                      />
                        <span className="text-sm font-semibold text-black">1</span>
                    </div>
                      <div className="text-base font-bold text-black mt-1">Weight: {weights.routeComplexity.toFixed(2)}</div>
                  </div>
                  <div>
                    <label htmlFor="weatherPatterns" className="block text-sm font-medium text-gray-700">Weather Patterns</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-black">0</span>
                      <input
                        type="range"
                        id="weatherPatterns"
                        min="0"
                        max="1"
                        step="0.01"
                        value={weights.weatherPatterns}
                        onChange={e => setWeights(w => ({ ...w, weatherPatterns: parseFloat(e.target.value) }))}
                        className="w-full accent-[#00ED64]" style={{ background: '#00684A' }}
                      />
                        <span className="text-sm font-semibold text-black">1</span>
                    </div>
                      <div className="text-base font-bold text-black mt-1">Weight: {weights.weatherPatterns.toFixed(2)}</div>
                  </div>
                  <div>
                    <label htmlFor="borderCrossing" className="block text-sm font-medium text-gray-700">Border Crossing</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-black">0</span>
                      <input
                        type="range"
                        id="borderCrossing"
                        min="0"
                        max="1"
                        step="0.01"
                        value={weights.borderCrossing}
                        onChange={e => setWeights(w => ({ ...w, borderCrossing: parseFloat(e.target.value) }))}
                        className="w-full accent-[#00ED64]" style={{ background: '#00684A' }}
                      />
                        <span className="text-sm font-semibold text-black">1</span>
                    </div>
                      <div className="text-base font-bold text-black mt-1">Weight: {weights.borderCrossing.toFixed(2)}</div>
                  </div>
                </div>
                <Button
                  variant="primary"
                  disabled={!selectedRouteData || agentActive}
                  onClick={() => handleAnalyzeSelectedRoute(selectedRouteData, weights)}
                  className="w-full mt-6"
                >
                  {agentActive ? "Analyzing..." : "Run Risk Analysis"}
                </Button>
              </div>
            </section>
          )}

          {/* Panel 2: Central Agent Panel */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
            {/* Agent Status */}
            <div className="mb-4">
              <AgentStatus
                isActive={agentActive}
                logs={agentLogs}
                statusText="Risk Analysis Agent"
                activeText="Analyzing Risk"
                inactiveText="Ready"
              />
            </div>
            {/* Action Button */}
            {/* Removed duplicated action button from agent panel */}
            {/* Agent Output */}
            {riskAnalysis && (
              <div className="bg-gray-50 rounded-lg p-4 w-full text-left">
                <div className="text-lg font-bold text-green-700 mb-2">
                  Value at Risk (VaR): ${Number(riskAnalysis.valueAtRisk || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
                <div className="text-base text-gray-700 mb-2">
                  Weighted Risk: {(riskAnalysis.weightedRisk * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {riskAnalysis.summary}
                </div>
                <div className="text-left text-sm text-gray-600 space-y-1">
                  <div><strong>Carrier Reliability Risk:</strong> {(riskAnalysis.factors.carrierReliability.score * 100).toFixed(2)}% — {riskAnalysis.factors.carrierReliability.detail}</div>
                  <div><strong>Route Complexity Risk:</strong> {(riskAnalysis.factors.routeComplexity.score * 100).toFixed(2)}% — {riskAnalysis.factors.routeComplexity.detail}</div>
                  <div><strong>Weather Patterns Risk:</strong> {(riskAnalysis.factors.weatherPatterns.score * 100).toFixed(2)}% — {riskAnalysis.factors.weatherPatterns.detail}</div>
                  <div><strong>Border Crossing Risk:</strong> {(riskAnalysis.factors.borderCrossing.score * 100).toFixed(2)}% — {riskAnalysis.factors.borderCrossing.detail}</div>
                </div>
                {riskAnalysis.weightRecommendations && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Subtitle className="text-sm text-black mb-2 font-semibold">
                      🎯 Suggested Weight Adjustments
                    </Subtitle>
                    <div className="space-y-2 text-sm">
                      {Object.entries(riskAnalysis.weightRecommendations).map(([key, rec]) => {
                        if (!rec || typeof rec.suggestedWeight !== 'number') return null;
                        const currentWeight = weights[key] || 0;
                        const diff = Math.abs(rec.suggestedWeight - currentWeight);
                        if (diff < 0.05) return null; // Skip if already close
                        return (
                          <div key={key} className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-blue-100">
                            <div className="flex-1">
                              <div className="font-medium text-gray-800 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {rec.reason}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Current: {currentWeight.toFixed(2)} → Suggested: {rec.suggestedWeight.toFixed(2)}
                              </div>
                            </div>
                            <Button
                              size="small"
                              variant="primary"
                              onClick={() => {
                                setWeights(w => ({ ...w, [key]: rec.suggestedWeight }));
                              }}
                            >
                              Apply
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {riskAnalysis.recommendations.length > 0 && (
                  <div className="mt-3">
                    <Subtitle className="text-sm text-black mb-1">Recommendations</Subtitle>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {riskAnalysis.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {/* Empty State */}
            {!selectedRouteData && (
              <div className="bg-gray-50 rounded-lg p-4 w-full text-center text-gray-400">No route selected for analysis</div>
            )}
          </section>

          {/* Panel 3: Risk Cards (to be implemented) */}
          {/* <section className="flex flex-col w-1/3 border border-gray-200 rounded-xl bg-white p-4">
            <Subtitle className="mb-3 text-black">Risk Factors</Subtitle>
            <div className="text-gray-400">Risk cards will be shown here after analysis</div>
          </section> */}

          {/* Empty State */}
          {!selectedRouteData && (
            <section className="flex flex-col w-full border border-gray-200 rounded-xl bg-white p-4">
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center bg-gray-50 rounded-lg p-8 w-full">
                  <div className="text-gray-500 mb-2">No route selected for analysis</div>
                  <div className="text-sm text-gray-400">
                    Go to Transportation Planning and select a route to analyze
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </LeafyGreenProvider>
  );
}