import { useState, useEffect } from 'react';
import client from '../api/client';
import { InterventionLog } from '../types';

export function useIntervention() {
  const [interventions, setInterventions] = useState<InterventionLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchInterventions = async () => {
    try {
      const response = await client.get('/api/interventions');
      setInterventions(response.data);
    } catch (error) {
      console.error('Error fetching interventions:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissIntervention = async (id: number) => {
    try {
      await client.put(`/api/interventions/${id}/dismiss`);
      // Update local state by filtering out the dismissed intervention
      setInterventions((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(`Error dismissing intervention ${id}:`, error);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, []);

  return { interventions, loading, fetchInterventions, dismissIntervention };
}
