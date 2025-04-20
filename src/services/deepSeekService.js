import { supabase } from '../lib/supabaseClient';
import { processDocuments } from './documentProcessingService';

// Use environment variables with fallbacks for testing
const DEEPSEEK_URL = process.env.DEEPSEEK_URL || 'https://api.deepseek';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'test-key';

/**
 * Generates quiz questions based on document content using DeepSeek AI
 * @param {Array<string>} documentIds - Array of document IDs to process
 * @param {number} questionCount - Number of questions to generate
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<Array>} Array of generated questions
 */
export async function generateQuestions(documentIds, questionCount, maxRetries = 3) {
  let retries = 0;
  let lastError = null;
  
  while (retries <= maxRetries) {
    try {
      // Fetch file paths for all documents
      const { data, error } = await supabase
        .from('documents')
        .select('file_path')
        .in('id', documentIds);
        
      if (error) throw new Error(`Database error: ${error.message}`);
      if (!data || data.length === 0) throw new Error('No documents found with the provided IDs');
      
      const paths = data.map((doc) => {
        const { publicURL } = supabase.storage
          .from('documents')
          .getPublicUrl(doc.file_path);
        return publicURL;
      });

      // Extract text chunks before DeepSeek call
      const chunks = await processDocuments(paths);
      
      if (!chunks || chunks.length === 0) {
        throw new Error('No text content extracted from documents');
      }

      // Call DeepSeek AI API
      const response = await fetch(`${DEEPSEEK_URL}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({ contentChunks: chunks, questionCount }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `DeepSeek API error: ${response.status}`);
      }
      
      if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
        throw new Error('DeepSeek API returned no questions');
      }
      
      return result.questions;
    } catch (err) {
      lastError = err;
      retries++;
      console.warn(`DeepSeek API attempt ${retries}/${maxRetries} failed:`, err.message);
      
      if (retries > maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, retries) + Math.random() * 1000, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}
