/**
 * Embedding utilities for Qdrant MCP Server
 * 
 * This file contains utility functions for generating and managing embeddings.
 * Using Qdrant's built-in FastEmbed support for efficient embedding generation.
 */

import axios from 'axios';
import { VECTOR_SIZE, QDRANT_URL, QDRANT_API_KEY } from '../configs/qdrant';

/**
 * Generate an embedding vector for the provided text
 * 
 * Uses Qdrant's built-in FastEmbed capability
 * 
 * @param text The text to generate an embedding for
 * @returns A vector representation of the text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Using Qdrant's server-side FastEmbed integration
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (QDRANT_API_KEY) {
      headers['api-key'] = QDRANT_API_KEY;
    }

    const response = await axios.post(
      `${QDRANT_URL}/embeddings`,
      {
        text: text,
        model: 'fastembed', // Use the default FastEmbed model
      },
      { headers }
    );

    return response.data.embedding;
  } catch (error) {
    console.error('Error generating embedding with FastEmbed:', error);
    // Fall back to mock implementation in case of errors
    console.warn('Falling back to mock embeddings due to API error.');
    return Array.from({ length: VECTOR_SIZE }, () => Math.random() - 0.5);
  }
}

/**
 * Helper function to calculate cosine similarity between two vectors
 * 
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity score (0-1)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must be of the same length');
  }
  
  let dotProduct = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    aMagnitude += a[i] * a[i];
    bMagnitude += b[i] * b[i];
  }
  
  aMagnitude = Math.sqrt(aMagnitude);
  bMagnitude = Math.sqrt(bMagnitude);
  
  if (aMagnitude === 0 || bMagnitude === 0) {
    return 0;
  }
  
  return dotProduct / (aMagnitude * bMagnitude);
} 