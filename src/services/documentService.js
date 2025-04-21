import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';
import * as logger from './loggerService';
import { queueOperation } from './offlineService';

/**
 * Get all documents for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of documents
 */
export async function getUserDocuments(userId) {
  try {
    logger.info('Fetching user documents', { userId });
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      logger.error('Error fetching documents', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('Documents fetched successfully', { count: data.length });
    return data;
  } catch (error) {
    logger.error('Exception fetching documents', { error: error.message });
    throw error;
  }
}

/**
 * Get a document by ID
 * @param {string} documentId - Document ID
 * @returns {Promise<Object>} - Document data
 */
export async function getDocumentById(documentId) {
  try {
    logger.info('Fetching document by ID', { documentId });
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (error) {
      logger.error('Error fetching document', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('Document fetched successfully', { documentId });
    return data;
  } catch (error) {
    logger.error('Exception fetching document', { error: error.message });
    throw error;
  }
}

/**
 * Create a new document
 * @param {Object} document - Document data
 * @param {string} document.title - Document title
 * @param {string} document.content - Document content
 * @param {string} document.user_id - User ID
 * @returns {Promise<Object>} - Created document
 */
export async function createDocument(document) {
  try {
    logger.info('Creating new document', { title: document.title });
    
    // Check if we're offline
    if (!(await isOnline())) {
      logger.info('Device is offline, queueing document creation');
      return queueOperation({
        type: 'CREATE_DOCUMENT',
        data: document,
      });
    }
    
    const { data, error } = await supabase
      .from('documents')
      .insert([
        {
          ...document,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating document', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('Document created successfully', { documentId: data.id });
    return data;
  } catch (error) {
    logger.error('Exception creating document', { error: error.message });
    throw error;
  }
}

/**
 * Update an existing document
 * @param {string} documentId - Document ID
 * @param {Object} updates - Document updates
 * @returns {Promise<Object>} - Updated document
 */
export async function updateDocument(documentId, updates) {
  try {
    logger.info('Updating document', { documentId });
    
    // Check if we're offline
    if (!(await isOnline())) {
      logger.info('Device is offline, queueing document update');
      return queueOperation({
        type: 'UPDATE_DOCUMENT',
        data: { documentId, updates },
      });
    }
    
    const { data, error } = await supabase
      .from('documents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating document', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('Document updated successfully', { documentId });
    return data;
  } catch (error) {
    logger.error('Exception updating document', { error: error.message });
    throw error;
  }
}

/**
 * Delete a document
 * @param {string} documentId - Document ID
 * @returns {Promise<void>}
 */
export async function deleteDocument(documentId) {
  try {
    logger.info('Deleting document', { documentId });
    
    // Check if we're offline
    if (!(await isOnline())) {
      logger.info('Device is offline, queueing document deletion');
      return queueOperation({
        type: 'DELETE_DOCUMENT',
        data: { documentId },
      });
    }
    
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (error) {
      logger.error('Error deleting document', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('Document deleted successfully', { documentId });
  } catch (error) {
    logger.error('Exception deleting document', { error: error.message });
    throw error;
  }
}

/**
 * Export a document to PDF
 * @param {Object} document - Document to export
 * @returns {Promise<string>} - URI of the exported file
 */
export async function exportDocumentToPdf(document) {
  try {
    logger.info('Exporting document to PDF', { documentId: document.id });
    
    // This is a placeholder for PDF generation logic
    // In a real implementation, you would use a library like react-native-html-to-pdf
    
    // For now, we'll just create a text file with the document content
    const fileUri = `${FileSystem.documentDirectory}${document.title.replace(/\s+/g, '_')}.txt`;
    
    await FileSystem.writeAsStringAsync(fileUri, document.content);
    
    logger.info('Document exported successfully', { documentId: document.id, fileUri });
    
    // Share the file
    if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }
    
    return fileUri;
  } catch (error) {
    logger.error('Exception exporting document', { error: error.message });
    throw error;
  }
}

/**
 * Check if the device is online
 * @returns {Promise<boolean>} - True if online, false otherwise
 */
async function isOnline() {
  // This is a placeholder - in a real implementation, you would use NetInfo
  return true;
}
