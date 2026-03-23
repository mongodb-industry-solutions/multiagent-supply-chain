# Agentic Supply-Chain Management 

The demo walks the users through a typical situation: handling a delayed shipment. The first agent helps the user do a root cause analysis of the delayed shipment, by looking at historical shipments, and QA documents from past shipments. Using a mixture of vector search and historical queries, the agent gives the user a detailed explanation of the situation, as well as alternative shippers.

From there, the user can select a shipment, and look for alternative routes with the help of the transportation planning agent. The transportation planning agent uses MongoDB’s geospatial queries, to find other carriers that can take over the delayed shipment, and it showcases how MongoDB can handle both geographical, and structured data in the same collection.

Lastly, the user is able to do some risk analysis on the route. By looking at both structured and unstructured data about weather, compliance, border disruptances, etc, the agent is able to give the user more context on the potential risks associated with that route, to add an extra layer of intelligence when rescheduling the delayed shipment.


## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- AWS Account with Bedrock access
- AWS CLI installed locally

### Setup

1. **Configure AWS credentials for Bedrock access:**
   Run one of the following commands to set up your AWS credentials locally:

   ```bash
   aws configure
   ```

   Or with SSO (recommended):

   ```bash
   aws configure sso
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Copy the example environment file and update it with your credentials:

   ```bash
   cp .env.example .env
   ```

   Then edit your `.env` file and set the following variables:

   ```env
   MONGODB_URI="<your-mongodb-uri>"
   DATABASE_NAME="agentic_predictive_maintenance"
   AWS_REGION="us-east-1"
   AWS_PROFILE="default"
   COMPLETION_MODEL="us.anthropic.claude-haiku-4-5-20251001-v1:0"
   EMBEDDING_MODEL="cohere.embed-english-v3"
   ```

4. **Seed the demo database:**
   To initialize the demo with all required collections, embeddings, and indexes, run:

   ```bash
   npm run seed
   ```

   This step ensures your database is ready for the demo application.

5. **Start the application:**
   You can now launch the app in development mode:

   ```bash
   npm run dev
   ```

   Or with Docker:

   ```bash
   docker-compose up
   ```

Open [http://localhost:8080](http://localhost:8080) in your browser to explore the demo.

