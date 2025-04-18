import { supabase } from '../lib/supabaseClient';

const DEEPSEEK_URL = process.env.DEEPSEEK_URL;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export async function generateQuestions(documentIds, questionCount) {
  // Fetch file paths for each document
  const paths = await Promise.all(
    documentIds.map(async (id) => {
      const { data, error } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', id)
        .single();
      if (error) throw error;
      const { publicURL } = supabase.storage
        .from('documents')
        .getPublicUrl(data.file_path);
      return publicURL;
    })
  );

  // Call DeepSeek AI API
  const response = await fetch(`${DEEPSEEK_URL}/api/v1/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({ documentUrls: paths, questionCount }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'DeepSeek API error');
  }
  return result.questions;
}
