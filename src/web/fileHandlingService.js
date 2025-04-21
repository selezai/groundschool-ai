/**
 * Web-specific file handling service for GroundSchool AI
 * 
 * This service provides web-specific implementations for file operations
 * that are compatible with the React Native File System API used in the mobile app.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import indexedDBService from './indexedDBService';
import { logError, logInfo } from '../services/loggerService';

// Constants
const _DOCUMENTS_DIRECTORY = 'documents';

// Create a virtual file system structure for web
const virtualFS = {
  documentDirectory: '/documents/',
  cacheDirectory: '/cache/'
};

// Helper to generate a file URI for web
const getWebFileUri = (path) => {
  return `web-fs://${path}`;
};

// Initialize the file system for web
const initializeFileSystem = async () => {
  try {
    await indexedDBService.initDB();
    logInfo('Web file system initialized');
    return true;
  } catch (error) {
    logError('Failed to initialize web file system', { error });
    return false;
  }
};

// Get document directory path (compatible with expo-file-system API)
const getDocumentDirectoryPath = () => {
  if (Platform.OS === 'web') {
    return virtualFS.documentDirectory;
  }
  return FileSystem.documentDirectory;
};

// Get cache directory path (compatible with expo-file-system API)
const getCacheDirectoryPath = () => {
  if (Platform.OS === 'web') {
    return virtualFS.cacheDirectory;
  }
  return FileSystem.cacheDirectory;
};

// Read a file as text (compatible with expo-file-system API)
const readAsStringAsync = async (fileUri) => {
  if (Platform.OS === 'web') {
    try {
      // Extract the file path from the URI
      const filePath = fileUri.replace('web-fs://', '');
      
      // For documents stored in IndexedDB
      if (filePath.startsWith(virtualFS.documentDirectory)) {
        const fileName = filePath.split('/').pop();
        const document = await indexedDBService.getDocument(fileName);
        if (document && document.content) {
          return document.content;
        }
        throw new Error(`File not found: ${fileName}`);
      }
      
      // For files in cache
      if (filePath.startsWith(virtualFS.cacheDirectory)) {
        const key = `cache_${filePath}`;
        const cachedData = await indexedDBService.getUserData(key);
        if (cachedData) {
          return cachedData;
        }
        throw new Error(`Cache file not found: ${filePath}`);
      }
      
      throw new Error(`Unsupported file path: ${filePath}`);
    } catch (error) {
      logError('Error reading file as string', { fileUri, error });
      throw error;
    }
  }
  
  // Use native implementation for other platforms
  return FileSystem.readAsStringAsync(fileUri);
};

// Write a string to a file (compatible with expo-file-system API)
const writeAsStringAsync = async (fileUri, contents) => {
  if (Platform.OS === 'web') {
    try {
      // Extract the file path from the URI
      const filePath = fileUri.replace('web-fs://', '');
      
      // For documents
      if (filePath.startsWith(virtualFS.documentDirectory)) {
        const fileName = filePath.split('/').pop();
        await indexedDBService.saveDocument({
          id: fileName,
          content: contents,
          lastModified: new Date().toISOString()
        });
        return;
      }
      
      // For files in cache
      if (filePath.startsWith(virtualFS.cacheDirectory)) {
        const key = `cache_${filePath}`;
        await indexedDBService.saveUserData(key, contents);
        return;
      }
      
      throw new Error(`Unsupported file path: ${filePath}`);
    } catch (error) {
      logError('Error writing file as string', { fileUri, error });
      throw error;
    }
  }
  
  // Use native implementation for other platforms
  return FileSystem.writeAsStringAsync(fileUri, contents);
};

// Delete a file (compatible with expo-file-system API)
const deleteAsync = async (fileUri, options = {}) => {
  if (Platform.OS === 'web') {
    try {
      // Extract the file path from the URI
      const filePath = fileUri.replace('web-fs://', '');
      
      // For documents
      if (filePath.startsWith(virtualFS.documentDirectory)) {
        const fileName = filePath.split('/').pop();
        await indexedDBService.deleteDocument(fileName);
        return;
      }
      
      // For files in cache
      if (filePath.startsWith(virtualFS.cacheDirectory)) {
        const key = `cache_${filePath}`;
        await indexedDBService.deleteItem(indexedDBService.STORES.USER_DATA, key);
        return;
      }
      
      throw new Error(`Unsupported file path: ${filePath}`);
    } catch (error) {
      logError('Error deleting file', { fileUri, error });
      throw error;
    }
  }
  
  // Use native implementation for other platforms
  return FileSystem.deleteAsync(fileUri, options);
};

// Get file info (compatible with expo-file-system API)
const getInfoAsync = async (fileUri, options = {}) => {
  if (Platform.OS === 'web') {
    try {
      // Extract the file path from the URI
      const filePath = fileUri.replace('web-fs://', '');
      
      // For documents
      if (filePath.startsWith(virtualFS.documentDirectory)) {
        const fileName = filePath.split('/').pop();
        const document = await indexedDBService.getDocument(fileName);
        
        if (document) {
          return {
            exists: true,
            isDirectory: false,
            uri: fileUri,
            size: document.content ? document.content.length : 0,
            modificationTime: new Date(document.lastModified).getTime() / 1000
          };
        }
        
        return {
          exists: false,
          isDirectory: false,
          uri: fileUri
        };
      }
      
      // For files in cache
      if (filePath.startsWith(virtualFS.cacheDirectory)) {
        const key = `cache_${filePath}`;
        const cachedData = await indexedDBService.getUserData(key);
        
        if (cachedData) {
          return {
            exists: true,
            isDirectory: false,
            uri: fileUri,
            size: cachedData ? cachedData.length : 0
          };
        }
        
        return {
          exists: false,
          isDirectory: false,
          uri: fileUri
        };
      }
      
      // For directories
      if (filePath === virtualFS.documentDirectory || filePath === virtualFS.cacheDirectory) {
        return {
          exists: true,
          isDirectory: true,
          uri: fileUri
        };
      }
      
      return {
        exists: false,
        isDirectory: false,
        uri: fileUri
      };
    } catch (error) {
      logError('Error getting file info', { fileUri, error });
      throw error;
    }
  }
  
  // Use native implementation for other platforms
  return FileSystem.getInfoAsync(fileUri, options);
};

// Create a directory (compatible with expo-file-system API)
const makeDirectoryAsync = async (dirUri, options = {}) => {
  if (Platform.OS === 'web') {
    // Directories are virtual in web implementation, so we just validate the path
    const dirPath = dirUri.replace('web-fs://', '');
    
    if (!dirPath.startsWith(virtualFS.documentDirectory) && 
        !dirPath.startsWith(virtualFS.cacheDirectory)) {
      throw new Error(`Unsupported directory path: ${dirPath}`);
    }
    
    // No actual operation needed for web
    return;
  }
  
  // Use native implementation for other platforms
  return FileSystem.makeDirectoryAsync(dirUri, options);
};

// Read a directory (compatible with expo-file-system API)
const readDirectoryAsync = async (dirUri) => {
  if (Platform.OS === 'web') {
    try {
      const dirPath = dirUri.replace('web-fs://', '');
      
      // For document directory
      if (dirPath === virtualFS.documentDirectory) {
        const documents = await indexedDBService.getAllDocuments();
        return documents.map(doc => doc.id);
      }
      
      // For cache directory
      if (dirPath === virtualFS.cacheDirectory) {
        const allUserData = await indexedDBService.getAllItems(indexedDBService.STORES.USER_DATA);
        return allUserData
          .filter(item => item.key.startsWith('cache_'))
          .map(item => item.key.replace('cache_', ''));
      }
      
      throw new Error(`Unsupported directory path: ${dirPath}`);
    } catch (error) {
      logError('Error reading directory', { dirUri, error });
      throw error;
    }
  }
  
  // Use native implementation for other platforms
  return FileSystem.readDirectoryAsync(dirUri);
};

// Download a file (compatible with expo-file-system API)
const downloadAsync = async (uri, fileUri, options = {}) => {
  if (Platform.OS === 'web') {
    try {
      // Fetch the file from the remote URI
      const response = await fetch(uri);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the content as text or blob based on the content type
      const contentType = response.headers.get('content-type');
      let content;
      
      if (contentType && contentType.includes('application/json')) {
        content = await response.text();
      } else if (contentType && contentType.includes('text/')) {
        content = await response.text();
      } else {
        // For binary data, convert to base64
        const blob = await response.blob();
        content = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      
      // Save the content to the file URI
      await writeAsStringAsync(fileUri, content);
      
      return {
        status: 200,
        headers: {
          'content-type': contentType
        },
        uri: fileUri
      };
    } catch (error) {
      logError('Error downloading file', { uri, fileUri, error });
      throw error;
    }
  }
  
  // Use native implementation for other platforms
  return FileSystem.downloadAsync(uri, fileUri, options);
};

// Upload a file (not directly supported in expo-file-system, but useful for web)
const uploadFileAsync = async (fileUri, uploadUrl, options = {}) => {
  if (Platform.OS === 'web') {
    try {
      // Read the file content
      const content = await readAsStringAsync(fileUri);
      
      // Create form data
      const formData = new FormData();
      
      // If content is base64 data URL, convert to blob
      if (content.startsWith('data:')) {
        const response = await fetch(content);
        const blob = await response.blob();
        formData.append('file', blob, fileUri.split('/').pop());
      } else {
        // Text content
        const blob = new Blob([content], { type: 'text/plain' });
        formData.append('file', blob, fileUri.split('/').pop());
      }
      
      // Add any additional fields from options
      if (options.fields) {
        Object.entries(options.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      
      // Upload the file
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: options.headers || {}
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logError('Error uploading file', { fileUri, uploadUrl, error });
      throw error;
    }
  }
  
  // For native platforms, use fetch API
  try {
    const _content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileUri.split('/').pop(),
      type: 'application/octet-stream'
    });
    
    // Add any additional fields from options
    if (options.fields) {
      Object.entries(options.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: options.headers || {}
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    logError('Error uploading file', { fileUri, uploadUrl, error });
    throw error;
  }
};

export default {
  // Constants
  documentDirectory: getDocumentDirectoryPath(),
  cacheDirectory: getCacheDirectoryPath(),
  
  // Functions
  initializeFileSystem,
  getWebFileUri,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  downloadAsync,
  uploadFileAsync
};
