/**
 * Common Configuration
 * 
 * Shared configuration settings used across different database types.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database type enum
export enum DatabaseType {
  QDRANT = 'qdrant',
  CHROMA = 'chroma'
}

// Collection name for storing documents - shared between Qdrant and Chroma
export const COLLECTION_NAME = process.env.COLLECTION_NAME || 'vito';

// Determine which database type to use based on environment variable
export const DATABASE_TYPE = (process.env.DATABASE_TYPE?.toLowerCase() === 'chroma')
  ? DatabaseType.CHROMA
  : DatabaseType.QDRANT; 