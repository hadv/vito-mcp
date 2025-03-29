import { QdrantClient } from '@qdrant/js-client-rest';
import { ChromaClient, Collection, IncludeEnum, IEmbeddingFunction } from 'chromadb';
import { generateEmbedding } from '../utils/embedding';
import { VECTOR_SIZE, QDRANT_URL, QDRANT_API_KEY } from '../configs/qdrant';
import { CHROMA_URL } from '../configs/chroma';
import { COLLECTION_NAME, DatabaseType, DATABASE_TYPE } from '../configs/common';
import { FormattedResult } from '../types/qdrant';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple embedding function implementation for Chroma
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

// Database service class
export class DatabaseService {
  private qdrantClient?: QdrantClient;
  private chromaClient?: ChromaClient;
  private chromaCollection?: Collection;
  private dbType: DatabaseType;
  private collectionName: string;
  private embeddingFunction: IEmbeddingFunction;

  constructor() {
    // Use the database type from common config
    this.dbType = DATABASE_TYPE;
    this.collectionName = COLLECTION_NAME;
    this.embeddingFunction = new CustomEmbeddingFunction();
    
    console.log(`Using database type: ${this.dbType}`);
  }

  getDbType(): DatabaseType {
    return this.dbType;
  }

  async initialize(): Promise<void> {
    if (this.dbType === DatabaseType.QDRANT) {
      await this.initializeQdrant();
    } else {
      await this.initializeChroma();
    }
  }

  private async initializeQdrant(): Promise<void> {
    this.qdrantClient = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
    });

    try {
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!collectionExists) {
        console.log(`Creating Qdrant collection ${this.collectionName}...`);
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          }
        });
        console.log(`Qdrant collection ${this.collectionName} created.`);
      } else {
        console.log(`Qdrant collection ${this.collectionName} already exists.`);
      }
    } catch (error) {
      console.error('Error ensuring Qdrant collection exists:', error);
      throw error;
    }
  }

  private async initializeChroma(): Promise<void> {
    this.chromaClient = new ChromaClient({
      path: CHROMA_URL
    });

    try {
      const collections = await this.chromaClient.listCollections();
      const collectionExists = collections.some((collection: any) => collection.name === this.collectionName);
      
      if (!collectionExists) {
        console.log(`Creating Chroma collection ${this.collectionName}...`);
        this.chromaCollection = await this.chromaClient.createCollection({
          name: this.collectionName,
          metadata: { 'description': 'MCP Server collection' },
          embeddingFunction: this.embeddingFunction
        });
        console.log(`Chroma collection ${this.collectionName} created.`);
      } else {
        console.log(`Chroma collection ${this.collectionName} already exists.`);
        this.chromaCollection = await this.chromaClient.getCollection({
          name: this.collectionName,
          embeddingFunction: this.embeddingFunction
        });
      }
    } catch (error) {
      console.error('Error ensuring Chroma collection exists:', error);
      throw error;
    }
  }

  async search(query: string, limit: number = 3, scoreThreshold: number = 0.7): Promise<FormattedResult[]> {
    const queryEmbedding = await generateEmbedding(query);
    
    if (this.dbType === DatabaseType.QDRANT) {
      return this.searchQdrant(queryEmbedding, limit, scoreThreshold);
    } else {
      return this.searchChroma(queryEmbedding, limit);
    }
  }

  private async searchQdrant(queryEmbedding: number[], limit: number, scoreThreshold: number): Promise<FormattedResult[]> {
    if (!this.qdrantClient) {
      throw new Error('Qdrant client not initialized');
    }

    try {
      const searchResults = await this.qdrantClient.search(this.collectionName, {
        vector: queryEmbedding,
        limit: limit,
        score_threshold: scoreThreshold,
        with_payload: true,
      });
      
      return searchResults.map(result => ({
        text: String(result.payload?.text || ''),
        metadata: {
          source: String(result.payload?.source || ''),
          score: result.score,
          ...result.payload
        },
      }));
    } catch (error) {
      console.error(`Error searching Qdrant collection ${this.collectionName}:`, error);
      return [];
    }
  }

  private async searchChroma(queryEmbedding: number[], limit: number): Promise<FormattedResult[]> {
    if (!this.chromaCollection) {
      throw new Error('Chroma collection not initialized');
    }

    const searchResults = await this.chromaCollection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit,
      include: [IncludeEnum.Documents, IncludeEnum.Metadatas, IncludeEnum.Distances]
    });
    
    const formattedResults: FormattedResult[] = [];
    
    if (searchResults.documents && searchResults.documents.length > 0 && 
        searchResults.metadatas && searchResults.distances) {
      const docs = searchResults.documents[0] || [];
      const metas = searchResults.metadatas[0] || [];
      const distances = searchResults.distances[0] || [];
      
      for (let i = 0; i < docs.length; i++) {
        const similarityScore = 1 - (distances[i] || 0);
        const docText = docs[i] !== null && docs[i] !== undefined ? String(docs[i]) : '';
        const metaObj = metas[i] && typeof metas[i] === 'object' ? metas[i] as Record<string, any> : {};
        
        formattedResults.push({
          text: docText,
          metadata: {
            source: String(metaObj.source || ''),
            score: similarityScore,
            ...metaObj
          }
        });
      }
    }
    
    return formattedResults;
  }

  async storeDomainKnowledge(
    text: string,
    domain: string,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const pointId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const enhancedMetadata = {
      ...metadata,
      domain,
      timestamp,
      type: 'domain_knowledge',
      version: 1
    };

    if (this.dbType === DatabaseType.QDRANT) {
      await this.storeDocumentQdrant(text, enhancedMetadata);
    } else {
      await this.storeDocumentChroma(text, enhancedMetadata);
    }

    return pointId;
  }

  private async storeDocumentQdrant(text: string, metadata: Record<string, any>): Promise<void> {
    if (!this.qdrantClient) {
      throw new Error('Qdrant client not initialized');
    }

    const embedding = await generateEmbedding(text);
    const pointId = crypto.randomUUID();

    await this.qdrantClient.upsert(this.collectionName, {
      points: [{
        id: pointId,
        vector: embedding,
        payload: {
          text,
          embedding_type: 'fastembed',
          ...metadata
        }
      }]
    });
  }

  private async storeDocumentChroma(text: string, metadata: Record<string, any>): Promise<void> {
    if (!this.chromaCollection) {
      throw new Error('Chroma collection not initialized');
    }

    await this.chromaCollection.add({
      ids: [crypto.randomUUID()],
      documents: [text],
      metadatas: [metadata]
    });
  }
} 