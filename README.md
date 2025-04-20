# GroundSchool AI

A mobile and web application for aviation students to create custom quizzes from their study materials using AI.

![GroundSchool AI Logo](https://via.placeholder.com/150)

## Overview

GroundSchool AI helps aviation students prepare for exams by generating personalized quizzes from their uploaded study materials. The app uses DeepSeek AI to analyze documents and create relevant questions, tracks progress over time, and works offline.

## Features

- **Document Management**: Upload and organize study materials (PDF, images)
- **AI-Powered Quiz Generation**: Create custom quizzes from your documents
- **Quiz Taking**: Interactive quiz interface with immediate feedback
- **Progress Tracking**: Visualize your performance with detailed analytics
- **Offline Support**: Study without an internet connection

## Tech Stack

- **Frontend**: React Native with Expo SDK 51
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: DeepSeek API for document analysis and question generation
- **Error Tracking**: Sentry
- **Offline Sync**: Custom queue system with AsyncStorage

## Setup Instructions

### Prerequisites

- Node.js 16+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- DeepSeek API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/selezai/groundschool-ai.git
   cd groundschool-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the project root with the following variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   DEEPSEEK_URL=https://api.deepseek.ai
   DEEPSEEK_API_KEY=your_deepseek_api_key
   SENTRY_DSN=your_sentry_dsn
   ```

4. Set up the Supabase database using the migration file:
   - Go to your Supabase project
   - Navigate to the SQL Editor
   - Copy the contents of `migrations/001_create_tables.sql`
   - Run the SQL to create all necessary tables and security policies

5. Start the development server:
   ```bash
   npm start
   ```

### Running on Different Platforms

- **iOS**: `npm run ios`
- **Android**: `npm run android`
- **Web**: `npm run web`

## Troubleshooting

### Common Issues

1. **"Network Error" when uploading documents**
   - Check your internet connection
   - Verify Supabase storage bucket permissions
   - Ensure file size is within limits (10MB for PDFs, 5MB for images)

2. **Quiz generation fails**
   - Verify DeepSeek API key is valid
   - Check document format compatibility
   - Ensure document content is readable (not scanned images without OCR)

3. **Offline mode not working**
   - Clear AsyncStorage cache
   - Restart the app
   - Ensure you've previously logged in while online

### Debugging

Enable debug mode by adding `DEBUG=true` to your `.env` file. This will provide more detailed logs in the console.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
