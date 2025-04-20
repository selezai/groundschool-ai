# GroundSchool AI - Project Documentation

## Overview

GroundSchool AI is a cross-platform application built with React Native and Expo that helps aviation students prepare for exams by generating quizzes based on their study materials. The application supports document uploading, text extraction, AI-powered quiz generation, offline functionality, and comprehensive analytics.

This document provides a complete overview of the application architecture, components, services, and implementation details.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Features](#core-features)
3. [Technical Stack](#technical-stack)
4. [Architecture](#architecture)
5. [Authentication](#authentication)
6. [Document Processing](#document-processing)
7. [Quiz Generation](#quiz-generation)
8. [Offline Support](#offline-support)
9. [Error Handling and Monitoring](#error-handling-and-monitoring)
10. [Web/PWA Support](#webpwa-support)
11. [Testing](#testing)
12. [Setup and Installation](#setup-and-installation)
13. [Deployment](#deployment)
14. [Future Enhancements](#future-enhancements)

## Project Structure

The application follows a feature-based structure with the following main directories:

```
/src
  /components       # Reusable UI components
  /contexts         # React contexts for state management
  /hooks            # Custom React hooks
  /lib              # External library configurations
  /navigation       # Navigation setup and screens
  /screens          # Screen components
  /services         # Business logic and API services
  /theme            # UI theme configuration
  /utils            # Utility functions
  /web              # Web-specific components and services
/__tests__          # Test files
/__mocks__          # Mock files for testing
```

## Core Features

1. **Authentication**
   - User registration and login
   - Password reset
   - Session management

2. **Document Management**
   - PDF and image upload
   - Text extraction from documents
   - Document library

3. **Quiz Generation**
   - AI-powered quiz creation from documents
   - Multiple-choice questions
   - Customizable quiz parameters

4. **Quiz Taking**
   - Interactive quiz interface
   - Progress tracking
   - Timed quizzes

5. **Results and Analytics**
   - Quiz performance metrics
   - Historical performance tracking
   - Weak areas identification

6. **Offline Support**
   - Document caching
   - Offline quiz taking
   - Synchronization when back online

7. **Cross-Platform**
   - iOS and Android mobile apps
   - Web application with PWA support

## Technical Stack

### Core Technologies
- **React Native**: Cross-platform mobile framework
- **Expo**: Development platform for React Native
- **JavaScript/ES6+**: Programming language

### Backend Services
- **Supabase**: Backend-as-a-Service for authentication and database
- **DeepSeek AI**: AI service for quiz generation
- **Sentry**: Error tracking and monitoring

### Key Libraries
- **React Navigation**: Navigation library
- **Async Storage**: Local storage solution
- **NetInfo**: Network connectivity detection
- **PDF.js**: PDF processing
- **Tesseract.js**: OCR for image text extraction

## Architecture

The application follows a layered architecture with the following components:

1. **Presentation Layer**
   - React Native components
   - Navigation
   - Screens

2. **Business Logic Layer**
   - Services
   - Context providers
   - Hooks

3. **Data Layer**
   - API clients
   - Local storage
   - Offline cache

4. **Infrastructure Layer**
   - Error handling
   - Logging
   - Monitoring

### State Management

State management is primarily handled through React Context API with the following contexts:

- **AuthContext**: User authentication state
- **ThemeContext**: UI theme configuration
- **OfflineContext**: Network connectivity state

## Authentication

Authentication is implemented using Supabase Auth with the following features:

- Email/password authentication
- JWT token management
- Session persistence
- Secure password reset

### Implementation Details

The `AuthContext` provides authentication state and methods to the entire application:

```javascript
// Key methods in AuthContext
const register = async (email, password) => { /* ... */ };
const login = async (email, password) => { /* ... */ };
const logout = async () => { /* ... */ };
const resetPassword = async (email) => { /* ... */ };
```

## Document Processing

Document processing is handled by the `documentProcessingService` with the following capabilities:

- PDF text extraction using PDF.js
- Image text extraction using Tesseract.js
- Document metadata extraction
- Text preprocessing for quiz generation

### Implementation Details

```javascript
// Key methods in documentProcessingService
const extractTextFromPdf = async (pdfUrl) => { /* ... */ };
const extractTextFromImage = async (imageUri) => { /* ... */ };
const preprocessText = (text) => { /* ... */ };
```

## Quiz Generation

Quiz generation is powered by the DeepSeek AI API through the `deepSeekService`:

- Text analysis for key concepts
- Multiple-choice question generation
- Answer and explanation generation
- Quiz difficulty customization

### Implementation Details

```javascript
// Key methods in deepSeekService
const generateQuestions = async (text, options) => { /* ... */ };
const summarizeText = async (text) => { /* ... */ };
```

## Offline Support

Offline support is implemented through the `offlineService` with the following features:

- Document caching
- Offline quiz taking
- Operation queueing
- Background synchronization

### Implementation Details

```javascript
// Key methods in offlineService
const cacheDocument = async (document) => { /* ... */ };
const cacheQuiz = async (quiz, questions) => { /* ... */ };
const queueOperation = async (operation) => { /* ... */ };
const processQueue = async () => { /* ... */ };
```

## Error Handling and Monitoring

Error handling and monitoring are implemented through the following components:

- **ErrorBoundary**: React component for catching and handling errors
- **errorHandlingService**: Global error handlers and utilities
- **loggerService**: Structured logging
- **sentryService**: Integration with Sentry for error tracking
- **apiErrorHandler**: Standardized API error handling

### Implementation Details

```javascript
// Error boundary usage
<ErrorBoundary errorContext={{ location: 'QuizScreen' }}>
  <QuizComponent />
</ErrorBoundary>

// Global error handler setup
setupGlobalErrorHandlers();

// Logging
logger.info('Quiz started', { quizId: '123' });
logger.error('Failed to load quiz', { error: error.message });

// API error handling
try {
  await api.fetchData();
} catch (error) {
  const formattedError = handleApiError(error);
  // Handle formatted error
}
```

## Web/PWA Support

Web and PWA support are implemented through the following components:

- **service-worker.js**: Service worker for offline caching and PWA functionality
- **indexedDBService**: IndexedDB wrapper for web storage
- **fileHandlingService**: Web-specific file handling
- **ResponsiveLayout**: Responsive design components

### Implementation Details

```javascript
// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}

// IndexedDB usage
await indexedDBService.saveDocument(document);
const documents = await indexedDBService.getAllDocuments();

// Responsive layout
<ResponsiveContainer>
  <ResponsiveGrid columns={{ small: 1, medium: 2, large: 3 }}>
    {items.map(item => <ItemComponent key={item.id} item={item} />)}
  </ResponsiveGrid>
</ResponsiveContainer>
```

## Testing

The application includes comprehensive testing with the following components:

- **Jest**: Testing framework
- **React Testing Library**: Component testing
- **Mock implementations**: For external services
- **Test utilities**: Common testing functions

### Implementation Details

```javascript
// Component test example
it('renders correctly', () => {
  const { getByText } = render(<Component />);
  expect(getByText('Expected Text')).toBeTruthy();
});

// Service test example
it('processes data correctly', async () => {
  const result = await service.processData(mockData);
  expect(result).toEqual(expectedResult);
});
```

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Supabase account
- DeepSeek AI API key
- Sentry account

### Installation Steps

1. Clone the repository
   ```
   git clone https://github.com/yourusername/groundschool-ai.git
   cd groundschool-ai
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file with the following variables
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   DEEPSEEK_API_KEY=your_deepseek_api_key
   SENTRY_DSN=your_sentry_dsn
   ```

4. Start the development server
   ```
   npm start
   ```

## Deployment

### Mobile Deployment

1. Configure app.json with your app details
2. Build the app for the desired platform
   ```
   expo build:android
   expo build:ios
   ```
3. Submit to the respective app stores

### Web Deployment

1. Build the web version
   ```
   expo build:web
   ```
2. Deploy the `web-build` directory to your hosting provider

## Future Enhancements

1. **Enhanced AI Features**
   - More question types (fill-in-the-blank, essay)
   - Adaptive learning based on performance

2. **Collaboration Features**
   - Shared document libraries
   - Group study sessions
   - Quiz sharing

3. **Advanced Analytics**
   - Learning pattern analysis
   - Predictive performance metrics
   - Study time optimization

4. **Integration with Learning Management Systems**
   - Canvas, Blackboard integration
   - Grade synchronization

5. **Expanded Content**
   - Pre-built quiz libraries
   - Official FAA question banks

## Conclusion

GroundSchool AI provides a comprehensive solution for aviation students to prepare for exams using AI-powered quiz generation. The application's offline capabilities, cross-platform support, and robust error handling ensure a reliable and seamless user experience across devices and network conditions.

---

*Documentation last updated: April 20, 2025*
