import { useState, useEffect, useRef } from 'react';
import client from '../api/client';

export function useDriftScore(title: string, category: string, deadline: string) {
  const [score, setScore] = useState<number>(50);
  const [explanation, setExplanation] = useState<string>(
    "Not enough history yet. We'll learn your patterns as you add tasks."
  );
  const [loading, setLoading] = useState<boolean>(false);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    // Check if required fields are filled to make the preview API call
    if (!title.trim() || !category.trim() || !deadline) {
      setScore(50);
      setExplanation("Fill in title, category, and deadline to preview risk score.");
      return;
    }

    setLoading(true);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce the API call by 500ms
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await client.post('/api/tasks/drift-score-preview', {
          title,
          category,
          deadline: new Date(deadline).toISOString(),
        });
        setScore(response.data.drift_score);
        setExplanation(response.data.drift_explanation);
      } catch (error) {
        console.error("Error fetching drift score preview:", error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [title, category, deadline]);

  return { score, explanation, loading };
}
