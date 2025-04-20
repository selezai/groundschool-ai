import { generateQuestions } from '../src/services/deepSeekService';
import * as documentProcessingService from '../src/services/documentProcessingService';
import { supabase } from '../src/lib/supabaseClient';

jest.mock('../src/services/documentProcessingService');
jest.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    storage: { from: jest.fn().mockReturnThis(), getPublicUrl: jest.fn() }
  }
}));

global.fetch = jest.fn();

describe('generateQuestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DEEPSEEK_URL = 'https://api.deepseek';
    process.env.DEEPSEEK_API_KEY = 'key';
  });

  it('throws if document fetch fails', async () => {
    supabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({ data: null, error: new Error('db error') })
      })
    });
    await expect(generateQuestions(['id'], 2, 0)).rejects.toThrow('Database error: db error');
  });

  it('calls DeepSeek API and returns questions', async () => {
    const fileData = { file_path: 'doc.pdf' };
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({ data: [fileData], error: null })
      })
    });
    supabase.storage.from().getPublicUrl.mockReturnValue({ publicURL: 'http://example.com/doc.pdf' });
    documentProcessingService.processDocuments.mockResolvedValue(['chunk1']);
    const questions = ['q1'];
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ questions }) });

    const result = await generateQuestions(['id'], 1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.deepseek/api/v1/generate',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer test-key` }),
        body: JSON.stringify({ contentChunks: ['chunk1'], questionCount: 1 })
      })
    );
    expect(result).toEqual(questions);
  });
  
  it('retries API calls on failure', async () => {
    // Mock setTimeout to execute immediately
    jest.spyOn(global, 'setTimeout').mockImplementation(fn => fn());
    
    // Setup successful document fetch
    const fileData = { file_path: 'doc.pdf' };
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({ data: [fileData], error: null })
      })
    });
    supabase.storage.from().getPublicUrl.mockReturnValue({ publicURL: 'http://example.com/doc.pdf' });
    documentProcessingService.processDocuments.mockResolvedValue(['chunk1']);
    
    // First call fails, second succeeds
    global.fetch.mockResolvedValueOnce({ 
      ok: false, 
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }) 
    }).mockResolvedValueOnce({ 
      ok: true, 
      json: () => Promise.resolve({ questions: ['q1'] }) 
    });
    
    // Execute the function with retries
    const result = await generateQuestions(['id'], 1, 1);
    
    // Verify fetch was called twice (initial + 1 retry)
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(['q1']);
    
    // Restore setTimeout
    global.setTimeout.mockRestore();
  });
  
  it('throws after maximum retries', async () => {
    // Mock setTimeout to execute immediately
    jest.spyOn(global, 'setTimeout').mockImplementation(fn => fn());
    
    // Setup successful document fetch
    const fileData = { file_path: 'doc.pdf' };
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({ data: [fileData], error: null })
      })
    });
    supabase.storage.from().getPublicUrl.mockReturnValue({ publicURL: 'http://example.com/doc.pdf' });
    documentProcessingService.processDocuments.mockResolvedValue(['chunk1']);
    
    // All API calls fail
    global.fetch.mockImplementation(() => Promise.resolve({ 
      ok: false, 
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }) 
    }));
    
    // Verify it throws after all retries
    await expect(generateQuestions(['id'], 1, 1)).rejects.toThrow('Failed after 1 attempts');
    
    // Verify fetch was called twice (initial + 1 retry)
    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    // Restore setTimeout
    global.setTimeout.mockRestore();
  });
  
  it('throws if no documents are found', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({ data: [], error: null })
      })
    });
    
    await expect(generateQuestions(['id'], 2, 0)).rejects.toThrow('No documents found');
  });
  
  it('throws if no text is extracted from documents', async () => {
    const fileData = { file_path: 'doc.pdf' };
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({ data: [fileData], error: null })
      })
    });
    supabase.storage.from().getPublicUrl.mockReturnValue({ publicURL: 'http://example.com/doc.pdf' });
    documentProcessingService.processDocuments.mockResolvedValue([]);
    
    await expect(generateQuestions(['id'], 2, 0)).rejects.toThrow('No text content extracted');
  });
  
  it('throws if API returns no questions', async () => {
    const fileData = { file_path: 'doc.pdf' };
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({ data: [fileData], error: null })
      })
    });
    supabase.storage.from().getPublicUrl.mockReturnValue({ publicURL: 'http://example.com/doc.pdf' });
    documentProcessingService.processDocuments.mockResolvedValue(['chunk1']);
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ questions: [] }) });
    
    await expect(generateQuestions(['id'], 2, 0)).rejects.toThrow('DeepSeek API returned no questions');
  });
});
