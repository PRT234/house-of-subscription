import { useState, useEffect } from 'react';
import { api } from './api';

export interface Features {
  email_scan: boolean;
  bank_link: boolean;
}

export function useFeatures() {
  const [features, setFeatures] = useState<Features>({ email_scan: false, bank_link: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatures() {
      try {
        const response = await api.get<Features>('/api/config/features');
        setFeatures(response);
      } catch (error) {
        console.error('Failed to fetch features', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatures();
  }, []);

  return { features, loading };
}
