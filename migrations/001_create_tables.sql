-- Create users table (managed by Supabase Auth)
-- This is just a reference as Supabase Auth handles the actual user table

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, file_path)
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_ids UUID[] NOT NULL,
  question_count INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  explanation TEXT,
  image_url TEXT,
  topic TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on quiz_id for faster queries
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answers JSONB NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);

-- Row Level Security Policies
-- Documents: users can only access their own documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_policy ON documents 
  USING (auth.uid() = user_id);

-- Quizzes: users can only access their own quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quizzes_policy ON quizzes 
  USING (auth.uid() = user_id);

-- Questions: users can access questions for quizzes they own
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY questions_policy ON questions 
  USING (quiz_id IN (SELECT id FROM quizzes WHERE user_id = auth.uid()));

-- Quiz attempts: users can only access their own attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_attempts_policy ON quiz_attempts 
  USING (auth.uid() = user_id);
