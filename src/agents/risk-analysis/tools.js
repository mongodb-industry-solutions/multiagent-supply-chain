import { tool } from "@langchain/core/tools";
import getMongoClientPromise from "@/integrations/mongodb/client";

const parseStateCode = (value) => {
	if (!value) return null;
	if (typeof value === "string") {
		const parts = value.split(",").map((p) => p.trim());
		const candidate = parts[parts.length - 1] || parts[0];
		return candidate ? candidate.toUpperCase() : null;
	}
	if (typeof value === "object") {
		return value.state ? value.state.toUpperCase() : null;
	}
	return null;
};

const normalizeDate = (value) => {
	if (!value) return null;
	if (value instanceof Date) return value;
	if (typeof value === "string") return new Date(value);
	if (value.$date) return new Date(value.$date);
	return null;
};

const ACTIVE_STATUSES = ["active", "ongoing", "forecasted"];

// Query relevant weather events for the route and dates
export const retrieveWeatherEvents = tool(
	async ({ origin, destination, date, n = 5 }) => {
		try {
			const client = await getMongoClientPromise();
			const dbName = process.env.DATABASE_NAME;
			const db = client.db(dbName);

			// Handle date parsing - support ISO strings, MongoDB $date format, or Date objects
			let analysisDate;
			if (!date) {
				analysisDate = new Date();
			} else if (typeof date === 'string') {
				analysisDate = new Date(date);
			} else if (date.$date) {
				analysisDate = new Date(date.$date);
			} else if (date instanceof Date) {
				analysisDate = date;
			} else {
				analysisDate = new Date();
			}
			
			if (isNaN(analysisDate.getTime())) {
				console.warn("[retrieveWeatherEvents] Invalid date, using current date:", date);
				analysisDate = new Date();
			}
		const windowStart = new Date(analysisDate);
		windowStart.setDate(windowStart.getDate() - 30);
		const windowEnd = new Date(analysisDate);
		windowEnd.setDate(windowEnd.getDate() + 30);

		const stateCodes = [
			parseStateCode(origin),
			parseStateCode(destination),
		]
			.filter(Boolean)
			.map((state) => state.toUpperCase());

		const stateQuery = stateCodes.length
			? { affected_states: { $in: stateCodes } }
			: {};

		const rawEvents = await db
			.collection("weather_events")
			.find(stateQuery)
			.toArray();

		const relevantEvents = rawEvents
			.filter((event) => {
				if (!stateCodes.length) return true;
				const eventStates = (event.affected_states || []).map((s) =>
					s.toUpperCase()
				);
				return eventStates.some((state) => stateCodes.includes(state));
			})
			.filter((event) => {
				const startDate = normalizeDate(event.start_date);
				const endDate = normalizeDate(event.end_date);
				const status = (event.status || "").toLowerCase();

				if (startDate && endDate) {
					return (
						analysisDate >= startDate &&
						analysisDate <= endDate
					);
				}

				if (startDate && !endDate && analysisDate >= startDate) {
					return true;
				}

				if (ACTIVE_STATUSES.includes(status)) {
					if (!startDate) return true;
					return (
						startDate <= windowEnd &&
						startDate >= windowStart
					);
				}

				if (startDate) {
					return (
						startDate <= windowEnd &&
						startDate >= windowStart
					);
				}

				return false;
			})
			.sort((a, b) => {
				const aStart = normalizeDate(a.start_date)?.getTime() || 0;
				const bStart = normalizeDate(b.start_date)?.getTime() || 0;
				return bStart - aStart;
			})
			.slice(0, n);

			return JSON.stringify(relevantEvents);
		} catch (error) {
			console.error("[retrieveWeatherEvents] Error:", error);
			return JSON.stringify({
				error: error.message || String(error),
				events: [],
			});
		}
	},
	{
		name: "retrieve_weather_events",
		description:
			"Retrieve relevant weather or seasonal events affecting the origin/destination states near the shipment date.",
		schema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the tool for identification purposes",
					enum: ["retrieve_weather_events"],
				  },
				origin: {
					type: ["object", "string"],
					description:
						"Origin location (expects { city, state } but also accepts a comma-delimited string).",
				},
				destination: {
					type: ["object", "string"],
					description:
						"Destination location (expects { city, state } but also accepts a comma-delimited string).",
				},
				date: {
					type: "string",
					description:
						"Shipment ISO date string (use route.estimated_delivery, route.shipment_date, or created_at).",
				},
				n: {
					type: "number",
					description: "Number of events to return",
					default: 5,
				},
			},
			required: ["origin", "destination", "date", "name"],
		},
	}
);

export const extractWeightRecommendation = tool(
	async ({ analysis, weightType }) => {
		try {
			const lines = analysis.split("\n");
			for (const line of lines) {
				const lowerLine = line.toLowerCase();
				if (lowerLine.includes(weightType.toLowerCase()) && lowerLine.includes("increase")) {
					return "increase";
				}
				if (lowerLine.includes(weightType.toLowerCase()) && lowerLine.includes("decrease")) {
					return "decrease";
				}
			}
			return "no_change";
		} catch (error) {
			console.error("[extractWeightRecommendation] Error:", error);
			return "no_change";
		}
		
	},
	{
		name: "extract_weight_recommendation",
		description:
			"Extract recommendation to increase, decrease, or make no change to a specific risk weight based on the analysis.",
		schema: {
			type: "object",
			properties: {
				analysis: {
					type: "string",
					description: "The risk analysis text to parse for recommendations.",
				},
				weightType: {
					type: "string",
					description: "The type of weight to check (e.g., 'weather', 'border delays').",
				},
			},
			required: ["analysis", "weightType", "name"],
		},
	}
);

// Query historical border incidents for the route
export const retrieveBorderIncidents = tool(
	async ({ border, date, n = 5 }) => {
		try {
			const client = await getMongoClientPromise();
			const dbName = process.env.DATABASE_NAME;
			const db = client.db(dbName);
			
			// Normalize date for query
			let queryDate = date;
			if (date && typeof date === 'object' && date.$date) {
				queryDate = date.$date;
			} else if (date instanceof Date) {
				queryDate = date.toISOString();
			}
			
			const incidents = await db.collection("incidents")
				.find({
					type: "border",
					border,
					date: { $lte: queryDate }
				})
				.sort({ date: -1 })
				.limit(n)
				.toArray();
			return JSON.stringify(incidents);
		} catch (error) {
			console.error("[retrieveBorderIncidents] Error:", error);
			return JSON.stringify({
				error: error.message || String(error),
				incidents: [],
			});
		}
	},
	{
		name: "retrieve_border_incidents",
		description: "Retrieve recent border crossing incidents for a given border and date.",
		schema: {
			type: "object",
			name: {
					type: "string",
					description: "Name of the tool for identification purposes",
					enum: ["retrieve_border_incidents"],
				  },
			properties: {
				border: { type: "string", description: "Border crossing name or code" },
				date: { type: "string", description: "ISO date string" },
				n: { type: "number", description: "Number of incidents to return", default: 5 }
			},
			required: ["border", "date", "name"],
		},
	}
);

// Get carrier reliability history
export const retrieveCarrierPerformance = tool(
	async ({ carrier, n = 5 }) => {
		try {
			const client = await getMongoClientPromise();
			const dbName = process.env.DATABASE_NAME;
			const db = client.db(dbName);
			const shipments = await db.collection("shipments")
				.find({ carrier })
				.sort({ created_at: -1 })
				.limit(n)
				.toArray();
			return JSON.stringify(shipments);
		} catch (error) {
			console.error("[retrieveCarrierPerformance] Error:", error);
			return JSON.stringify({
				error: error.message || String(error),
				shipments: [],
			});
		}
	},
	{
		name: "retrieve_carrier_performance",
		description: "Retrieve recent shipment performance for a specific carrier.",
		schema: {
			type: "object",
			name: {
					type: "string",
					description: "Name of the tool for identification purposes",
					enum: ["retrieve_carrier_performance"],
				  },
			properties: {
				carrier: { type: "string", description: "Carrier name" },
				n: { type: "number", description: "Number of shipments to return", default: 5 }
			},
			required: ["carrier", "name"],
		},
	}
);

// // Query historical data about similar route complexity
// export const retrieveRouteComplexity = tool(
// 	async ({ origin, destination, n = 5 }) => {
// 		try {
// 			const client = await getMongoClientPromise();
// 			const dbName = process.env.DATABASE_NAME;
// 			const db = client.db(dbName);

// 			const originCity = typeof origin === "object" ? origin?.city : origin;
// 			const originState = typeof origin === "object" ? origin?.state : undefined;
// 			const destinationCity = typeof destination === "object" ? destination?.city : destination;
// 			const destinationState = typeof destination === "object" ? destination?.state : undefined;

// 			const match = {
// 				...(originCity ? { "origin.city": originCity } : {}),
// 				...(originState ? { "origin.state": originState } : {}),
// 				...(destinationCity ? { "destination.city": destinationCity } : {}),
// 				...(destinationState ? { "destination.state": destinationState } : {}),
// 			};

// 			const routes = await db.collection("shipments")
// 				.find(match)
// 				.sort({ "created_at.$date": -1 })
// 				.limit(n)
// 				.toArray();
// 			return JSON.stringify(routes);
// 		} catch (error) {
// 			console.error("[retrieveRouteComplexity] Error:", error);
// 			return JSON.stringify({
// 				error: error.message || String(error),
// 				routes: [],
// 			});
// 		}
// 	},
// 	{
// 		name: "retrieve_route_complexity",
// 		description: "Retrieve historical shipments for similar routes using the seeded shipments collection (origin/destination city/state).",
// 		schema: {
// 			type: "object",
// 			properties: {
// 				origin: {
// 					type: ["object", "string"],
// 					description: "Origin (object with city/state or string value).",
// 				},
// 				destination: {
// 					type: ["object", "string"],
// 					description: "Destination (object with city/state or string value).",
// 				},
// 				n: { type: "number", description: "Number of routes to return", default: 5 }
// 			},
// 			required: ["origin", "destination"],
// 		},
// 	}
// );
