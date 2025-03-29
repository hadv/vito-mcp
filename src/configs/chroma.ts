/**
 * Chroma Configuration
 * 
 * This file contains configuration constants for Chroma vector database.
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Chroma configuration
export const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000'; 