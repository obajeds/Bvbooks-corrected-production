import { ReactNode } from 'react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface SessionTimeoutProviderProps {
  children: ReactNode;
}

export function SessionTimeoutProvider({ children }: SessionTimeoutProviderProps) {
  useSessionTimeout();
  return <>{children}</>;
}
