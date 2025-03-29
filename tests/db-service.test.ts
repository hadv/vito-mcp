import { DatabaseService } from '../src/core/db-service';
import * as embeddingUtils from '../src/utils/embedding';
import { VECTOR_SIZE } from '../src/configs/qdrant';

// Mock the embedding-utils module
jest.mock('../src/utils/embedding', () => ({
  generateEmbedding: jest.fn(),
}));

// Mock config module
jest.mock('../src/configs/qdrant', () => ({
  VECTOR_SIZE: 384,
  QDRANT_URL: 'http://mock-qdrant:6333',
  QDRANT_API_KEY: 'mock-api-key'
}));

// Mock QdrantClient
jest.mock('@qdrant/js-client-rest', () => {
  return {
    QdrantClient: jest.fn().mockImplementation(() => ({
      getCollections: jest.fn().mockResolvedValue({ collections: [] }),
      createCollection: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockResolvedValue([
        {
          payload: { text: 'Test document 1', source: 'test-source-1' },
          score: 0.95
        },
        {
          payload: { text: 'Test document 2', source: 'test-source-2' },
          score: 0.85
        }
      ])
    }))
  };
});

// Mock ChromaClient
jest.mock('chromadb', () => {
  const mockCollection = {
    query: jest.fn().mockResolvedValue({
      documents: [['Test document 1', 'Test document 2']],
      metadatas: [[{ source: 'test-source-1' }, { source: 'test-source-2' }]],
      distances: [[0.1, 0.2]]
    })
  };
  
  return {
    ChromaClient: jest.fn().mockImplementation(() => ({
      listCollections: jest.fn().mockResolvedValue([]),
      createCollection: jest.fn().mockResolvedValue(mockCollection),
      getCollection: jest.fn().mockResolvedValue(mockCollection)
    })),
    IncludeEnum: {
      Documents: 'documents',
      Metadatas: 'metadatas',
      Distances: 'distances'
    }
  };
});

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  // Mock generateEmbedding to return a vector of the correct size
  (embeddingUtils.generateEmbedding as jest.Mock).mockResolvedValue(
    Array(VECTOR_SIZE).fill(0.1)
  );
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

describe('DatabaseService', () => {
  describe('initialization', () => {
    it('should initialize with Qdrant by default', async () => {
      process.env.DATABASE_TYPE = 'qdrant';
      
      const dbService = new DatabaseService();
      await dbService.initialize();
      
      // We can't check private properties directly, so we'll test via search function
      await expect(dbService.search('test query')).resolves.toHaveLength(2);
    });
    
    it('should initialize with Chroma when specified', async () => {
      process.env.DATABASE_TYPE = 'chroma';
      
      const dbService = new DatabaseService();
      await dbService.initialize();
      
      // We can't check private properties directly, so we'll test via search function
      await expect(dbService.search('test query')).resolves.toHaveLength(2);
    });
  });
  
  describe('search', () => {
    it('should return formatted results for Qdrant search', async () => {
      process.env.DATABASE_TYPE = 'qdrant';
      
      const dbService = new DatabaseService();
      await dbService.initialize();
      
      const results = await dbService.search('test query');
      
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('text', 'Test document 1');
      expect(results[0].metadata).toHaveProperty('source', 'test-source-1');
      expect(results[0].metadata).toHaveProperty('score', 0.95);
    });
    
    it('should return formatted results for Chroma search', async () => {
      process.env.DATABASE_TYPE = 'chroma';
      
      const dbService = new DatabaseService();
      await dbService.initialize();
      
      const results = await dbService.search('test query');
      
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('text', 'Test document 1');
      expect(results[0].metadata).toHaveProperty('source', 'test-source-1');
      // For Chroma, score is 1 - distance
      expect(results[0].metadata).toHaveProperty('score', 0.95);
    });
  });
}); 