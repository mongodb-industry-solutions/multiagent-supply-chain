// Risk Analysis Tools

/**
 * Calculates Value at Risk (VaR) for a given route and risk weights.
 * @param {Object} routeData - Route details (cost, reliability, etc.)
 * @param {Object} weights - Risk factor weights (0-1)
 * @returns {Object} VaR result with breakdown
 */
export function calculateVaR(routeData, weights) {
	// Realistic risk factor calculations
	const factors = {
		carrierReliability: getCarrierReliabilityRisk(routeData),
		routeComplexity: getRouteComplexityRisk(routeData),
		weatherPatterns: getWeatherPatternsRisk(routeData),
		borderCrossing: getBorderCrossingRisk(routeData),
	};

	/**
	 * Carrier Reliability Risk: Normalized inverse of reliability score (0 = best, 1 = worst)
	 */
	function getCarrierReliabilityRisk(data) {
		if (typeof data.reliability_score === 'number') {
			// reliability_score: 0-100 or 0-1
			const score = data.reliability_score > 1 ? data.reliability_score / 100 : data.reliability_score;
			return 1 - score;
		}
		return 0.5; // default risk
	}

	/**
	 * Route Complexity Risk: Based on number of segments, crossings, or a provided score
	 */
	function getRouteComplexityRisk(data) {
		if (typeof data.complexity_score === 'number') {
			return data.complexity_score; // expected 0-1
		}
		// Fallback: use distance or a default if segments do not exist
		if (data.route && typeof data.route.distance === 'number') {
			// Assume max distance of 2000km for normalization
			const maxDistance = 2000;
			return Math.min(data.route.distance / maxDistance, 1);
		}
		// If neither, use 0.5 as default
		return 0.5;
	}

	/**
	 * Weather Patterns Risk: Based on historical weather events or provided risk
	 */
	function getWeatherPatternsRisk(data) {
		if (typeof data.weather_risk === 'number') {
			return data.weather_risk; // expected 0-1
		}
		if (data.weather_events && Array.isArray(data.weather_events)) {
			// More events = higher risk
			const maxEvents = 20;
			return Math.min(data.weather_events.length / maxEvents, 1);
		}
		return 0.5;
	}

	/**
	 * Border Crossing Risk: Based on historical delays/incidents or provided risk
	 */
	function getBorderCrossingRisk(data) {
		if (typeof data.border_risk === 'number') {
			return data.border_risk; // expected 0-1
		}
		if (data.border_events && Array.isArray(data.border_events)) {
			// More events = higher risk
			const maxEvents = 10;
			return Math.min(data.border_events.length / maxEvents, 1);
		}
		return 0.5;
	}

	// Weighted sum of risk factors
	const weightedRisk =
		(factors.carrierReliability * (weights.carrierReliability || 0)) +
		(factors.routeComplexity * (weights.routeComplexity || 0)) +
		(factors.weatherPatterns * (weights.weatherPatterns || 0)) +
		(factors.borderCrossing * (weights.borderCrossing || 0));

	// VaR formula: Estimated Cost * (1 + weightedRisk)
	const estimatedCost = Number(routeData.cost) || 0;
	const valueAtRisk = estimatedCost * (1 + weightedRisk);

	return {
		valueAtRisk,
		weightedRisk,
		factors,
		weights,
		estimatedCost,
	};
}
