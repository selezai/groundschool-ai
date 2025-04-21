import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../src/lib/supabaseClient';
import { generateQuestions } from '../src/services/deepSeekService';
import {
  queueOperation,
  processQueue,
  getOfflineStatus,
  setupOfflineMode,
  cacheDocument,
  getCachedDocuments,
  cacheQuiz,
  getCachedQuizzes,
  _updateOfflineStatus
} from '../src/services/offlineService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn(() => jest.fn()) // Return unsubscribe function
}));

jest.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ error: null })
    }
  }
}));

jest.mock('../src/services/deepSeekService', () => ({
  generateQuestions: jest.fn()
}));

describe('offlineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queueOperation', () => {
    beforeEach(() => {
      // Mock updateOfflineStatus to avoid NetInfo issues
      jest.spyOn(require('../src/services/offlineService'), 'updateOfflineStatus')
        .mockImplementation(() => Promise.resolve({
          isOffline: false,
          pendingOperations: 0
        }));
    });
    
    afterEach(() => {
      jest.restoreAllMocks();
    });
    
    it('adds operation to empty queue with metadata', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'offlineQueue') return null;
        if (key === 'offlineStatus') return null;
        return null;
      });
      
      const op = { type: 'testOp', payload: { foo: 'bar' }, priority: 8 };
      const opId = await queueOperation(op);
      
      // Verify operation ID is returned
      expect(opId).toBeDefined();
      expect(typeof opId).toBe('string');
      
      // Verify the operation was enhanced with metadata
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('offlineQueue', expect.any(String));
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0]).toMatchObject({
        type: 'testOp',
        payload: { foo: 'bar' },
        priority: 8,
        id: expect.any(String),
        timestamp: expect.any(Number),
        retryCount: 0,
        status: 'pending'
      });
    });

    it('appends to existing queue with proper sorting', async () => {
      const existing = [{ 
        id: 'existing-id', 
        type: 'op1', 
        payload: {}, 
        priority: 5,
        timestamp: Date.now() - 1000,
        retryCount: 0,
        status: 'pending'
      }];
      
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'offlineQueue') return JSON.stringify(existing);
        if (key === 'offlineStatus') return null;
        return null;
      });
      
      const op = { type: 'testOp', payload: { baz: 'qux' }, priority: 9 };
      await queueOperation(op);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('offlineQueue', expect.any(String));
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(2);
      expect(savedData[1]).toMatchObject({
        type: 'testOp',
        payload: { baz: 'qux' },
        priority: 9
      });
    });
    
    it('handles errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(queueOperation({ type: 'test' })).rejects.toThrow('Failed to queue operation');
    });
  });

  describe('processQueue', () => {
    beforeEach(() => {
      // Set up AsyncStorage mock implementation
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'offlineStatus') return null;
        return null;
      });
    });
    
    it('does nothing when offline and not forced', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      
      const result = await processQueue();
      
      expect(result).toEqual({ success: 0, failed: 0, remaining: 0 });
      expect(AsyncStorage.getItem).not.toHaveBeenCalledWith('offlineQueue');
    });

    it('processes queue when forced even if offline', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: false });
      const op = { 
        id: 'test-id',
        type: 'uploadDocument', 
        payload: { 
          userId: 'u1', 
          file: { 
            uri: 'file://test.pdf', 
            name: 'test.pdf', 
            size: 1024, 
            mimeType: 'application/pdf' 
          } 
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        priority: 5
      };
      
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'offlineQueue') return JSON.stringify([op]);
        return null;
      });
      
      // Mock fetch for file blob
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue('test-blob')
      });
      
      // Mock Supabase responses
      const uploadMock = jest.fn().mockResolvedValue({ error: null });
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      
      supabase.storage.from.mockReturnValue({ upload: uploadMock });
      supabase.from.mockImplementation((_table) => {
        return { insert: insertMock };
      });
      
      const result = await processQueue(true);
      
      expect(result).toEqual({ success: 1, failed: 0, remaining: 0 });
      expect(uploadMock).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offlineQueue');
    });

    it('does nothing when no queued data', async () => {
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'offlineQueue') return null;
        return null;
      });
      
      const result = await processQueue();
      
      expect(result).toEqual({ success: 0, failed: 0, remaining: 0 });
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    });

    it('processes createQuiz operation with enhanced data', async () => {
      const op = { 
        id: 'quiz-op-id',
        type: 'createQuiz', 
        payload: { 
          userId: 'u1', 
          documentIds: ['d1'], 
          questionCount: 5,
          title: 'My Custom Quiz'
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        priority: 7
      };
      
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'offlineQueue') return JSON.stringify([op]);
        return null;
      });
      
      const questions = [
        { text: 'Q1?', options: ['a', 'b'], correct_answer_index: 0, explanation: 'exp1', topic: 't1', image_url: null },
        { text: 'Q2?', options: ['c', 'd'], correct_answer_index: 1, explanation: 'exp2', topic: 't2', image_url: 'img.jpg' },
      ];
      
      generateQuestions.mockResolvedValue(questions);
      
      const quizInsert = jest.fn().mockResolvedValue({ data: [{ id: 'quiz123' }], error: null });
      const questionInsert = jest.fn().mockResolvedValue({ data: null, error: null });
      
      supabase.from.mockImplementation((table) => {
        if (table === 'quizzes') return { insert: quizInsert };
        if (table === 'questions') return { insert: questionInsert };
        return { insert: jest.fn() };
      });

      const result = await processQueue();

      expect(result).toEqual({ success: 1, failed: 0, remaining: 0 });
      expect(generateQuestions).toHaveBeenCalledWith(op.payload.documentIds, op.payload.questionCount);
      expect(quizInsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          user_id: op.payload.userId,
          title: 'My Custom Quiz',
          document_ids: op.payload.documentIds,
          question_count: op.payload.questionCount,
          difficulty: 'auto',
          created_at: expect.any(String)
        })],
        { returning: 'representation' }
      );
      expect(questionInsert).toHaveBeenCalledTimes(questions.length);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offlineQueue');
    });
    
    it('handles operation failures and retries', async () => {
      const op = { 
        id: 'failing-op',
        type: 'saveQuizResult', 
        payload: { 
          userId: 'u1', 
          quizId: 'q1',
          score: 80,
          answers: [0, 1, 0]
        },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        priority: 6
      };
      
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'offlineQueue') return JSON.stringify([op]);
        return null;
      });
      
      // Mock Supabase to fail
      const insertMock = jest.fn().mockResolvedValue({ error: { message: 'Server error' } });
      supabase.from.mockImplementation(() => ({ insert: insertMock }));
      
      const result = await processQueue();
      
      // Should keep the operation in the queue for retry
      expect(result).toEqual({ success: 0, failed: 0, remaining: 1 });
      
      // Verify the operation was updated with retry info
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('offlineQueue', expect.any(String));
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0]).toMatchObject({
        id: 'failing-op',
        retryCount: 1,
        status: 'failed',
        lastError: 'Server error'
      });
    });
    
    it('handles max retries and removes failed operations', async () => {
      const op = { 
        id: 'max-retries-op',
        type: 'uploadDocument', 
        payload: { userId: 'u1', file: { uri: 'file://test.pdf' } },
        timestamp: Date.now(),
        retryCount: 3, // Already at max retries
        status: 'failed',
        lastError: 'Previous error',
        priority: 5
      };
      
      NetInfo.fetch.mockResolvedValue({ isConnected: true });
      
      AsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'offlineQueue') return JSON.stringify([op]);
        return null;
      });
      
      const result = await processQueue();
      
      // Operation should be removed from queue
      expect(result).toEqual({ success: 0, failed: 1, remaining: 0 });
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offlineQueue');
    });
  });

  describe('getOfflineStatus', () => {
    it('returns default status when no stored status', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const status = await getOfflineStatus();
      
      expect(status).toEqual(expect.objectContaining({
        isOffline: false,
        pendingOperations: 0,
        syncErrors: [],
      }));
    });
    
    it('returns stored status when available', async () => {
      const storedStatus = {
        isOffline: true,
        lastOnlineTime: 123456789,
        pendingOperations: 3,
        lastSyncAttempt: 123456789,
        syncErrors: [{ id: 'err1', message: 'test error' }],
      };
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedStatus));
      
      const status = await getOfflineStatus();
      
      expect(status).toEqual(storedStatus);
    });
  });
  
  describe('setupOfflineMode', () => {
    it('returns unsubscribe function', () => {
      const unsubscribeMock = jest.fn();
      NetInfo.addEventListener.mockReturnValue(unsubscribeMock);
      
      const unsubscribe = setupOfflineMode();
      
      expect(NetInfo.addEventListener).toHaveBeenCalled();
      expect(unsubscribe).toBe(unsubscribeMock);
    });
  });
  
  describe('cacheDocument and getCachedDocuments', () => {
    it('caches a new document', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const document = { id: 'doc1', name: 'Test Document', content: 'test content' };
      await cacheDocument(document);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('cachedDocuments', expect.any(String));
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0]).toMatchObject({
        id: 'doc1',
        name: 'Test Document',
        content: 'test content',
        cachedAt: expect.any(Number)
      });
    });
    
    it('updates an existing cached document', async () => {
      const existingDocs = [{
        id: 'doc1',
        name: 'Old Name',
        content: 'old content',
        cachedAt: Date.now() - 1000
      }];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingDocs));
      
      const updatedDoc = { id: 'doc1', name: 'Updated Name', content: 'new content' };
      await cacheDocument(updatedDoc);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('cachedDocuments', expect.any(String));
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0]).toMatchObject({
        id: 'doc1',
        name: 'Updated Name',
        content: 'new content',
        cachedAt: expect.any(Number)
      });
    });
    
    it('retrieves cached documents', async () => {
      const documents = [{ id: 'doc1' }, { id: 'doc2' }];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(documents));
      
      const result = await getCachedDocuments();
      
      expect(result).toEqual(documents);
    });
    
    it('returns empty array when no cached documents', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await getCachedDocuments();
      
      expect(result).toEqual([]);
    });
  });
  
  describe('cacheQuiz and getCachedQuizzes', () => {
    it('caches a new quiz with questions', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const quiz = { id: 'quiz1', title: 'Test Quiz' };
      const questions = [{ id: 'q1', text: 'Question 1?' }];
      
      await cacheQuiz(quiz, questions);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('cachedQuizzes', expect.any(String));
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0]).toMatchObject({
        id: 'quiz1',
        title: 'Test Quiz',
        questions: [{ id: 'q1', text: 'Question 1?' }],
        cachedAt: expect.any(Number)
      });
    });
    
    it('updates an existing cached quiz', async () => {
      const existingQuizzes = [{
        id: 'quiz1',
        title: 'Old Quiz',
        questions: [{ id: 'oldQ', text: 'Old question?' }],
        cachedAt: Date.now() - 1000
      }];
      
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingQuizzes));
      
      const updatedQuiz = { id: 'quiz1', title: 'Updated Quiz' };
      const newQuestions = [{ id: 'newQ', text: 'New question?' }];
      
      await cacheQuiz(updatedQuiz, newQuestions);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('cachedQuizzes', expect.any(String));
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData).toHaveLength(1);
      expect(savedData[0]).toMatchObject({
        id: 'quiz1',
        title: 'Updated Quiz',
        questions: [{ id: 'newQ', text: 'New question?' }],
        cachedAt: expect.any(Number)
      });
    });
    
    it('retrieves cached quizzes', async () => {
      const quizzes = [{ id: 'quiz1' }, { id: 'quiz2' }];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(quizzes));
      
      const result = await getCachedQuizzes();
      
      expect(result).toEqual(quizzes);
    });
    
    it('returns empty array when no cached quizzes', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      
      const result = await getCachedQuizzes();
      
      expect(result).toEqual([]);
    });
  });
});
