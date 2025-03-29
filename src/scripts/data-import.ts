/**
 * Data Import Script for Vector Database MCP Server
 * 
 * This script provides utilities for importing documents into the selected vector database.
 * Usage: ts-node data-import.ts --file=your-data.json
 */

import { generateEmbedding } from '../utils/embedding';
import { VECTOR_SIZE, QDRANT_URL, QDRANT_API_KEY } from '../configs/qdrant';
import { CHROMA_URL } from '../configs/chroma';
import { COLLECTION_NAME, DatabaseType, DATABASE_TYPE } from '../configs/common';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ChromaClient, IEmbeddingFunction } from 'chromadb';

// Load environment variables
dotenv.config();

// Custom embedding function for Chroma
class CustomEmbeddingFunction implements IEmbeddingFunction {
  async generate(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }
}

// Use the database type from common config
const dbType = DATABASE_TYPE;

// Database clients
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

const chromaClient = new ChromaClient({
  path: CHROMA_URL
});

// Create embedding function instance
const embeddingFunction = new CustomEmbeddingFunction();

/**
 * Import documents from a JSON file into vector database
 * 
 * @param filePath Path to the JSON file with documents
 */
async function importFromFile(filePath: string) {
  try {
    console.log(`Importing documents to ${dbType} from ${filePath}...`);
    
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const documents = JSON.parse(fileContent);
    
    // Process based on database type
    if (dbType === DatabaseType.QDRANT) {
      await importToQdrant(documents);
    } else {
      await importToChroma(documents);
    }
    
    console.log(`Import completed! ${documents.length} documents processed.`);
  } catch (error) {
    console.error('Error importing documents:', error);
    process.exit(1);
  }
}

/**
 * Import documents to Qdrant
 */
async function importToQdrant(documents: any[]) {
  try {
    // Ensure collection exists
    await ensureQdrantCollection();
    
    // Process documents in batches
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing ${documents.length} documents in ${batches.length} batches for Qdrant...`);
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} documents)...`);
      
      // Process documents in parallel
      const promises = batch.map(async (doc) => {
        const embedding = await generateEmbedding(doc.text);
        return {
          id: doc.id,
          vector: embedding,
          payload: {
            text: doc.text,
            source: doc.source,
            embedding_type: 'fastembed',
            ...(doc.metadata || {}),
          },
        };
      });
      
      const points = await Promise.all(promises);
      
      // Insert batch into Qdrant
      await qdrantClient.upsert(COLLECTION_NAME, {
        points,
      });
      
      console.log(`Batch ${i + 1} processed successfully.`);
    }
  } catch (error) {
    console.error('Error importing to Qdrant:', error);
    throw error;
  }
}

/**
 * Import documents to Chroma
 */
async function importToChroma(documents: any[]) {
  try {
    // Ensure collection exists
    const collection = await ensureChromaCollection();
    
    // Process documents in batches
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      batches.push(documents.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`Processing ${documents.length} documents in ${batches.length} batches for Chroma...`);
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} documents)...`);
      
      // Prepare data for Chroma
      const ids: string[] = [];
      const texts: string[] = [];
      const metadatas: any[] = [];
      
      // Process documents
      batch.forEach((doc, _index) => {
        ids.push(doc.id);
        texts.push(doc.text);
        metadatas.push({
          source: doc.source,
          ...(doc.metadata || {}),
        });
      });
      
      // Insert batch into Chroma
      await collection.add({
        ids,
        documents: texts,
        metadatas
      });
      
      console.log(`Batch ${i + 1} processed successfully.`);
    }
  } catch (error) {
    console.error('Error importing to Chroma:', error);
    throw error;
  }
}

/**
 * Ensure Qdrant collection exists
 */
async function ensureQdrantCollection() {
  try {
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(c => c.name === COLLECTION_NAME);
    
    if (!collectionExists) {
      console.log(`Creating Qdrant collection ${COLLECTION_NAME}...`);
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        }
      });
      console.log(`Qdrant collection ${COLLECTION_NAME} created.`);
    } else {
      console.log(`Qdrant collection ${COLLECTION_NAME} already exists.`);
    }
    
    return qdrantClient;
  } catch (error) {
    console.error('Error ensuring Qdrant collection exists:', error);
    throw error;
  }
}

/**
 * Ensure Chroma collection exists
 */
async function ensureChromaCollection() {
  try {
    const collections = await chromaClient.listCollections();
    const collectionExists = collections.some((collection: any) => collection.name === COLLECTION_NAME);
    
    if (!collectionExists) {
      console.log(`Creating Chroma collection ${COLLECTION_NAME}...`);
      const collection = await chromaClient.createCollection({
        name: COLLECTION_NAME,
        metadata: { 'description': 'MCP Server collection' },
        embeddingFunction: embeddingFunction
      });
      console.log(`Chroma collection ${COLLECTION_NAME} created.`);
      return collection;
    } else {
      console.log(`Chroma collection ${COLLECTION_NAME} already exists.`);
      const collection = await chromaClient.getCollection({
        name: COLLECTION_NAME,
        embeddingFunction: embeddingFunction
      });
      return collection;
    }
  } catch (error) {
    console.error('Error ensuring Chroma collection exists:', error);
    throw error;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      args[key] = value;
    }
  });
  return args;
}

// Execute script if run directly
if (require.main === module) {
  const args = parseArgs();
  
  if (!args.file) {
    console.error('Please provide a file path with --file=your-data.json');
    process.exit(1);
  }
  
  const filePath = path.resolve(args.file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  importFromFile(filePath).catch(error => {
    console.error('Import failed:', error);
    process.exit(1);
  });
} 