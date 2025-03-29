/**
 * Type definitions for Chroma integration
 */

// Document structure in Chroma
export interface ChromaDocument {
  id: string;
  text: string;
  source: string;
  metadata?: Record<string, any>;
}

// Search result from Chroma
export interface ChromaSearchResult {
  id: string;
  score: number;
  document?: string;
  metadata?: {
    source: string;
    [key: string]: any;
  };
}

// Collection info from Chroma
export interface ChromaCollection {
  name: string;
  [key: string]: any;
}

// Collections response from Chroma
export interface ChromaCollectionsResponse {
  collections: ChromaCollection[];
}

// Formatted result returned by the MCP server (same as in qdrant)
export interface FormattedResult {
  text: string;
  metadata: {
    source: string;
    score: number;
    [key: string]: any;
  };
}

// Final response structure from the MCP server
export interface ChromaSearchResponse {
  results: FormattedResult[];
} 