import { supabase } from './supabaseClient';
import * as logger from './loggerService';
import { queueOperation } from './offlineService';

/**
 * Generate a quiz from a document
 * @param {string} documentId - Document ID
 * @param {Object} options - Quiz generation options
 * @param {number} options.questionCount - Number of questions to generate
 * @param {string} options.difficulty - Quiz difficulty (easy, medium, hard)
 * @param {string} options.userId - User ID
 * @returns {Promise<Object>} - Generated quiz
 */
export async function generateQuiz(documentId, options) {
  try {
    logger.info('Generating quiz from document', { 
      documentId, 
      questionCount: options.questionCount,
      difficulty: options.difficulty 
    });
    
    // First, get the document content
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (documentError) {
      logger.error('Error fetching document for quiz', { error: documentError.message });
      throw new Error(documentError.message);
    }
    
    // Call the AI service to generate questions
    const questions = await generateQuestionsFromContent(
      document.content,
      options.questionCount,
      options.difficulty
    );
    
    // Create the quiz in the database
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([
        {
          title: `Quiz on ${document.title}`,
          document_id: documentId,
          user_id: options.userId,
          question_count: questions.length,
          difficulty: options.difficulty,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    
    if (quizError) {
      logger.error('Error creating quiz', { error: quizError.message });
      throw new Error(quizError.message);
    }
    
    // Add questions to the database
    const questionsToInsert = questions.map(question => ({
      quiz_id: quiz.id,
      question_text: question.text,
      options: question.options,
      correct_answer: question.correctAnswer,
      explanation: question.explanation,
    }));
    
    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert);
    
    if (questionsError) {
      logger.error('Error adding quiz questions', { error: questionsError.message });
      throw new Error(questionsError.message);
    }
    
    logger.info('Quiz generated successfully', { quizId: quiz.id, questionCount: questions.length });
    
    // Return the complete quiz with questions
    return {
      ...quiz,
      questions,
    };
  } catch (error) {
    logger.error('Exception generating quiz', { error: error.message });
    throw error;
  }
}

/**
 * Generate questions from document content using AI
 * @param {string} content - Document content
 * @param {number} questionCount - Number of questions to generate
 * @param {string} difficulty - Question difficulty
 * @returns {Promise<Array>} - Array of generated questions
 */
async function generateQuestionsFromContent(content, questionCount, difficulty) {
  try {
    logger.info('Calling AI to generate questions', { questionCount, difficulty });
    
    // This is a placeholder for AI question generation
    // In a real implementation, you would call an AI service like OpenAI or DeepSeek
    
    // For now, return mock questions
    const questions = [];
    for (let i = 0; i < questionCount; i++) {
      questions.push({
        text: `Sample question ${i + 1} (${difficulty} difficulty)`,
        options: [
          'Option A',
          'Option B',
          'Option C',
          'Option D',
        ],
        correctAnswer: 0, // Index of correct answer
        explanation: 'This is an explanation for the correct answer.',
      });
    }
    
    logger.info('Questions generated successfully', { count: questions.length });
    return questions;
  } catch (error) {
    logger.error('Error generating questions with AI', { error: error.message });
    throw error;
  }
}

/**
 * Get all quizzes for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of quizzes
 */
export async function getUserQuizzes(userId) {
  try {
    logger.info('Fetching user quizzes', { userId });
    
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('Error fetching quizzes', { error: error.message });
      throw new Error(error.message);
    }
    
    logger.info('Quizzes fetched successfully', { count: data.length });
    return data;
  } catch (error) {
    logger.error('Exception fetching quizzes', { error: error.message });
    throw error;
  }
}

/**
 * Get a quiz by ID with its questions
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object>} - Quiz with questions
 */
export async function getQuizById(quizId) {
  try {
    logger.info('Fetching quiz by ID', { quizId });
    
    // Get the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();
    
    if (quizError) {
      logger.error('Error fetching quiz', { error: quizError.message });
      throw new Error(quizError.message);
    }
    
    // Get the questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);
    
    if (questionsError) {
      logger.error('Error fetching quiz questions', { error: questionsError.message });
      throw new Error(questionsError.message);
    }
    
    logger.info('Quiz fetched successfully', { quizId, questionCount: questions.length });
    
    // Return the complete quiz with questions
    return {
      ...quiz,
      questions,
    };
  } catch (error) {
    logger.error('Exception fetching quiz', { error: error.message });
    throw error;
  }
}

/**
 * Submit quiz answers
 * @param {string} quizId - Quiz ID
 * @param {Array} answers - Array of answer objects
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Quiz results
 */
export async function submitQuizAnswers(quizId, answers, userId) {
  try {
    logger.info('Submitting quiz answers', { quizId, answerCount: answers.length });
    
    // Check if we're offline
    if (!(await isOnline())) {
      logger.info('Device is offline, queueing quiz submission');
      return queueOperation({
        type: 'SUBMIT_QUIZ',
        data: { quizId, answers, userId },
      });
    }
    
    // Get the quiz questions to check answers
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId);
    
    if (questionsError) {
      logger.error('Error fetching quiz questions for scoring', { error: questionsError.message });
      throw new Error(questionsError.message);
    }
    
    // Score the answers
    let correctCount = 0;
    const scoredAnswers = answers.map(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      const isCorrect = question && question.correct_answer === answer.selectedOption;
      
      if (isCorrect) correctCount++;
      
      return {
        ...answer,
        isCorrect,
        correctAnswer: question ? question.correct_answer : null,
        explanation: question ? question.explanation : null,
      };
    });
    
    const score = (correctCount / questions.length) * 100;
    
    // Save the quiz attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert([
        {
          quiz_id: quizId,
          user_id: userId,
          score,
          answers: scoredAnswers,
          completed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    
    if (attemptError) {
      logger.error('Error saving quiz attempt', { error: attemptError.message });
      throw new Error(attemptError.message);
    }
    
    logger.info('Quiz submitted successfully', { 
      quizId, 
      attemptId: attempt.id, 
      score, 
      correctCount 
    });
    
    return {
      attemptId: attempt.id,
      score,
      correctCount,
      totalCount: questions.length,
      answers: scoredAnswers,
    };
  } catch (error) {
    logger.error('Exception submitting quiz', { error: error.message });
    throw error;
  }
}

/**
 * Get quiz analytics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Quiz analytics
 */
export async function getQuizAnalytics(userId) {
  try {
    logger.info('Fetching quiz analytics', { userId });
    
    // Get all quiz attempts for the user
    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    
    if (attemptsError) {
      logger.error('Error fetching quiz attempts', { error: attemptsError.message });
      throw new Error(attemptsError.message);
    }
    
    // Calculate analytics
    const totalAttempts = attempts.length;
    const averageScore = totalAttempts > 0
      ? attempts.reduce((sum, attempt) => sum + attempt.score, 0) / totalAttempts
      : 0;
    
    // Group attempts by quiz
    const quizzes = {};
    attempts.forEach(attempt => {
      const quizId = attempt.quiz_id;
      if (!quizzes[quizId]) {
        quizzes[quizId] = {
          id: quizId,
          title: attempt.quizzes.title,
          attempts: [],
        };
      }
      quizzes[quizId].attempts.push(attempt);
    });
    
    // Calculate improvement over time
    const improvementData = [];
    if (totalAttempts > 1) {
      // Group by date (day)
      const attemptsByDate = {};
      attempts.forEach(attempt => {
        const date = new Date(attempt.completed_at).toISOString().split('T')[0];
        if (!attemptsByDate[date]) {
          attemptsByDate[date] = [];
        }
        attemptsByDate[date].push(attempt);
      });
      
      // Calculate average score per day
      Object.entries(attemptsByDate).forEach(([date, dateAttempts]) => {
        const avgScore = dateAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / dateAttempts.length;
        improvementData.push({ date, score: avgScore });
      });
      
      // Sort by date
      improvementData.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    logger.info('Quiz analytics fetched successfully', { 
      userId, 
      totalAttempts, 
      averageScore 
    });
    
    return {
      totalAttempts,
      averageScore,
      quizzes: Object.values(quizzes),
      improvementData,
      recentAttempts: attempts.slice(0, 5),
    };
  } catch (error) {
    logger.error('Exception fetching quiz analytics', { error: error.message });
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
