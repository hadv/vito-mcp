/**
 * Type definitions for Qdrant integration
 */

// Document structure in Qdrant
export interface QdrantDocument {
  id: string;
  text: string;
  source: string;
  metadata?: Record<string, any>;
}

// Search result from Qdrant
export interface QdrantSearchResult {
  id: string;
  score: number;
  payload?: {
    text: string;
    source: string;
    [key: string]: any;
  };
  vector?: number[];
}

// Collection info from Qdrant
export interface QdrantCollection {
  name: string;
  [key: string]: any;
}

// Collections response from Qdrant
export interface QdrantCollectionsResponse {
  collections: QdrantCollection[];
  time: number;
}

// Formatted result returned by the MCP server
export interface FormattedResult {
  text: string;
  metadata: {
    source: string;
    score: number;
    [key: string]: any;
  };
}

// Final response structure from the MCP server
export interface QdrantSearchResponse {
  results: FormattedResult[];
} 