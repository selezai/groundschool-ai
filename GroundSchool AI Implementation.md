# GroundSchool AI Implementation Guide

This document provides a step-by-step approach for AI-assisted coding of the GroundSchool AI application, structured for optimal implementation with tools like Windsurf Cascade.

![GroundSchool AI Logo](/api/placeholder/128/128)

## Implementation Order Overview

1. Core Architecture Setup
2. Authentication & User Management
3. Document Management
4. AI Integration
5. Quiz Generation & Management
6. Quiz Taking Experience
7. Progress Tracking & Analytics
8. Offline Support
9. UI/UX Implementation
10. Testing & Refinement

## Step 1: Core Architecture Setup

> **Note:** All monetary values, pricing, and cost examples in this document are now expressed in ZAR (South African Rand) and rounded to the nearest integer for clarity and local relevance.

### 1.1 Project Initialization
```diff
- Initialize a React Native project with Expo SDK 51
- Configure Expo for Web PWA support (manifest, service worker)
- Set up project structure with proper folder organization
- Initialize Git repository
```

### 1.2 Dependencies Installation
```bash
expo install expo-document-picker \
  @react-native-async-storage/async-storage \
  @react-native-community/netinfo \
  @react-navigation/native \
  @react-navigation/stack \
  react-native-screens \
  react-native-safe-area-context \
  sentry-expo
npm install @supabase/supabase-js
```
- Create `src/lib/supabaseClient.js`:
```javascript
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```
- Confirm `src/services/deepSeekService.js` has correct API URL and key usage.
- Install any UI libraries or custom theming (we use our theme and ThemedButton component).

### 1.3 Environment Configuration
```bash
npm install --save-dev react-native-dotenv
```
- Create an environment file (`.env`) at project root with keys:
```dotenv
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_URL=https://api.deepseek.ai
DEEPSEEK_API_KEY=your_deepseek_api_key
SENTRY_DSN=your_sentry_dsn
```
- Create `babel.config.js` to load env vars:
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        allowUndefined: true
      }]
    ]
  };
};
```
- In code, import vars via:
```javascript
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEEPSEEK_URL, DEEPSEEK_API_KEY, SENTRY_DSN } from '@env';
```
- Add CI/CD pipeline stub (`.github/workflows/ci.yml`):
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      - name: Install Dependencies
        run: npm install
      - name: Lint & Test
        run: npm test  # define tests later
```

## Step 2: Authentication & User Management

### 2.1 User Authentication
```
- Implement email/password registration
- Implement login functionality
- Add password reset flow
- Set up session management
```

### 2.2 User Profile
```
- Create user profile screens
- Implement profile management functionality
- Add account settings options
```

### 2.3 Authentication API Integration
```
- Connect to Supabase Auth
- Implement secure token storage
- Add session persistence
```

## Step 3: Document Management

### 3.1 Document Upload
```
- Create document upload interface
- Implement PDF/image upload functionality
- Add upload progress indicators
- Implement file validation
```

### 3.2 Document Storage
```
- Connect to Supabase Storage
- Implement secure document storage
- Set up document metadata tracking
```

### 3.3 Document Library
```
- Create document library interface
- Implement document browsing functionality
- Add document search and filtering
- Create document preview capabilities
```

## Step 4: AI Integration

### 4.1 DeepSeek AI Setup
```
- Configure API authentication
- Implement API request/response handlers
- Add error handling for API calls
```

### 4.2 Document Processing
```
- Implement PDF text extraction
- Add image OCR functionality
- Create content chunking for large documents
```

### 4.3 Question Generation
```
- Implement AI prompt engineering for question generation
- Create response parsing for structured question data
- Add validation for generated questions
```

## Step 5: Quiz Generation & Management

### 5.1 Quiz Creation
```
- Implement quiz generation interface
- Add document selection functionality
- Create quiz parameter configuration options
- Display estimated time for quiz generation based on document size
- Add Cancel button and implement cancellation handling
```

### 5.2 Quiz Management
```
- Build quiz storage and retrieval
- Implement quiz editing capabilities
- Add quiz deletion and organization
```

### 5.3 Quiz Database Schema
```
- Set up Supabase tables for quizzes and questions
- Implement database access patterns
- Create migrations and seeds
```

## Step 6: Quiz Taking Experience

### 6.1 Quiz Interface
```
- Build quiz taking screen
- Implement question navigation
- Add answer selection functionality
```

### 6.2 Quiz Feedback
```
- Create immediate feedback on answers
- Implement explanations for correct answers
- Add question flagging functionality
```

### 6.3 Quiz Results
```
- Create quiz results screen
- Implement score calculation
- Add question review functionality
```

## Step 7: Progress Tracking & Analytics

### 7.1 Quiz History
```
- Implement quiz history tracking
- Create history browsing interface
- Add filtering and sorting options
```

### 7.2 Performance Analytics
```
- Build analytics data collection
- Create performance visualization components
- Implement topic mastery tracking
```

### 7.3 Reporting
```
- Add performance reports generation
- Implement data export functionality
- Create recommendations based on performance
```

## Step 8: Offline Support

### 8.1 Service Worker Setup
```
- Configure service worker for PWA
- Implement resource caching
- Add offline mode detection
```

### 8.2 Offline Data Management
```
- Implement local storage for offline data
- Create data synchronization mechanisms
- Add conflict resolution for offline changes
```

### 8.3 Offline User Experience
```
- Create offline mode UI indicators
- Implement graceful degradation of features
- Add background sync functionality
```

## Step 9: UI/UX Implementation

### 9.1 Core UI Components
```
- Implement design system components
- Create consistent styling
- Build responsive layouts
```

### 9.2 Screen Implementation
```
- Build all app screens following designs
- Implement navigation between screens
- Add transitions and animations
```

### 9.3 Theme Support
```
- Implement light/dark mode
- Add accessibility features
- Create responsive design adjustments
```

## Step 10: Testing & Refinement

### 10.1 Unit Testing
```
- Implement component tests
- Add service and utility tests
- Create API mocks
```

### 10.2 Integration Testing
```
- Set up end-to-end tests
- Implement user flow testing
- Add performance testing
```

### 10.3 Quality Assurance
```
- Perform device compatibility testing
- Implement error tracking and logging
- Add analytics for user behavior
```

## UI Design Guidelines

Based on the provided logo located at the Desktop as `logo.png`, implement the following design system:

### Color Palette
Color Palette
* Primary: #0C1220 (Deep Navy from logo background)
* Secondary: #FFFFFF (White from airplane silhouette)
* Accent: #4A90E2 (Light Blue - complementary to the aviation theme)
* Background: #0F172A (Dark Blue variation for sections)
* Text Primary: #FFFFFF (White for contrast on dark backgrounds)
* Text Secondary: #94A3B8 (Light Gray for secondary text)

### Typography
- Headings: Poppins Bold
- Body Text: Inter Regular
- Accents: Poppins Medium

### Design Principles
- Clean, minimalist interface with focus on content
- Consistent use of white space
- Clear visual hierarchy
- Intuitive navigation with minimal learning curve
- Touch-friendly interactive elements (minimum 44px touch targets)

### Component Library
Implement these core components following the design system:
- Buttons (Primary, Secondary, Tertiary)
- Input fields
- Cards
- Lists
- Navigation bars
- Progress indicators
- Modal dialogs
- Toasts/notifications

## Database Implementation Guide

Use this simplified Supabase schema:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  processing_error TEXT
);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  document_ids TEXT[] NOT NULL,
  question_count INTEGER NOT NULL, -- Range: 5-100
  difficulty TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) NOT NULL,
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  image_url TEXT,
  topic TEXT,
  difficulty TEXT NOT NULL
);

-- Quiz attempts table
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  quiz_id UUID REFERENCES quizzes(id) NOT NULL,
  score DECIMAL NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER,
  is_complete BOOLEAN DEFAULT FALSE
);

-- Question responses table
CREATE TABLE question_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_attempt_id UUID REFERENCES quiz_attempts(id) NOT NULL,
  question_id UUID REFERENCES questions(id) NOT NULL,
  selected_answer_index INTEGER,
  is_correct BOOLEAN,
  time_taken INTEGER
);
```

## API Integration Examples

### DeepSeek AI Integration Example

```javascript
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// DeepSeek AI API configuration
const deepseekConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
};

// Function to generate questions from document content
async function generateQuestions(documentContent, numberOfQuestions = 10) {
  try {
    // Prepare the prompt for DeepSeek AI
    const prompt = `
      Generate ${numberOfQuestions} SACAA-style multiple-choice questions based on the following content.
      Each question should have 4 options with only one correct answer.
      Include an explanation for the correct answer.
      Format the response as a JSON array of question objects with the following structure:
      {
        "text": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer_index": 0, // Index of correct answer (0-3)
        "explanation": "Explanation for why this is the correct answer",
        "topic": "Subject area of this question",
        "difficulty": "easy|medium|hard"
      }
      
      Content:
      ${documentContent.substring(0, 8000)} // Limit content to avoid token limits
    `;

    // Call DeepSeek AI API
    const response = await axios.post(
      `${deepseekConfig.baseURL}/v1/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekConfig.apiKey}`
        }
      }
    );

    // Parse the response and validate the questions
    const responseText = response.data.choices[0].message.content;
    const jsonStart = responseText.indexOf('[');
    const jsonEnd = responseText.lastIndexOf(']') + 1;
    const jsonString = responseText.substring(jsonStart, jsonEnd);
    
    const questions = JSON.parse(jsonString);
    
    // Validate questions format
    const validatedQuestions = questions.map(q => ({
      text: q.text,
      options: q.options.slice(0, 4), // Ensure exactly 4 options
      correct_answer_index: q.correct_answer_index,
      explanation: q.explanation,
      topic: q.topic || 'General',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty.toLowerCase()) 
        ? q.difficulty.toLowerCase() 
        : 'medium'
    }));

    return validatedQuestions;
  } catch (error) {
    console.error('Error generating questions:', error);
    throw new Error('Failed to generate questions from document content');
  }
}

// Function to save generated questions to the database
async function saveQuizWithQuestions(userId, title, documentIds, questions) {
  try {
    // Start a transaction
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        user_id: userId,
        title,
        document_ids: documentIds,
        question_count: questions.length,
        difficulty: calculateOverallDifficulty(questions)
      })
      .select()
      .single();

    if (quizError) throw quizError;

    // Prepare questions with quiz_id
    const questionsWithQuizId = questions.map(question => ({
      ...question,
      quiz_id: quiz.id,
      options: JSON.stringify(question.options)
    }));

    // Insert all questions
    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsWithQuizId);

    if (questionsError) throw questionsError;

    return quiz.id;
  } catch (error) {
    console.error('Error saving quiz and questions:', error);
    throw new Error('Failed to save generated quiz');
  }
}

// Helper function to calculate overall difficulty
function calculateOverallDifficulty(questions) {
  const difficultyScores = {
    easy: 1,
    medium: 2,
    hard: 3
  };
  
  const totalScore = questions.reduce((sum, q) => sum + difficultyScores[q.difficulty], 0);
  const averageScore = totalScore / questions.length;
  
  if (averageScore < 1.67) return 'easy';
  if (averageScore < 2.34) return 'medium';
  return 'hard';
}

export { generateQuestions, saveQuizWithQuestions };
```

## Key Screens Implementation

Based on the PRD and logo, implement these key screens first:

### Home Dashboard

```jsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Ionicons } from '@expo/vector-icons';

// Import custom components
import QuizCard from '../components/QuizCard';
import PerformanceChart from '../components/PerformanceChart';
import LoadingIndicator from '../components/LoadingIndicator';

const HomeScreen = () => {
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation();
  const supabase = useSupabaseClient();

  useEffect(() => {
    // Fetch user data when component mounts
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigation.navigate('Login');
        return;
      }
      
      // Fetch recent quizzes
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quiz_attempts')
        .select(`
          id, 
          score, 
          completed_at,
          quizzes:quiz_id (title, question_count)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(5);
      
      if (quizzesError) throw quizzesError;
      
      // Fetch performance data
      const { data: performance, error: performanceError } = await supabase
        .rpc('get_user_performance_by_week', { user_id: user.id });
      
      if (performanceError) throw performanceError;
      
      setRecentQuizzes(quizzes || []);
      setPerformanceData(performance || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header with logo */}
        <View style={styles.header}>
          <Image
            source={require('../assets/groundschool-ai-logo.png')}
            style={styles.logo}
          />
          <Text style={styles.headerText}>GroundSchool AI</Text>
        </View>
        
        {/* Quick action buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.navigate('DocumentUpload')}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Upload Document</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('DocumentLibrary')}
          >
            <Ionicons name="library-outline" size={24} color="#3B82F6" />
            <Text style={styles.secondaryButtonText}>My Documents</Text>
          </TouchableOpacity>
        </View>
        
        {/* Performance summary */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          {performanceData.length > 0 ? (
            <PerformanceChart data={performanceData} />
          ) : (
            <Text style={styles.emptyStateText}>
              Complete your first quiz to see performance data
            </Text>
          )}
        </View>
        
        {/* Recent quizzes */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Quizzes</Text>
          {recentQuizzes.length > 0 ? (
            recentQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                title={quiz.quizzes.title}
                score={quiz.score}
                date={new Date(quiz.completed_at).toLocaleDateString()}
                questionCount={quiz.quizzes.question_count}
                onPress={() => navigation.navigate('QuizDetails', { quizId: quiz.quiz_id })}
              />
            ))
          ) : (
            <Text style={styles.emptyStateText}>
              You haven't taken any quizzes yet
            </Text>
          )}
        </View>
      </ScrollView>
      
      {/* Floating action button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewQuiz')}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  emptyStateText: {
    color: '#6B7280',
    textAlign: 'center',
    padding: 24,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#FBBF24',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});

export default HomeScreen;
```

## Monetization Implementation Guide

For implementing the subscription model:

```javascript
// Subscription plans configuration
const subscriptionPlans = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '5 document uploads per month',
      '25 questions per quiz',
      '1-week history retention',
    ],
    limits: {
      documentUploadsPerMonth: 5,
      questionsPerQuiz: 25,
      historyRetentionDays: 7,
    }
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 4.99,
    features: [
      'Unlimited document uploads',
      '100 questions per quiz',
      '1-month history retention',
      'Advanced analytics',
    ],
    limits: {
      documentUploadsPerMonth: Infinity,
      questionsPerQuiz: 100,
      historyRetentionDays: 30,
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 9.99,
    features: [
      'Everything in Basic',
      'Unlimited history',
      'Priority processing',
      'Enhanced analytics',
      'Offline mode',
    ],
    limits: {
      documentUploadsPerMonth: Infinity,
      questionsPerQuiz: 100,
      historyRetentionDays: Infinity,
    }
  },
  instructor: {
    id: 'instructor',
    name: 'Instructor',
    price: 19.99,
    features: [
      'Everything in Premium',
      'Student management',
      'Custom quiz creation',
      'Quiz sharing',
      'Student performance tracking',
    ],
    limits: {
      documentUploadsPerMonth: Infinity,
      questionsPerQuiz: 200,
      historyRetentionDays: Infinity,
      studentManagement: true,
      quizSharing: true,
    }
  }
};

// Function to check if user has reached their plan limits
function checkUserPlanLimits(user, action) {
  const userPlan = user.subscription || 'free';
  const planDetails = subscriptionPlans[userPlan];
  
  switch (action.type) {
    case 'UPLOAD_DOCUMENT':
      return checkDocumentUploadLimit(user, planDetails);
    case 'GENERATE_QUIZ':
      return {
        allowed: true,
        maxQuestions: planDetails.limits.questionsPerQuiz
      };
    case 'ACCESS_HISTORY':
      const daysAgo = (Date.now() - new Date(action.date).getTime()) / (1000 * 60 * 60 * 24);
      return {
        allowed: daysAgo <= planDetails.limits.historyRetentionDays
      };
    default:
      return { allowed: true };
  }
}

// Helper function to check document upload limits
async function checkDocumentUploadLimit(user, planDetails) {
  // If unlimited uploads, allow immediately
  if (planDetails.limits.documentUploadsPerMonth === Infinity) {
    return { allowed: true };
  }
  
  // Get the first day of current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Check how many documents user has uploaded this month
  const { count, error } = await supabase
    .from('documents')
    .select('id', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('uploaded_at', firstDayOfMonth.toISOString());
  
  if (error) {
    console.error('Error checking document upload limit:', error);
    return { allowed: false, error: 'Failed to check upload limit' };
  }
  
  return {
    allowed: count < planDetails.limits.documentUploadsPerMonth,
    currentCount: count,
    limit: planDetails.limits.documentUploadsPerMonth,
    remaining: planDetails.limits.documentUploadsPerMonth - count
  };
}
```

## Progressive Web App Implementation

Here's the key configuration for setting up the PWA:

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

module.exports = withPWA({
  // Your Next.js config
});
```

```json
// public/manifest.json
{
  "name": "GroundSchool AI",
  "short_name": "GroundSchool",
  "description": "AI-powered aviation exam preparation",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#3B82F6",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}