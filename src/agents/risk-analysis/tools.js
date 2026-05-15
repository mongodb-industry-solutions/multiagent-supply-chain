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

const WEATHER_PROJECTION = {
	_id: 0,
	type: 1,
	name: 1,
	severity: 1,
	status: 1,
	affected_states: 1,
	start_date: 1,
	end_date: 1,
	"impact.avg_delay_hours": 1,
};

const INCIDENT_PROJECTION = {
	_id: 0,
	type: 1,
	severity: 1,
	title: 1,
	description: 1,
	reported_at: 1,
	affected_carrier: 1,
	estimated_delay_hours: 1,
	status: 1,
	tags: 1,
	"location.checkpoint": 1,
};

const SHIPMENT_PROJECTION = {
	_id: 0,
	status: 1,
	carrier: 1,
	"origin.city": 1,
	"origin.state": 1,
	"destination.city": 1,
	"destination.state": 1,
	estimated_delivery: 1,
	created_at: 1,
};

// Query relevant weather events for the route and dates
export const retrieveWeatherEvents = tool(
	async ({ origin, destination, date, n = 3 }) => {
		try {
			const client = await getMongoClientPromise();
			const dbName = process.env.DATABASE_NAME;
			const db = client.db(dbName);

			let analysisDate;
			if (!date) {
				analysisDate = new Date();
			} else if (typeof date === "string") {
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

			const stateCodes = [parseStateCode(origin), parseStateCode(destination)]
				.filter(Boolean)
				.map((s) => s.toUpperCase());

			const stateQuery = stateCodes.length
				? { affected_states: { $in: stateCodes } }
				: {};

			const rawEvents = await db
				.collection("weather_events")
				.find(stateQuery, { projection: WEATHER_PROJECTION })
				.toArray();

			const relevantEvents = rawEvents
				.filter((event) => {
					if (!stateCodes.length) return true;
					const eventStates = (event.affected_states || []).map((s) => s.toUpperCase());
					return eventStates.some((s) => stateCodes.includes(s));
				})
				.filter((event) => {
					const startDate = normalizeDate(event.start_date);
					const endDate = normalizeDate(event.end_date);
					const status = (event.status || "").toLowerCase();

					if (startDate && endDate) {
						return analysisDate >= startDate && analysisDate <= endDate;
					}
					if (startDate && !endDate && analysisDate >= startDate) return true;
					if (ACTIVE_STATUSES.includes(status)) {
						if (!startDate) return true;
						return startDate <= windowEnd && startDate >= windowStart;
					}
					if (startDate) {
						return startDate <= windowEnd && startDate >= windowStart;
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
			return JSON.stringify({ error: error.message || String(error), events: [] });
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
					default: 3,
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
				name: {
					type: "string",
					description: "Name of the tool for identification purposes",
					enum: ["extract_weight_recommendation"],
				},
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

// Query historical border crossing incidents for the route
export const retrieveBorderIncidents = tool(
	async ({ border, date, n = 3 }) => {
		try {
			const client = await getMongoClientPromise();
			const dbName = process.env.DATABASE_NAME;
			const db = client.db(dbName);

			const incidents = await db
				.collection("incidents")
				.find({
					$or: [
						{ tags: "border_crossing" },
						{ "location.checkpoint": { $regex: border || "", $options: "i" } },
					],
				})
				.sort({ reported_at: -1 })
				.limit(n)
				.project(INCIDENT_PROJECTION)
				.toArray();

			return JSON.stringify(incidents);
		} catch (error) {
			console.error("[retrieveBorderIncidents] Error:", error);
			return JSON.stringify({ error: error.message || String(error), incidents: [] });
		}
	},
	{
		name: "retrieve_border_incidents",
		description: "Retrieve recent border crossing incidents for a given border and date.",
		schema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the tool for identification purposes",
					enum: ["retrieve_border_incidents"],
				},
				border: { type: "string", description: "Border crossing name or code" },
				date: { type: "string", description: "ISO date string" },
				n: { type: "number", description: "Number of incidents to return", default: 3 },
			},
			required: ["border", "date", "name"],
		},
	}
);

// Get carrier reliability history
export const retrieveCarrierPerformance = tool(
	async ({ carrier, n = 3 }) => {
		try {
			const client = await getMongoClientPromise();
			const dbName = process.env.DATABASE_NAME;
			const db = client.db(dbName);
			const shipments = await db
				.collection("shipments")
				.find({ carrier })
				.sort({ created_at: -1 })
				.limit(n)
				.project(SHIPMENT_PROJECTION)
				.toArray();
			return JSON.stringify(shipments);
		} catch (error) {
			console.error("[retrieveCarrierPerformance] Error:", error);
			return JSON.stringify({ error: error.message || String(error), shipments: [] });
		}
	},
	{
		name: "retrieve_carrier_performance",
		description: "Retrieve recent shipment performance for a specific carrier.",
		schema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Name of the tool for identification purposes",
					enum: ["retrieve_carrier_performance"],
				},
				carrier: { type: "string", description: "Carrier name" },
				n: { type: "number", description: "Number of shipments to return", default: 3 },
			},
			required: ["carrier", "name"],
		},
	}
);
