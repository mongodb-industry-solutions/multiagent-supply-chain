export const TALK_TRACK = [
  {
    heading: "Instructions and Talk Track",
    content: [
      {
        heading: "Solution Overview",
        body: "This demo showcases how agentic AI and MongoDB automate supply chain disruption management. Three specialized agents work together to detect shipment delays, analyze incidents, find alternative routes, and assess risks—streamlining logistics and decision-making for resilient supply chains.",
      },
      {
        image: {
          src: "/img/benefits.png",
          alt: "Benefits",
        },
      },
      {
        heading: "How to Demo",
        body: [
          "Start in the 'Disruption Analysis' tab. Click 'Start Simulation' to generate delayed shipments.",
          "Select a delayed shipment and click 'Analyze Selected Shipment' to trigger the Disruption Analysis Agent. The agent will display an incident report card.",
          "After reviewing the incident report card, click 'Find Alternative Routes' to move to the Supply Chain Planning Agent.",
          "In the planning tab, click 'Find Alternative Routes' to let the agent suggest alternative carriers. Choose the best alternative for your needs.",
          "Click the 'Analyze Risk' button to proceed to the Risk Analysis Agent.",
          "In the risk analysis tab, adjust the weight for each risk factor as desired, then click 'Run Risk Analysis'. The agent will calculate the value at risk and display it, along with a button to apply the suggested weights to the risk factors.",
        ],
      },
    ],
  },
  {
    heading: "Behind the Scenes",
    content: [
      {
        heading: "Architecture Overview",
        body: "The demo uses three specialized agents: Disruption Analysis, Supply Chain Planning, and Risk Analysis. Each agent leverages MongoDB Atlas for real-time data, memory, and fast search. LangGraph orchestrates agent collaboration and multi-step reasoning, while Amazon Bedrock provides LLMs for analysis and decision support. The architecture diagram below illustrates how agents, data, and AI services connect to automate resilient supply chain operations.",
      },
      {
        image: {
          src: "/img/architecture_diagram.png",
          alt: "Architecture Overview",
        },
      },
      {
        heading: "Key Details",
        body: [
          "Sample data in the data/ directory includes shipments, incidents, risk patterns, carriers, warehouses, weather events, and QA reports—providing realistic scenarios for agentic workflows.",
          "Embeddings are generated for QA reports, enabling agents to perform semantic vector search and retrieve the most relevant information for incident analysis and decision-making.",
          "Disruption Analysis Agent detects delayed shipments and generates incident reports using real-time and historical data.",
          "Supply Chain Planning Agent finds alternative routes and carriers, optimizing logistics based on current constraints and available options.",
          "Risk Analysis Agent evaluates risk factors, lets users adjust weights, and calculates value at risk to support informed decision-making.",
          "MongoDB Atlas powers agent memory, fast search, and unified access to structured and unstructured supply chain data.",
          "LangGraph enables agent orchestration and multi-step reasoning across the workflow.",
          "Amazon Bedrock provides LLMs for agent reasoning, analysis, and output generation.",
        ],
      },
    ],
  },
  {
    heading: "Why MongoDB?",
    content: [
      {
        heading: "AI-powered applications are built on MongoDB",
        body: " ",
      },
      {
        image: {
          src: "/img/why-mongodb.svg",
          alt: "Why MongoDB",
        },
      },
      {
        heading: "A modern data foundation for agentic AI",
        body: "MongoDB Atlas provides several features for building AI agents. As both a vector and document database, Atlas supports various search methods for agentic RAG, as well as storing agent interactions in the same database for short and long-term agent memory.",
      },
      {
        heading: "Trusted by industry leaders",
        body: "Over 70% of Fortune 500 companies and nine of the 10 largest manufacturers trust MongoDB for mission-critical applications. MongoDB powers end-to-end value chain optimization with AI/ML, advanced analytics, and real-time data processing for innovative manufacturing applications.",
      },
      {
        heading: "Increase production efficiency, reduce costs",
        body: "Devices and equipment across the shop floor and beyond constantly generate valuable data. With MongoDB’s modern database, you can extract value from that data to ensure more efficient operations and reduced downtime.",
      },
      {
        image: {
          src: "/img/ai-illustration-spot.png",
          alt: "AI Illustration",
        },
      },
    ],
  },
];
