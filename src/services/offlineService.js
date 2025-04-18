import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabaseClient';
import { generateQuestions } from './deepSeekService';

const QUEUE_KEY = 'offlineQueue';

export async function queueOperation(op) {
  const data = await AsyncStorage.getItem(QUEUE_KEY);
  const queue = data ? JSON.parse(data) : [];
  queue.push(op);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function processQueue() {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;
  const data = await AsyncStorage.getItem(QUEUE_KEY);
  if (!data) return;
  const queue = JSON.parse(data);
  for (const op of queue) {
    try {
      switch (op.type) {
        case 'uploadDocument': {
          const { userId, file } = op.payload;
          const response = await fetch(file.uri);
          const blob = await response.blob();
          const path = `${userId}/${file.name}`;
          await supabase.storage.from('documents').upload(path, blob);
          await supabase.from('documents').insert({
            user_id: userId,
            name: file.name,
            file_path: path,
            file_size: file.size,
            file_type: file.mimeType,
          });
          break;
        }
        case 'createQuiz': {
          const { userId, documentIds, questionCount } = op.payload;
          const questions = await generateQuestions(documentIds, questionCount);
          const { data: quizData } = await supabase
            .from('quizzes')
            .insert([{ user_id: userId, title: `Offline Quiz ${new Date().toISOString()}`, document_ids: documentIds, question_count: questionCount, difficulty: 'auto' }], { returning: 'representation' });
          const quizId = quizData[0].id;
          for (const q of questions) {
            await supabase.from('questions').insert({
              quiz_id: quizId,
              text: q.text,
              options: q.options,
              correct_answer_index: q.correct_answer_index,
              explanation: q.explanation,
              image_url: q.image_url,
              topic: q.topic,
            });
          }
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.error('Offline operation failed', e);
    }
  }
  await AsyncStorage.removeItem(QUEUE_KEY);
}
