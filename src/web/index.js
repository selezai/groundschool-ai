/**
 * Web-specific entry point for GroundSchool AI
 * 
 * This file initializes web-specific features and registers the service worker
 * for PWA functionality.
 */

import { Platform } from 'react-native';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import indexedDBService from './indexedDBService';
import fileHandlingService from './fileHandlingService';
import * as logger from '../services/loggerService';

// Initialize web-specific features
export const initializeWebFeatures = async () => {
  if (Platform.OS !== 'web') {
    return false;
  }

  try {
    logger.info('Initializing web-specific features');
    
    // Initialize IndexedDB
    await indexedDBService.initDB();
    
    // Initialize file handling service
    await fileHandlingService.initializeFileSystem();
    
    // Register service worker for PWA support
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      serviceWorkerRegistration.register({
        onSuccess: () => {
          logger.info('Service worker registered successfully');
        },
        onUpdate: (_registration) => {
          logger.info('New content is available, please refresh');
          // You can show a notification to the user here
        }
      });
    }
    
    // Set up beforeinstallprompt event for custom install button
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later
        window.deferredPrompt = e;
        // Update UI to notify the user they can add to home screen
        logger.info('App can be installed to home screen');
      });
    }
    
    // Track when the PWA is installed
    if (typeof window !== 'undefined') {
      window.addEventListener('appinstalled', (_evt) => {
        logger.info('App was installed to home screen');
      });
    }
    
    // Set up online/offline detection
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        logger.info('App is online');
        // Process offline queue when back online
        indexedDBService.processOfflineQueue()
          .then(result => {
            logger.info('Offline queue processed', { success: result });
          })
          .catch(error => {
            logger.error('Error processing offline queue', { error });
          });
      });
      
      window.addEventListener('offline', () => {
        logger.info('App is offline');
      });
    }
    
    // Initialize background sync if supported
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 
        typeof window !== 'undefined' && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(registration => {
        // Register sync for documents
        registration.sync.register('sync-documents')
          .then(() => logger.info('Background sync registered for documents'))
          .catch(error => logger.error('Background sync registration failed', { error }));
        
        // Register sync for quizzes
        registration.sync.register('sync-quizzes')
          .then(() => logger.info('Background sync registered for quizzes'))
          .catch(error => logger.error('Background sync registration failed', { error }));
      });
    }
    
    // Initialize push notifications if supported
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 
        typeof window !== 'undefined' && 'PushManager' in window) {
        navigator.serviceWorker.ready.then(_registration => {
        // We could request permission and subscribe to push here
        logger.info('Push notifications are supported');
      });
    }
    
    // Add web-specific keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        logger.info('Save shortcut detected');
        // Trigger save action
      }
    });
    
    return true;
  } catch (error) {
    logger.error('Error initializing web features', { error });
    return false;
  }
};

// Function to prompt user to install the PWA
export const promptInstall = async () => {
  if (typeof window === 'undefined' || !window.deferredPrompt) {
    logger.info('Cannot show install prompt, no deferred prompt available');
    return false;
  }
  
  try {
    // Show the install prompt
    window.deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await window.deferredPrompt.userChoice;
    
    // Clear the deferredPrompt
    window.deferredPrompt = null;
    
    if (choiceResult.outcome === 'accepted') {
      logger.info('User accepted the install prompt');
      return true;
    } else {
      logger.info('User dismissed the install prompt');
      return false;
    }
  } catch (error) {
    logger.error('Error prompting for install', { error });
    return false;
  }
};

// Function to check if the app is running as a PWA
export const isRunningAsPWA = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator && window.navigator.standalone) ||
    (typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://'))
  );
};

// Export all web-specific components and services
export { default as indexedDBService } from './indexedDBService';
export { default as fileHandlingService } from './fileHandlingService';
export { default as OfflineNotification } from './OfflineNotification';
export { 
  BREAKPOINTS,
  DEVICE_TYPES,
  useResponsive,
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveSidebarLayout
} from './ResponsiveLayout';
