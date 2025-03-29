/**
 * Document Uploader for Qdrant
 * 
 * This script helps you upload text and PDF documents to Qdrant with embeddings.
 * 
 * Usage:
 * Run: ts-node document-uploader.ts <directory_with_files>
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import { generateEmbedding } from '../utils/embedding';
import { VECTOR_SIZE, QDRANT_URL, QDRANT_API_KEY } from '../configs/qdrant';
import { COLLECTION_NAME } from '../configs/common';

// Load environment variables
dotenv.config();

// Qdrant client setup
const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

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
        embedding_type: 'fastembed',
        ...metadata,
      },
    };
    
    // Upload to Qdrant
    console.log(`Uploading document to Qdrant: ${source}`);
    await qdrantClient.upsert(COLLECTION_NAME, {
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