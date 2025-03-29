import { generateEmbedding, cosineSimilarity } from '../src/utils/embedding';
import { VECTOR_SIZE } from '../src/configs/qdrant';

describe('Embedding Utilities', () => {
  describe('generateEmbedding', () => {
    it('should generate an embedding of the correct size', async () => {
      const text = 'This is a test text for embedding generation';
      const embedding = await generateEmbedding(text);
      
      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(VECTOR_SIZE);
      expect(Array.isArray(embedding)).toBe(true);
    });
    
    it('should handle empty strings', async () => {
      const embedding = await generateEmbedding('');
      
      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(VECTOR_SIZE);
    });
  });
  
  describe('cosineSimilarity', () => {
    it('should calculate similarity correctly', () => {
      const a = [1, 0, 0, 0];
      const b = [0, 1, 0, 0];
      const c = [1, 1, 0, 0];
      
      // Orthogonal vectors should have 0 similarity
      expect(cosineSimilarity(a, b)).toBe(0);
      
      // Same vector should have similarity 1
      expect(cosineSimilarity(a, a)).toBe(1);
      
      // Verify other cases
      expect(cosineSimilarity(a, c)).toBeCloseTo(0.7071, 4);
    });
    
    it('should throw error for vectors of different length', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3, 4];
      
      expect(() => cosineSimilarity(a, b)).toThrow('Vectors must be of the same length');
    });
    
    it('should handle zero vectors', () => {
      const a = [0, 0, 0];
      const b = [1, 2, 3];
      
      expect(cosineSimilarity(a, b)).toBe(0);
    });
  });
}); 