import { useState, useEffect } from 'react';

type POSMode = 'categories' | 'list';

const POS_MODE_KEY = 'pos_mode_preference';

export function usePOSMode() {
  const [mode, setModeState] = useState<POSMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(POS_MODE_KEY);
      return (saved === 'list' || saved === 'categories') ? saved : 'categories';
    }
    return 'categories';
  });

  const setMode = (newMode: POSMode) => {
    setModeState(newMode);
    localStorage.setItem(POS_MODE_KEY, newMode);
  };

  return { mode, setMode };
}
