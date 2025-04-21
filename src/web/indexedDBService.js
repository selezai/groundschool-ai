/**
 * IndexedDB Service for GroundSchool AI
 * 
 * This service provides a wrapper around IndexedDB operations for storing
 * and retrieving data when the application is used as a PWA.
 */

const DB_NAME = 'groundschool-ai-db';
const DB_VERSION = 1;

// Store names
const STORES = {
  DOCUMENTS: 'documents',
  QUIZZES: 'quizzes',
  USER_DATA: 'userData',
  OFFLINE_QUEUE: 'offlineQueue'
};

// Initialize the database
const initDB = () => {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is supported
    if (!window.indexedDB) {
      // console.error('Your browser doesn\'t support IndexedDB');
      reject('IndexedDB not supported');
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      // console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.QUIZZES)) {
        const quizStore = db.createObjectStore(STORES.QUIZZES, { keyPath: 'id' });
        quizStore.createIndex('userId', 'userId', { unique: false });
        quizStore.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
        db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.OFFLINE_QUEUE, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
};

// Get a transaction and store
const getStore = async (storeName, mode = 'readonly') => {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
};

// Generic add item function
const addItem = async (storeName, item) => {
  try {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

// Generic update item function
const updateItem = async (storeName, item) => {
  try {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

// Generic get item function
const getItem = async (storeName, key) => {
  try {
    const store = await getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

// Generic get all items function
const getAllItems = async (storeName) => {
  try {
    const store = await getStore(storeName);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

// Generic delete item function
const deleteItem = async (storeName, key) => {
  try {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

// Get items by index
const getByIndex = async (storeName, indexName, value) => {
  try {
    const store = await getStore(storeName);
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

// Clear a store
const clearStore = async (storeName) => {
  try {
    const store = await getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

// Add to offline queue
const addToOfflineQueue = async (operation) => {
  const queueItem = {
    ...operation,
    timestamp: Date.now(),
    status: 'pending'
  };
  
  return await addItem(STORES.OFFLINE_QUEUE, queueItem);
};

// Process offline queue
const processOfflineQueue = async () => {
  try {
    const queue = await getAllItems(STORES.OFFLINE_QUEUE);
    const pendingItems = queue.filter(item => item.status === 'pending');
    
    // console.log(`Processing ${pendingItems.length} offline operations`);
    
    // Process each item
    for (const item of pendingItems) {
      try {
        // Mark as processing
        await updateItem(STORES.OFFLINE_QUEUE, { ...item, status: 'processing' });
        
        // Process based on operation type
        // This would be implemented to handle different operation types
        
        // Mark as completed
        await updateItem(STORES.OFFLINE_QUEUE, { ...item, status: 'completed' });
      } catch (error) {
        // console.error('Error processing queue item:', error);
        // Mark as failed
        await updateItem(STORES.OFFLINE_QUEUE, { 
          ...item, 
          status: 'failed',
          error: error.message
        });
      }
    }
    
    // Clean up completed items older than 7 days
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const oldItems = queue.filter(
      item => item.status === 'completed' && item.timestamp < oneWeekAgo
    );
    
    for (const item of oldItems) {
      await deleteItem(STORES.OFFLINE_QUEUE, item.id);
    }
    
    return true;
  } catch (error) {
    // console.error('Error processing offline queue:', error);
    return false;
  }
};

// Document-specific functions
const saveDocument = async (document) => {
  return await updateItem(STORES.DOCUMENTS, document);
};

const getDocument = async (id) => {
  return await getItem(STORES.DOCUMENTS, id);
};

const getAllDocuments = async () => {
  return await getAllItems(STORES.DOCUMENTS);
};

const deleteDocument = async (id) => {
  return await deleteItem(STORES.DOCUMENTS, id);
};

// Quiz-specific functions
const saveQuiz = async (quiz) => {
  return await updateItem(STORES.QUIZZES, quiz);
};

const getQuiz = async (id) => {
  return await getItem(STORES.QUIZZES, id);
};

const getUserQuizzes = async (userId) => {
  return await getByIndex(STORES.QUIZZES, 'userId', userId);
};

const getPendingQuizzes = async () => {
  return await getByIndex(STORES.QUIZZES, 'status', 'pending');
};

const deleteQuiz = async (id) => {
  return await deleteItem(STORES.QUIZZES, id);
};

// User data functions
const saveUserData = async (key, value) => {
  return await updateItem(STORES.USER_DATA, { key, value });
};

const getUserData = async (key) => {
  const data = await getItem(STORES.USER_DATA, key);
  return data ? data.value : null;
};

export default {
  // Store names
  STORES,
  
  // Generic functions
  initDB,
  addItem,
  updateItem,
  getItem,
  getAllItems,
  deleteItem,
  getByIndex,
  clearStore,
  
  // Offline queue
  addToOfflineQueue,
  processOfflineQueue,
  
  // Document functions
  saveDocument,
  getDocument,
  getAllDocuments,
  deleteDocument,
  
  // Quiz functions
  saveQuiz,
  getQuiz,
  getUserQuizzes,
  getPendingQuizzes,
  deleteQuiz,
  
  // User data functions
  saveUserData,
  getUserData
};
