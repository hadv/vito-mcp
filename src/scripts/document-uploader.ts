/**
 * Document Uploader for Qdrant
 * 
 * This script helps you upload text and PDF documents to Qdrant with embeddings.
 * 
 * Usage:
 * 1. Configure your Gemini API key in .env
 * 2. Run: ts-node document-uploader.ts <directory_with_files>
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse';

// Load environment variables
dotenv.config();

// Collection name to upload to - append _gemini to differentiate from OpenAI collection
const collectionName = (process.env.COLLECTION_NAME || 'documents') + '_gemini';

// Qdrant client setup
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

// Gemini API key - required for generating embeddings
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Vector size for the embedding model
const VECTOR_SIZE = 768; // Gemini's embedding-001 model

// Check if Gemini API key is available
if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY not found in environment variables.');
  console.error('Please add GEMINI_API_KEY=your_key to your .env file.');
  process.exit(1);
}

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Generate an embedding vector using Gemini API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Trim text if it's too long
    // Gemini has a limit of 3072 tokens for embeddings
    const trimmedText = text.slice(0, 25000); // Approximate length to stay under token limit
    
    // Get the embedding model
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    
    // Generate embeddings
    const result = await embeddingModel.embedContent(trimmedText);
    const embedding = result.embedding.values;
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Ensure Qdrant collection exists
 */
async function ensureQdrantCollection() {
  try {
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(c => c.name === collectionName);
    
    if (!collectionExists) {
      console.log(`Creating Qdrant collection ${collectionName}...`);
      await qdrantClient.createCollection(collectionName, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        }
      });
      console.log(`Qdrant collection ${collectionName} created.`);
    } else {
      console.log(`Qdrant collection ${collectionName} already exists.`);
    }
  } catch (error) {
    console.error('Error ensuring Qdrant collection exists:', error);
    throw error;
  }
}

/**
 * Upload a single text document to Qdrant
 */
async function uploadDocument(
  text: string, 
  source: string, 
  metadata: Record<string, any> = {}
) {
  try {
    // Generate embedding
    console.log(`Generating embedding for document: ${source}`);
    const embedding = await generateEmbedding(text);
    
    // Create point for Qdrant
    const point = {
      id: uuidv4(),
      vector: embedding,
      payload: {
        text,
        source,
        ...metadata,
      },
    };
    
    // Upload to Qdrant
    console.log(`Uploading document to Qdrant: ${source}`);
    await qdrantClient.upsert(collectionName, {
      points: [point],
    });
    
    console.log(`Successfully uploaded document: ${source}`);
    return point.id;
  } catch (error) {
    console.error(`Error uploading document ${source}:`, error);
    throw error;
  }
}

/**
 * Process a text file and upload to Qdrant
 */
async function processTextFile(filePath: string) {
  try {
    console.log(`Processing text file: ${filePath}`);
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Upload to Qdrant
    const filename = path.basename(filePath);
    await uploadDocument(content, filename, {
      type: 'text',
      filename: filename,
      path: filePath,
    });
    
    console.log(`Completed processing: ${filePath}`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

/**
 * Process a PDF file and upload to Qdrant
 */
async function processPdfFile(filePath: string) {
  try {
    console.log(`Processing PDF file: ${filePath}`);
    
    // Read PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse PDF to extract text
    const pdfData = await pdfParse(dataBuffer);
    
    // Upload to Qdrant
    const filename = path.basename(filePath);
    await uploadDocument(pdfData.text, filename, {
      type: 'pdf',
      filename: filename,
      path: filePath,
      pageCount: pdfData.numpages,
    });
    
    console.log(`Completed processing PDF: ${filePath}`);
  } catch (error) {
    console.error(`Error processing PDF file ${filePath}:`, error);
  }
}

/**
 * Process a directory of files
 */
async function processDirectory(directoryPath: string) {
  try {
    console.log(`Processing directory: ${directoryPath}`);
    
    // Check if directory exists
    if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
      console.error(`Error: ${directoryPath} is not a valid directory.`);
      return;
    }
    
    // Get all files
    const files = fs.readdirSync(directoryPath)
      .map(file => path.join(directoryPath, file));
    
    const textFiles = files.filter(file => file.endsWith('.txt'));
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    console.log(`Found ${textFiles.length} text files and ${pdfFiles.length} PDF files.`);
    
    // Process each text file
    for (const file of textFiles) {
      await processTextFile(file);
    }
    
    // Process each PDF file
    for (const file of pdfFiles) {
      await processPdfFile(file);
    }
    
    console.log(`Completed processing directory: ${directoryPath}`);
  } catch (error) {
    console.error(`Error processing directory ${directoryPath}:`, error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Get directory argument
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Error: Please provide a directory path containing files.');
      console.error('Usage: ts-node document-uploader.ts <directory_path>');
      process.exit(1);
    }
    
    const directoryPath = args[0];
    
    // Ensure collection exists
    await ensureQdrantCollection();
    
    // Process directory
    await processDirectory(directoryPath);
    
    console.log('Document upload completed successfully!');
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the script
main(); 