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
  const [weightsApplied, setWeightsApplied] = useState(false);

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

  // Reset confirmation when running new analysis
  useEffect(() => {
    setWeightsApplied(false);
  }, [riskAnalysis]);

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
              <div className="bg-gray-50 rounded-lg p-4 w-full text-left space-y-4 overflow-y-auto">
                {/* Value at Risk - Prominent Display */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Value at Risk
                  </div>
                  <div className="text-3xl font-bold text-red-700 mb-1">
                    ${Number(riskAnalysis.valueAtRisk || 0).toLocaleString(undefined, { 
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2 
                    })}
                  </div>
                  <div className="text-sm text-gray-600">
                    Weighted Risk: <span className="font-semibold">{(riskAnalysis.weightedRisk * 100).toFixed(2)}%</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
                  <Subtitle className="text-sm font-semibold text-black mb-2">Summary</Subtitle>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {riskAnalysis.summary}
                  </p>
                  {/* Mostrar botón para aplicar suggested weights si existen */}
                  {riskAnalysis.weightRecommendations && !weightsApplied && (
                    <div className="mt-4">
                      <Button
                        variant="primary"
                        size="small"
                        disabled={agentActive}
                        onClick={() => {
                          setWeights(prev => ({
                            ...prev,
                            ...riskAnalysis.weightRecommendations
                          }));
                          setWeightsApplied(true);
                        }}
                      >
                        Apply Suggested Weights
                      </Button>
                    </div>
                  )}
                  {weightsApplied && (
                    <div className="mt-4 text-green-700 font-semibold text-sm">
                      ✅ Suggested weights applied!
                    </div>
                  )}
                </div>

                {/* Recommendations with Action Button */}
                {riskAnalysis.recommendations && riskAnalysis.recommendations.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <Subtitle className="text-sm font-semibold text-black mb-2 flex items-center gap-2">
                      <span>💡</span> Recommendations
                    </Subtitle>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
                      {riskAnalysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="leading-relaxed">{rec}</li>
                      ))}
                    </ul>
                    {/* Check if any recommendation suggests weight changes */}
                    {riskAnalysis.weightRecommendations && 
                     Object.values(riskAnalysis.weightRecommendations).some(rec => 
                       rec && typeof rec.suggestedWeight === 'number'
                     ) && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <p className="text-xs text-blue-700 font-medium mb-2">
                          ⚠️ Some recommendations require weight adjustments below
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Weight Recommendations - Enhanced */}
                {riskAnalysis.weightRecommendations && 
                 Object.entries(riskAnalysis.weightRecommendations).some(([key, rec]) => {
                   if (!rec || typeof rec.suggestedWeight !== 'number') return false;
                   const currentWeight = weights[key] || 0;
                   const diff = Math.abs(rec.suggestedWeight - currentWeight);
                   return diff >= 0.05; // Only show if there's a meaningful difference
                 }) && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                    <Subtitle className="text-sm font-semibold text-black mb-3 flex items-center gap-2">
                      <span>🎯</span> Suggested Weight Adjustments
                    </Subtitle>
                    <div className="space-y-3">
                      {Object.entries(riskAnalysis.weightRecommendations).map(([key, rec]) => {
                        if (!rec || typeof rec.suggestedWeight !== 'number') return null;
                        const currentWeight = weights[key] || 0;
                        const diff = Math.abs(rec.suggestedWeight - currentWeight);
                        if (diff < 0.05) return null; // Skip if already close
                        
                        const weightKeyMap = {
                          carrierReliability: 'Carrier Reliability',
                          routeComplexity: 'Route Complexity',
                          weatherPatterns: 'Weather Patterns',
                          borderCrossing: 'Border Crossing'
                        };
                        const displayName = weightKeyMap[key] || key.replace(/([A-Z])/g, ' $1').trim();
                        
                        return (
                          <div key={key} className="bg-white rounded-lg p-3 border border-yellow-200">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800 mb-1">
                                  {displayName}
                                </div>
                                <div className="text-xs text-gray-600 mb-2 leading-relaxed">
                                  {rec.reason}
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-500">Current:</span>
                                  <span className="font-medium text-gray-700">{currentWeight.toFixed(2)}</span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-gray-500">Suggested:</span>
                                  <span className="font-semibold text-blue-600">{rec.suggestedWeight.toFixed(2)}</span>
                                </div>
                              </div>
                              <Button
                                size="small"
                                variant="primary"
                                onClick={() => {
                                  setWeights(w => ({ ...w, [key]: rec.suggestedWeight }));
                                }}
                                className="flex-shrink-0"
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Risk Factors Breakdown */}
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <Subtitle className="text-sm font-semibold text-black mb-2">Risk Factors Breakdown</Subtitle>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-700">Carrier Reliability:</span>
                      <span className="text-right ml-2">
                        <span className="font-semibold">{(riskAnalysis.factors.carrierReliability.score * 100).toFixed(2)}%</span>
                        <div className="text-gray-500 text-xs mt-0.5">{riskAnalysis.factors.carrierReliability.detail}</div>
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-700">Route Complexity:</span>
                      <span className="text-right ml-2">
                        <span className="font-semibold">{(riskAnalysis.factors.routeComplexity.score * 100).toFixed(2)}%</span>
                        <div className="text-gray-500 text-xs mt-0.5">{riskAnalysis.factors.routeComplexity.detail}</div>
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-700">Weather Patterns:</span>
                      <span className="text-right ml-2">
                        <span className="font-semibold">{(riskAnalysis.factors.weatherPatterns.score * 100).toFixed(2)}%</span>
                        <div className="text-gray-500 text-xs mt-0.5">{riskAnalysis.factors.weatherPatterns.detail}</div>
                      </span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-gray-700">Border Crossing:</span>
                      <span className="text-right ml-2">
                        <span className="font-semibold">{(riskAnalysis.factors.borderCrossing.score * 100).toFixed(2)}%</span>
                        <div className="text-gray-500 text-xs mt-0.5">{riskAnalysis.factors.borderCrossing.detail}</div>
                      </span>
                    </div>
                  </div>
                </div>
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