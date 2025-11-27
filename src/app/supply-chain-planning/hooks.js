import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { parseFallbackCarriers } from "@/lib/const/fallbackCarriers"
import { callTransportationPlanningAgent } from "@/lib/api/agent"

export function useSupplyChainPlanning() {
  const router = useRouter()
  
  // State management
  const [warehouses, setWarehouses] = useState([])
  const [carriers, setCarriers] = useState([])
  const [feasibleCarriers, setFeasibleCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inheritedShipment, setInheritedShipment] = useState(null)
  const [agentActive, setAgentActive] = useState(false)
  const [agentLogs, setAgentLogs] = useState([])
  const [alternativeRoutes, setAlternativeRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)

  // Initial data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check for inherited shipment from RCA
        const shipmentData = sessionStorage.getItem('inherited_shipment')
        if (shipmentData) {
          const parsedShipment = JSON.parse(shipmentData)

          
          // Fetch complete shipment details from MongoDB if we have a shipment_id
          if (parsedShipment.shipment_id) {
            try {
              const fullShipmentRes = await fetch(`/api/data?collection=shipments&filter={"shipment_id":"${parsedShipment.shipment_id}"}`)
              const fullShipmentData = await fullShipmentRes.json()
              
              if (fullShipmentData && fullShipmentData.length > 0) {
                // Merge RCA data (root_cause, delay_impact) with complete shipment data
                const completeShipment = {
                  ...fullShipmentData[0],
                  root_cause: parsedShipment.root_cause,
                  delay_impact: parsedShipment.delay_impact
                }
                setInheritedShipment(completeShipment)

              } else {
                // Fallback to RCA data only if full shipment not found
                setInheritedShipment(parsedShipment)
              }
            } catch (error) {
              console.error('Error fetching complete shipment:', error)
              setInheritedShipment(parsedShipment)
            }
          } else {
            setInheritedShipment(parsedShipment)
          }
        }
        
        // Fetch warehouses
        const warehousesRes = await fetch('/api/data?collection=warehouses')
        const warehousesData = await warehousesRes.json()
        
        // Fetch carriers
        const carriersRes = await fetch('/api/data?collection=carriers')
        const carriersData = await carriersRes.json()
        
        setWarehouses(warehousesData)
        setCarriers(carriersData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Function to fetch full carrier data for feasible carriers
  const fetchFeasibleCarrierData = useCallback(async (carrierNames) => {
    try {
      const carrierPromises = carrierNames.map(async (carrierName) => {
        const response = await fetch(`/api/data?collection=carriers&filter={"name":"${carrierName}"}`)
        const carrierData = await response.json()
        return carrierData.length > 0 ? carrierData[0] : null
      })
      
      const feasibleCarrierData = await Promise.all(carrierPromises)
      const validCarriers = feasibleCarrierData.filter(carrier => carrier !== null)
      console.log('Fetched feasible carriers data:', validCarriers)
      setFeasibleCarriers(validCarriers)
    } catch (error) {
      console.error('Error fetching feasible carrier data:', error)
    }
  }, [])

  // Find alternative routes using the Transportation Planning Agent
  const handleFindAlternatives = useCallback(async () => {
    if (!inheritedShipment) return
    
    setAgentActive(true)
    setAgentLogs([])
    setAlternativeRoutes([])
    
    try {
      console.log('Finding alternative routes for shipment:', inheritedShipment.shipment_id)
      
      setAgentLogs(prev => [...prev, {
        type: "user",
        values: {
          content: `Finding alternative routes for delayed shipment ${inheritedShipment.shipment_id}\nOriginal carrier: ${inheritedShipment.carrier}\nRoot cause: ${inheritedShipment.root_cause}`
        }
      }])
      
      // Track format_alternatives tool result
      let formatAlternativesResult = null;
      
      // Call Transportation Planning Agent with streaming events
      const agentResponse = await callTransportationPlanningAgent(inheritedShipment, {
        onEvent: (evt) => {
          // Simplified event handling - match risk analysis pattern exactly
          if (evt.type === "update" || evt.type === "tool_start" || evt.type === "tool_end") {
            setAgentLogs((prev) => [...prev, evt]);
            
            // Extract structured alternatives from format_alternatives tool_end event
            if (evt.type === "update" && evt.name === "tool_end") {
              const toolName = evt.values?.name || evt.values?.kwargs?.name || evt.values?.tool || "";
              if (toolName === "format_alternatives" || toolName.includes("format_alternatives")) {
                // Try to extract the tool result from various possible locations
                let toolResultContent = null;
                
                // Check multiple possible locations for the tool result
                if (evt.values?.content) {
                  toolResultContent = evt.values.content;
                } else if (evt.values?.result) {
                  toolResultContent = evt.values.result;
                } else if (evt.values?.kwargs?.content) {
                  toolResultContent = evt.values.kwargs.content;
                } else if (evt.values?.output) {
                  toolResultContent = evt.values.output;
                }
                
                if (toolResultContent) {
                  try {
                    // Try parsing as JSON (tool returns JSON string)
                    const parsed = typeof toolResultContent === 'string' 
                      ? JSON.parse(toolResultContent)
                      : toolResultContent;
                    
                    if (parsed && parsed.alternatives && Array.isArray(parsed.alternatives)) {
                      formatAlternativesResult = parsed;
                      console.log('✅ Extracted format_alternatives result from tool_end event:', parsed);
                    } else if (parsed && typeof parsed === 'object') {
                      formatAlternativesResult = parsed;
                      console.log('✅ Extracted format_alternatives result (checking structure):', parsed);
                    }
                  } catch (e) {
                    console.log('⚠️ Could not parse format_alternatives result:', e, 'Raw content:', toolResultContent);
                  }
                }
              }
            }
          } else if (evt.type === "final") {
            setAgentLogs((prev) => [...prev, evt]);
          } else if (evt.type === "error") {
            setAgentLogs((prev) => [...prev, evt]);
          }
        },
      })
      
      // Use structured alternatives from tool_end event first
      let parsedAlternatives = null;
      
      if (formatAlternativesResult) {
        // Handle both string and object formats
        let parsed = formatAlternativesResult;
        if (typeof formatAlternativesResult === 'string') {
          try {
            parsed = JSON.parse(formatAlternativesResult);
          } catch (e) {
            console.error('Failed to parse format_alternatives result:', e);
          }
        }
        
        // Check for alternatives in the parsed result
        if (parsed && parsed.alternatives && Array.isArray(parsed.alternatives)) {
          parsedAlternatives = parsed.alternatives;
          console.log('✅ Using structured alternatives from format_alternatives tool:', parsedAlternatives);
        } else if (parsed && Array.isArray(parsed)) {
          // If the result is directly an array of alternatives
          parsedAlternatives = parsed;
          console.log('✅ Using alternatives array directly from format_alternatives tool:', parsedAlternatives);
        } else {
          console.log('⚠️ format_alternatives result structure:', parsed);
        }
      }
      
      // Fallback: Try to parse JSON from the text response
      if (!parsedAlternatives || parsedAlternatives.length === 0) {
        try {
          const jsonMatch = agentResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.alternatives && Array.isArray(parsed.alternatives)) {
              parsedAlternatives = parsed.alternatives;
              console.log('Using structured alternatives from text response:', parsedAlternatives);
            }
          }
        } catch (e) {
          // JSON parsing failed, will use fallback
        }
      }
      
      // Use structured alternatives if found, otherwise parse from text
      if (parsedAlternatives && parsedAlternatives.length > 0) {
        setAlternativeRoutes(parsedAlternatives);
        
        // Extract carrier names and fetch their full data
        const carrierNames = parsedAlternatives.map(alt => alt.carrier);
        await fetchFeasibleCarrierData(carrierNames);
      } else {
        // Fallback: parse from text if no structured data available
        const alternativeRoutes = parseFallbackCarriers(agentResponse);
        
        if (alternativeRoutes && alternativeRoutes.length > 0) {
          setAlternativeRoutes(alternativeRoutes)
          
          // Extract carrier names and fetch their full data for fallback routes too
          const carrierNames = alternativeRoutes.map(alt => alt.carrier);
          await fetchFeasibleCarrierData(carrierNames);
        }
      }
      
      setAgentActive(false)
      
    } catch (error) {
      console.error("Error finding alternatives:", error)
      setAgentLogs(prev => [...prev, {
        type: "error",
        values: {
          content: `Error: ${error.message}`
        }
      }])
      setAgentActive(false)
    }
  }, [inheritedShipment, fetchFeasibleCarrierData])

  // Handle route selection
  const handleRouteSelection = useCallback((selectedId) => {
    const route = alternativeRoutes.find(r => r.id === selectedId)
    setSelectedRoute(route)
  }, [alternativeRoutes])

  // Navigate to Risk Analysis with selected route
  const handleAnalyzeRisk = useCallback(() => {
    if (selectedRoute && inheritedShipment) {
      const riskAnalysisData = {
        carrier: selectedRoute.carrier,
        route: {
          origin: inheritedShipment.origin,
          destination: inheritedShipment.destination
        },
        shipment_id: inheritedShipment.shipment_id,
        cost: selectedRoute.estimated_cost,
        time_hours: selectedRoute.estimated_time_hours,
        reliability_score: selectedRoute.reliability_score,
        emissions_kg: selectedRoute.emissions_kg,
        // Include date information for contextual analysis
        estimated_delivery: inheritedShipment.estimated_delivery || new Date().toISOString(),
        created_at: inheritedShipment.created_at || new Date().toISOString(),
        // Include shipment date if available
        shipment_date: inheritedShipment.estimated_delivery?.$date || inheritedShipment.estimated_delivery || new Date().toISOString()
      }
      
      // Store selected route for Risk Analysis
      sessionStorage.setItem('selected_route_for_risk', JSON.stringify(riskAnalysisData))
      
      // Navigate to Risk Analysis
      router.push('/risk-analysis')
    }
  }, [selectedRoute, inheritedShipment, router])

  return {
    warehouses,
    carriers,
    feasibleCarriers,
    setFeasibleCarriers,
    loading,
    inheritedShipment,
    agentActive,
    setAgentActive,
    agentLogs,
    setAgentLogs,
    alternativeRoutes,
    setAlternativeRoutes,
    selectedRoute,
    setSelectedRoute,
    fetchFeasibleCarrierData,
    handleFindAlternatives,
    handleRouteSelection,
    handleAnalyzeRisk,
  }
}

