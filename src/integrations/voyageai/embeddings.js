// Using Voyage AI REST API directly due to npm package issues with ES modules
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "voyage-3";
const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";

/**
 * Generate an embedding for a given text using Voyage AI REST API.
 * @param {string} text - The text to embed.
 * @param {object} [options] - Optional parameters.
 * @returns {Promise<Array<number>>} The embedding vector.
 */
export async function generateEmbedding(text, options = {}) {
  if (!VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY environment variable is required");
  }

  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input: text,
        model: EMBEDDING_MODEL,
        input_type: "query", // Use "query" for search queries, "document" for documents to index
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Voyage AI returns embeddings in data[0].embedding
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error("Invalid response format from Voyage AI");
    }
    
    return data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding with Voyage AI:", error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch (more efficient).
 * @param {string[]} texts - Array of texts to embed.
 * @param {object} [options] - Optional parameters.
 * @returns {Promise<Array<Array<number>>>} Array of embedding vectors.
 */
export async function generateEmbeddings(texts, options = {}) {
  if (!VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY environment variable is required");
  }

  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        input: texts,
        model: EMBEDDING_MODEL,
        input_type: options.inputType || "document",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage AI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error("Invalid response format from Voyage AI");
    }
    
    return data.data.map(item => item.embedding);
  } catch (error) {
    console.error("Error generating embeddings with Voyage AI:", error);
    throw error;
  }
}
