/**
 * Offline Lock Screen
 * Displayed when offline access has expired
 */

import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';

interface OfflineLockScreenProps {
  onRetry: () => void;
  expiryMessage?: string;
}

export function OfflineLockScreen({ onRetry, expiryMessage }: OfflineLockScreenProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-retry when coming back online
      handleRetry();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      // Small delay to show loading state
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <WifiOff className="h-8 w-8 text-amber-500" />
          </div>
          <CardTitle className="text-xl">Offline Access Expired</CardTitle>
          <CardDescription>
            {expiryMessage || 'Your offline access period has ended. Please connect to the internet to continue.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground text-center space-y-2">
            <p>Your data is safe and will be synced when you reconnect.</p>
            <p className="text-xs">
              For security, offline access is limited to 7 days from your last online session.
            </p>
          </div>

          <div className={`flex items-center justify-center gap-2 py-2 rounded-lg ${
            isOnline ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'
          }`}>
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Network detected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">No network connection</span>
              </>
            )}
          </div>

          <Button 
            onClick={handleRetry} 
            className="w-full" 
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {isOnline ? 'Reconnect Now' : 'Retry Connection'}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            If you continue to have issues, contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
