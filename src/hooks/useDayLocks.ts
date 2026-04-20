import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

interface DayLock {
  id: string;
  business_id: string;
  cashier_id: string;
  sale_date: string;
  locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  unlock_reason: string | null;
  created_at: string;
}

interface DailySyncStatus {
  id: string;
  business_id: string;
  cashier_id: string;
  sale_date: string;
  expected_sales: number;
  synced_sales: number;
  status: 'pending' | 'partial' | 'synced';
  last_sync: string | null;
}

export function useDayLocks(date?: string) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ['day-locks', business?.id, date],
    queryFn: async (): Promise<DayLock[]> => {
      if (!business?.id) return [];

      let query = supabase
        .from('day_locks')
        .select('*')
        .eq('business_id', business.id);

      if (date) {
        query = query.eq('sale_date', date);
      }

      const { data, error } = await query.order('sale_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id
  });
}

export function useDailySyncStatus(date?: string) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ['daily-sync-status', business?.id, date],
    queryFn: async (): Promise<DailySyncStatus[]> => {
      if (!business?.id) return [];

      let query = supabase
        .from('daily_sync_status')
        .select('*')
        .eq('business_id', business.id);

      if (date) {
        query = query.eq('sale_date', date);
      }

      const { data, error } = await query.order('sale_date', { ascending: false });
      if (error) throw error;
      return (data || []) as DailySyncStatus[];
    },
    enabled: !!business?.id
  });
}

export function useLockDay() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ cashierId, date }: { cashierId: string; date: string }) => {
      if (!business?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('day_locks')
        .upsert({
          business_id: business.id,
          cashier_id: cashierId,
          sale_date: date,
          locked: true,
          locked_at: new Date().toISOString(),
          locked_by: user.id
        }, { onConflict: 'business_id,cashier_id,sale_date' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-locks'] });
      toast({
        title: 'Day Locked',
        description: 'Sales for this day are now locked and cannot be modified.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lock Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

export function useUnlockDay() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      cashierId, 
      date, 
      reason 
    }: { 
      cashierId: string; 
      date: string; 
      reason: string 
    }) => {
      if (!business?.id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('day_locks')
        .update({
          locked: false,
          unlock_reason: reason,
          locked_at: null,
          locked_by: null
        })
        .eq('business_id', business.id)
        .eq('cashier_id', cashierId)
        .eq('sale_date', date)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day-locks'] });
      toast({
        title: 'Day Unlocked',
        description: 'Sales for this day can now be modified.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Unlock Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

export function useCheckDayLock(cashierId?: string, date?: string) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ['day-lock-check', business?.id, cashierId, date],
    queryFn: async (): Promise<boolean> => {
      if (!business?.id || !cashierId || !date) return false;

      const { data, error } = await supabase
        .from('day_locks')
        .select('locked')
        .eq('business_id', business.id)
        .eq('cashier_id', cashierId)
        .eq('sale_date', date)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.locked || false;
    },
    enabled: !!business?.id && !!cashierId && !!date
  });
}
