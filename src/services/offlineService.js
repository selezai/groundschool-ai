import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabaseClient';
import { generateQuestions } from './deepSeekService';
import { logError } from '../services/sentryService';

// Keys for AsyncStorage
const QUEUE_KEY = 'offlineQueue';
const OFFLINE_STATUS_KEY = 'offlineStatus';
const CACHED_DOCUMENTS_KEY = 'cachedDocuments';
const CACHED_QUIZZES_KEY = 'cachedQuizzes';

// Maximum number of retry attempts for operations
const MAX_RETRIES = 3;

// Offline status object structure
const defaultOfflineStatus = {
  isOffline: false,
  lastOnlineTime: null,
  pendingOperations: 0,
  lastSyncAttempt: null,
  syncErrors: [],
};

/**
 * Queue an operation to be performed when back online
 * @param {Object} op - Operation to queue
 * @param {string} op.type - Type of operation ('uploadDocument', 'createQuiz', etc.)
 * @param {Object} op.payload - Operation data
 * @param {number} op.priority - Priority of operation (1-10, higher is more important)
 * @returns {Promise<string>} ID of the queued operation
 */
export async function queueOperation(op) {
  try {
    // Generate a unique ID for the operation
    const opId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add metadata to the operation
    const enhancedOp = {
      ...op,
      id: opId,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      priority: op.priority || 5, // Default priority is 5 (medium)
    };
    
    // Get the current queue
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = data ? JSON.parse(data) : [];
    
    // Add the operation to the queue
    queue.push(enhancedOp);
    
    // Save the updated queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    
    // Update offline status
    await updateOfflineStatus();
    
    return opId;
  } catch (error) {
    // console.error removed for production cleanliness
    throw new Error(`Failed to queue operation: ${error.message}`);
  }
}

/**
 * Process the queue of offline operations
 * @param {boolean} force - Force processing even if offline
 * @returns {Promise<{success: number, failed: number, remaining: number}>} Result of processing
 */
export async function processQueue(force = false) {
  try {
    // Check network status
    const state = await NetInfo.fetch();
    if (!state.isConnected && !force) {
      // console.log removed for production cleanliness
      return { success: 0, failed: 0, remaining: 0 };
    }
    
    // Get the current queue
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    if (!data) {
      return { success: 0, failed: 0, remaining: 0 };
    }
    
    // Parse the queue
    let queue = JSON.parse(data);
    
    // Sort by priority (highest first) and then by timestamp (oldest first)
    queue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });
    
    // Track results
    let successCount = 0;
    let failedCount = 0;
    let remainingOps = [];
    let syncErrors = [];
    
    // Process each operation
    for (const op of queue) {
      try {
        // Skip operations that have already failed too many times
        if (op.retryCount >= MAX_RETRIES) {
          failedCount++;
          syncErrors.push({
            id: op.id,
            type: op.type,
            error: 'Maximum retry attempts exceeded',
            timestamp: Date.now(),
          });
          logError(new Error(`Offline operation failed permanently: ${op.type}`), {
            operationId: op.id,
            operationType: op.type,
            payload: op.payload,
            finalError: 'Maximum retry attempts exceeded',
          });
          continue;
        }
        
        // Update operation status
        op.status = 'processing';
        op.lastAttempt = Date.now();
        
        // Process based on operation type
        switch (op.type) {
          case 'uploadDocument': {
            const { userId, file } = op.payload;
            
            // Get the file data
            const response = await fetch(file.uri);
            const blob = await response.blob();
            
            // Generate a unique path
            const path = `${userId}/${Date.now()}-${file.name}`;
            
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(path, blob);
              
            if (uploadError) throw uploadError;
            
            // Insert record in database
            const { error: insertError } = await supabase
              .from('documents')
              .insert({
                user_id: userId,
                name: file.name,
                file_path: path,
                file_size: file.size,
                file_type: file.mimeType,
                uploaded_at: new Date().toISOString(),
                processed: false,
              });
              
            if (insertError) throw insertError;
            
            successCount++;
            break;
          }
          
          case 'createQuiz': {
            const { userId, documentIds, title, questionCount } = op.payload;
            
            // Generate questions
            const questions = await generateQuestions(documentIds, questionCount);
            
            // Create quiz record
            const { data: quizData, error: quizError } = await supabase
              .from('quizzes')
              .insert([
                { 
                  user_id: userId, 
                  title: title || `Quiz ${new Date().toLocaleDateString()}`, 
                  document_ids: documentIds, 
                  question_count: questionCount, 
                  difficulty: 'auto',
                  created_at: new Date().toISOString(),
                }
              ], 
              { returning: 'representation' });
              
            if (quizError) throw quizError;
            
            const quizId = quizData[0].id;
            
            // Insert questions
            for (const q of questions) {
              const { error: questionError } = await supabase
                .from('questions')
                .insert({
                  quiz_id: quizId,
                  text: q.text,
                  options: q.options,
                  correct_answer_index: q.correct_answer_index,
                  explanation: q.explanation || '',
                  image_url: q.image_url || null,
                  topic: q.topic || 'general',
                });
                
              if (questionError) throw questionError;
            }
            
            successCount++;
            break;
          }
          
          case 'saveQuizResult': {
            const { userId, quizId, score, answers } = op.payload;
            
            const { error } = await supabase
              .from('quiz_results')
              .insert({
                user_id: userId,
                quiz_id: quizId,
                score,
                answers,
                completed_at: new Date().toISOString(),
              });
              
            if (error) throw error;
            
            successCount++;
            break;
          }
          
          default:
            // Unknown operation type
            throw new Error(`Unknown operation type: ${op.type}`);
        }
      } catch (error) {
        // Update retry count and add to remaining operations
        op.retryCount = (op.retryCount || 0) + 1;
        op.status = 'failed';
        op.lastError = error.message;
        
        if (op.retryCount < MAX_RETRIES) {
          remainingOps.push(op);
        } else {
          failedCount++;
          syncErrors.push({
            id: op.id,
            type: op.type,
            error: error.message,
            timestamp: Date.now(),
          });
          logError(new Error(`Offline operation failed permanently: ${op.type}`), {
            operationId: op.id,
            operationType: op.type,
            payload: op.payload,
            finalError: error.message,
          });
        }
        
        // console.error removed for production cleanliness
      }
    }
    
    // Save remaining operations back to queue
    if (remainingOps.length > 0) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingOps));
    } else {
      await AsyncStorage.removeItem(QUEUE_KEY);
    }
    
    // Update offline status
    await updateOfflineStatus({
      syncErrors,
      lastSyncAttempt: Date.now(),
      pendingOperations: remainingOps.length,
    });
    
    return {
      success: successCount,
      failed: failedCount,
      remaining: remainingOps.length,
    };
  } catch (error) {
    // console.error removed for production cleanliness
    throw new Error(`Failed to process queue: ${error.message}`);
  }
}

/**
 * Get the current offline status
 * @returns {Promise<Object>} Offline status object
 */
export async function getOfflineStatus() {
  try {
    const data = await AsyncStorage.getItem(OFFLINE_STATUS_KEY);
    if (!data) return { ...defaultOfflineStatus };
    return JSON.parse(data);
  } catch (error) {
    // console.error removed for production cleanliness
    return { ...defaultOfflineStatus };
  }
}

/**
 * Update the offline status
 * @param {Object} updates - Updates to apply to the status
 * @returns {Promise<Object>} Updated offline status
 */
export async function updateOfflineStatus(updates = {}) {
  try {
    // Get current status
    const currentStatus = await getOfflineStatus();
    
    // Get current network state
    const networkState = await NetInfo.fetch();
    
    // Update status
    const updatedStatus = {
      ...currentStatus,
      ...updates,
      isOffline: !networkState.isConnected,
    };
    
    // If we're coming back online after being offline
    if (currentStatus.isOffline && networkState.isConnected) {
      updatedStatus.lastOnlineTime = Date.now();
    }
    
    // If we're going offline after being online
    if (!currentStatus.isOffline && !networkState.isConnected) {
      // Get the queue to count pending operations
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      const queue = data ? JSON.parse(data) : [];
      updatedStatus.pendingOperations = queue.length;
    }
    
    // Save updated status
    await AsyncStorage.setItem(OFFLINE_STATUS_KEY, JSON.stringify(updatedStatus));
    
    return updatedStatus;
  } catch (error) {
    // console.error removed for production cleanliness
    throw new Error(`Failed to update offline status: ${error.message}`);
  }
}

/**
 * Set up offline mode detection and automatic sync
 * @returns {Function} Function to remove listeners
 */
export function setupOfflineMode() {
  // Set up network state change listener
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    try {
      // Update offline status
      const status = await updateOfflineStatus();
      
      // If we're back online and have pending operations, process the queue
      if (state.isConnected && status.pendingOperations > 0) {
        await processQueue();
      }
    } catch (error) {
      // console.error removed for production cleanliness
    }
  });
  
  // Return function to remove listener
  return unsubscribe;
}

/**
 * Cache a document for offline use
 * @param {Object} document - Document to cache
 * @returns {Promise<void>}
 */
export async function cacheDocument(document) {
  try {
    // Get current cached documents
    const data = await AsyncStorage.getItem(CACHED_DOCUMENTS_KEY);
    const documents = data ? JSON.parse(data) : [];
    
    // Check if document is already cached
    const existingIndex = documents.findIndex(d => d.id === document.id);
    
    if (existingIndex >= 0) {
      // Update existing document
      documents[existingIndex] = {
        ...documents[existingIndex],
        ...document,
        cachedAt: Date.now(),
      };
    } else {
      // Add new document
      documents.push({
        ...document,
        cachedAt: Date.now(),
      });
    }
    
    // Save updated documents
    await AsyncStorage.setItem(CACHED_DOCUMENTS_KEY, JSON.stringify(documents));
  } catch (error) {
    // console.error removed for production cleanliness
    throw new Error(`Failed to cache document: ${error.message}`);
  }
}

/**
 * Get cached documents
 * @returns {Promise<Array>} Cached documents
 */
export async function getCachedDocuments() {
  try {
    const data = await AsyncStorage.getItem(CACHED_DOCUMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    // console.error removed for production cleanliness
    return [];
  }
}

/**
 * Cache a quiz for offline use
 * @param {Object} quiz - Quiz to cache
 * @param {Array} questions - Questions for the quiz
 * @returns {Promise<void>}
 */
export async function cacheQuiz(quiz, questions) {
  try {
    // Get current cached quizzes
    const data = await AsyncStorage.getItem(CACHED_QUIZZES_KEY);
    const quizzes = data ? JSON.parse(data) : [];
    
    // Check if quiz is already cached
    const existingIndex = quizzes.findIndex(q => q.id === quiz.id);
    
    const quizWithQuestions = {
      ...quiz,
      questions,
      cachedAt: Date.now(),
    };
    
    if (existingIndex >= 0) {
      // Update existing quiz
      quizzes[existingIndex] = quizWithQuestions;
    } else {
      // Add new quiz
      quizzes.push(quizWithQuestions);
    }
    
    // Save updated quizzes
    await AsyncStorage.setItem(CACHED_QUIZZES_KEY, JSON.stringify(quizzes));
  } catch (error) {
    // console.error removed for production cleanliness
    throw new Error(`Failed to cache quiz: ${error.message}`);
  }
}

/**
 * Get cached quizzes
 * @returns {Promise<Array>} Cached quizzes
 */
export async function getCachedQuizzes() {
  try {
    const data = await AsyncStorage.getItem(CACHED_QUIZZES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    // console.error removed for production cleanliness
    return [];
  }
}

/**
 * Get a specific cached quiz
 * @param {string} quizId - ID of the quiz to get
 * @param {boolean} forceUpdate - Whether to force update from Supabase if online
 * @param {Object} quizData - Quiz data to cache (optional)
 * @param {Array} questionData - Question data to cache (optional)
 * @returns {Promise<Object>} Cached quiz with questions
 */
export async function getCachedQuiz(quizId, forceUpdate = false, quizData = null, questionData = null) {
  try {
    // If quiz data and question data are provided, cache them first
    if (quizData && questionData) {
      await cacheQuiz(quizData, questionData);
    }
    
    // Check if we should try to get from Supabase
    if (forceUpdate) {
      const state = await NetInfo.fetch();
      
      if (state.isConnected) {
        try {
          // Get quiz from Supabase
          const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('*')
            .eq('id', quizId)
            .single();
            
          if (quizError) throw quizError;
          
          // Get questions from Supabase
          const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', quizId);
            
          if (questionsError) throw questionsError;
          
          // Cache the quiz and questions
          await cacheQuiz(quiz, questions);
          
          // Return the quiz and questions
          return { quiz, questions };
        } catch (err) {
          console.warn('Error fetching quiz from Supabase:', err);
          // Fall back to cached data
        }
      }
    }
    
    // Get cached quizzes
    const quizzes = await getCachedQuizzes();
    
    // Find the requested quiz
    const cachedQuiz = quizzes.find(q => q.id === quizId);
    
    if (!cachedQuiz) {
      return null;
    }
    
    // Extract questions from the cached quiz
    const { questions, ...quizOnly } = cachedQuiz;
    
    return { quiz: quizOnly, questions: questions || [] };
  } catch (error) {
    // console.error removed for production cleanliness
    return null;
  }
}

/**
 * Delete a cached quiz
 * @param {string} quizId - ID of the quiz to delete
 * @returns {Promise<void>}
 */
export async function deleteCachedQuiz(quizId) {
  try {
    // Get cached quizzes
    const data = await AsyncStorage.getItem(CACHED_QUIZZES_KEY);
    if (!data) return;
    
    const quizzes = JSON.parse(data);
    
    // Filter out the quiz to delete
    const updatedQuizzes = quizzes.filter(q => q.id !== quizId);
    
    // Save updated quizzes
    await AsyncStorage.setItem(CACHED_QUIZZES_KEY, JSON.stringify(updatedQuizzes));
  } catch (error) {
    // console.error removed for production cleanliness
    throw new Error(`Failed to delete cached quiz: ${error.message}`);
  }
}

/**
 * Save quiz results (works both online and offline)
 * @param {Object} results - Quiz results to save
 * @returns {Promise<Object>} Saved results
 */
export async function saveQuizResults(results) {
  try {
    // Check network status
    const state = await NetInfo.fetch();
    
    if (state.isConnected) {
      try {
        // Save to Supabase if online
        const { data, error } = await supabase
          .from('quiz_results')
          .insert([{
            quiz_id: results.quizId,
            user_id: results.userId,
            score: results.score,
            completed_at: results.completedAt,
            answers: results.answers
          }]);
          
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Error saving quiz results to Supabase:', err);
        // Fall back to offline storage
      }
    }
    
    // If offline or Supabase failed, queue the operation
    await queueOperation({
      type: 'saveQuizResults',
      payload: results,
      priority: 6 // Medium-high priority
    });
    
    // Also save to local storage for immediate access
    const key = `quizResult_${results.quizId}_${results.userId}`;
    await AsyncStorage.setItem(key, JSON.stringify({
      ...results,
      savedAt: Date.now(),
      pendingSync: true
    }));
    
    return results;
  } catch (error) {
    // console.error removed for production cleanliness
    throw new Error(`Failed to save quiz results: ${error.message}`);
  }
}

/**
 * Synchronize pending quizzes
 * @param {string} userId - User ID
 * @returns {Promise<{success: number, failed: number}>} Result of synchronization
 */
export async function syncQuizzes(userId) {
  try {
    // Check network status
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      throw new Error('Cannot sync quizzes: offline');
    }
    
    // Get cached quizzes
    const quizzes = await getCachedQuizzes();
    
    // Filter pending quizzes for this user
    const pendingQuizzes = quizzes.filter(q => q.pending && q.user_id === userId);
    
    if (pendingQuizzes.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    let successCount = 0;
    let failedCount = 0;
    
    // Process each pending quiz
    for (const pendingQuiz of pendingQuizzes) {
      try {
        // Generate questions
        const questions = await generateQuestions(
          pendingQuiz.document_ids, 
          pendingQuiz.question_count
        );
        
        if (!questions || questions.length === 0) {
          throw new Error('Failed to generate questions');
        }
        
        // Create quiz in Supabase
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .insert([{
            user_id: pendingQuiz.user_id,
            title: pendingQuiz.title,
            document_ids: pendingQuiz.document_ids,
            question_count: pendingQuiz.question_count,
            difficulty: pendingQuiz.difficulty,
            created_at: new Date().toISOString()
          }], { returning: 'representation' });
          
        if (quizError || !quizData.length) {
          throw quizError || new Error('Failed to create quiz');
        }
        
        const quizId = quizData[0].id;
        
        // Insert questions
        for (const q of questions) {
          await supabase.from('questions').insert({
            quiz_id: quizId,
            text: q.text,
            options: q.options,
            correct_answer_index: q.correct_answer_index,
            explanation: q.explanation || '',
            image_url: q.image_url || null,
            topic: q.topic || 'general'
          });
        }
        
        // Delete the pending quiz
        await deleteCachedQuiz(pendingQuiz.id);
        
        // Cache the new quiz
        await cacheQuiz(quizData[0], questions);
        
        successCount++;
      } catch (err) {
        // console.error removed for production cleanliness
        failedCount++;
      }
    }
    
    return { success: successCount, failed: failedCount };
  } catch (error) {
    // console.error removed for production cleanliness
    throw new Error(`Failed to sync quizzes: ${error.message}`);
  }
}
