import { tool } from "@langchain/core/tools";
import getMongoClientPromise from "@/integrations/mongodb/client";

// Query relevant weather events for the route and dates
export const retrieveWeatherEvents = tool(
	async ({ origin, destination, date, n = 5 }) => {
		const client = await getMongoClientPromise();
		const dbName = process.env.DATABASE_NAME;
		const db = client.db(dbName);
		// Find weather events near the origin/destination and date
		const events = await db.collection("weather_events")
			.find({
				$or: [
					{ location: origin },
					{ location: destination }
				],
				date: { $lte: date }
			})
			.sort({ date: -1 })
			.limit(n)
			.toArray();
		return JSON.stringify(events);
	},
	{
		name: "retrieve_weather_events",
		description: "Retrieve recent weather events for a route and date.",
		schema: {
			type: "object",
			properties: {
				origin: { type: "string", description: "Origin city/state" },
				destination: { type: "string", description: "Destination city/state" },
				date: { type: "string", description: "ISO date string" },
				n: { type: "number", description: "Number of events to return", default: 5 }
			},
			required: ["origin", "destination", "date"],
		},
	}
);

// Query historical border incidents for the route
export const retrieveBorderIncidents = tool(
	async ({ border, date, n = 5 }) => {
		const client = await getMongoClientPromise();
		const dbName = process.env.DATABASE_NAME;
		const db = client.db(dbName);
		const incidents = await db.collection("incidents")
			.find({
				type: "border",
				border,
				date: { $lte: date }
			})
			.sort({ date: -1 })
			.limit(n)
			.toArray();
		return JSON.stringify(incidents);
	},
	{
		name: "retrieve_border_incidents",
		description: "Retrieve recent border crossing incidents for a given border and date.",
		schema: {
			type: "object",
			properties: {
				border: { type: "string", description: "Border crossing name or code" },
				date: { type: "string", description: "ISO date string" },
				n: { type: "number", description: "Number of incidents to return", default: 5 }
			},
			required: ["border", "date"],
		},
	}
);

// Get carrier reliability history
export const retrieveCarrierPerformance = tool(
	async ({ carrier, n = 5 }) => {
		const client = await getMongoClientPromise();
		const dbName = process.env.DATABASE_NAME;
		const db = client.db(dbName);
		const shipments = await db.collection("shipments")
			.find({ carrier })
			.sort({ created_at: -1 })
			.limit(n)
			.toArray();
		return JSON.stringify(shipments);
	},
	{
		name: "retrieve_carrier_performance",
		description: "Retrieve recent shipment performance for a specific carrier.",
		schema: {
			type: "object",
			properties: {
				carrier: { type: "string", description: "Carrier name" },
				n: { type: "number", description: "Number of shipments to return", default: 5 }
			},
			required: ["carrier"],
		},
	}
);

// Query historical data about similar route complexity
export const retrieveRouteComplexity = tool(
	async ({ origin, destination, n = 5 }) => {
		const client = await getMongoClientPromise();
		const dbName = process.env.DATABASE_NAME;
		const db = client.db(dbName);
		const routes = await db.collection("shipments")
			.find({
				"route.origin.city": origin.city,
				"route.destination.city": destination.city
			})
			.sort({ created_at: -1 })
			.limit(n)
			.toArray();
		return JSON.stringify(routes);
	},
	{
		name: "retrieve_route_complexity",
		description: "Retrieve historical shipments for similar routes to analyze complexity.",
		schema: {
			type: "object",
			properties: {
				origin: { type: "object", description: "Origin city/state", properties: { city: { type: "string" } } },
				destination: { type: "object", description: "Destination city/state", properties: { city: { type: "string" } } },
				n: { type: "number", description: "Number of routes to return", default: 5 }
			},
			required: ["origin", "destination"],
		},
	}
);
