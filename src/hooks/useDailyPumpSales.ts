import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { toast } from "sonner";
import { useEffect, useCallback, useRef } from "react";

// Hook to get current staff ID (returns staff ID for staff, or staff ID for owner if they have one)
export function useCurrentStaffId() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["current-staff-id", business?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !business?.id) return null;

      // Check for staff record (works for both staff and owners who have staff records)
      const { data } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .eq("business_id", business.id)
        .eq("is_active", true)
        .maybeSingle();
      
      return data?.id ?? null;
    },
    enabled: !!business?.id,
  });
}

// Check if current user is business owner
export function useIsBusinessOwner() {
  const { data: business } = useBusiness();
  return useQuery({
    queryKey: ["is-business-owner", business?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !business?.id) return false;
      return business.owner_user_id === user.id;
    },
    enabled: !!business?.id,
  });
}

export interface DailyPumpSale {
  id: string;
  business_id: string;
  branch_id: string;
  pump_id: string;
  staff_id: string;
  sale_date: string;
  opening_meter: number;
  closing_meter: number;
  liters_sold: number;
  price_per_liter: number;
  expected_revenue: number;
  cash_collected: number;
  pos_collected: number; // This is Card
  transfer_collected: number;
  total_collected: number;
  variance: number;
  status: 'pending' | 'submitted' | 'approved' | 'flagged';
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  pump?: {
    name: string;
    fuel_type: string;
    unit?: string;
  };
  staff?: {
    full_name: string;
  };
}

export interface DailySalesSummary {
  business_id: string;
  branch_id: string;
  sale_date: string;
  cashier_count: number;
  entry_count: number;
  total_liters: number;
  total_expected: number;
  total_cash: number;
  total_pos: number; // This is Card
  total_transfer: number;
  grand_total: number;
  total_variance: number;
  submitted_count: number;
  pending_count: number;
  shortage_count: number;
}

export interface CreateDailyPumpSaleInput {
  pump_id: string;
  opening_meter: number;
  closing_meter: number;
  price_per_liter: number;
  cash_collected: number;
  pos_collected: number; // Card
  transfer_collected: number;
  notes?: string;
}

export interface AutoSaveInput {
  id?: string;
  pump_id: string;
  opening_meter: number;
  closing_meter: number;
  price_per_liter: number;
  cash_collected: number;
  pos_collected: number;
  transfer_collected: number;
  notes?: string;
}

// Get previous closing meter for a pump - uses the most recent submitted entry's closing meter
export function usePreviousClosingMeter(pumpId: string | undefined) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const queryClient = useQueryClient();

  // Realtime: listen for pump meter updates and new submitted entries
  useEffect(() => {
    if (!pumpId || !business?.id) return;

    const pumpChannel = supabase
      .channel(`pump-meter:${pumpId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pumps', filter: `id=eq.${pumpId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["previous-closing-meter", pumpId] });
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'daily_pump_sales', filter: `pump_id=eq.${pumpId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["previous-closing-meter", pumpId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pumpChannel);
    };
  }, [pumpId, business?.id, queryClient]);

  return useQuery({
    queryKey: ["previous-closing-meter", pumpId, business?.id, currentBranch?.id],
    queryFn: async () => {
      if (!pumpId || !business?.id) return 0;

      // Fetch both sources in parallel
      const [entryResult, pumpResult] = await Promise.all([
        // Most recent submitted entry for this pump
        supabase
          .from("daily_pump_sales")
          .select("closing_meter, submitted_at")
          .eq("pump_id", pumpId)
          .eq("business_id", business.id)
          .eq("status", "submitted")
          .order("sale_date", { ascending: false })
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        // Pump's current meter reading
        supabase
          .from("pumps")
          .select("current_meter_reading, updated_at")
          .eq("id", pumpId)
          .single(),
      ]);

      if (pumpResult.error) throw pumpResult.error;

      const lastEntry = entryResult.data;
      const pump = pumpResult.data;

      // If no submitted entry exists, use pump meter
      if (!lastEntry || lastEntry.closing_meter == null) {
        return pump?.current_meter_reading ?? 0;
      }

      // If pump was manually updated after the last submission, prefer pump meter
      if (pump?.updated_at && lastEntry.submitted_at) {
        const pumpUpdated = new Date(pump.updated_at).getTime();
        const entrySubmitted = new Date(lastEntry.submitted_at).getTime();
        if (pumpUpdated > entrySubmitted) {
          return pump.current_meter_reading ?? 0;
        }
      }

      // Otherwise use the submitted entry's closing meter
      return lastEntry.closing_meter;
    },
    enabled: !!pumpId && !!business?.id,
    staleTime: 10000,
  });
}

// Get historical pump sales (for history section)
export function usePumpSalesHistory(pumpId?: string, staffId?: string, limit: number = 50) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ["pump-sales-history", business?.id, currentBranch?.id, pumpId, staffId, limit],
    queryFn: async () => {
      if (!business?.id || !currentBranch?.id) return [];

      let query = supabase
        .from("daily_pump_sales")
        .select(`
          *,
          pump:pumps(name, fuel_type, unit),
          staff:staff!daily_pump_sales_staff_id_fkey(full_name)
        `)
        .eq("business_id", business.id)
        .eq("branch_id", currentBranch.id)
        .eq("status", "submitted") // Only show submitted entries in history
        .order("sale_date", { ascending: false })
        .order("submitted_at", { ascending: false })
        .limit(limit);

      // If filtering by pump
      if (pumpId) {
        query = query.eq("pump_id", pumpId);
      }

      // If filtering by staff
      if (staffId) {
        query = query.eq("staff_id", staffId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as DailyPumpSale[];
    },
    enabled: !!business?.id && !!currentBranch?.id,
  });
}

// Get the timestamp of the cashier's most recent gas entry submission today
// Used to filter shop sales/expenses to only show post-submission data
export function useLastSubmissionTime(date?: string) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const { data: staffId } = useCurrentStaffId();
  const saleDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ["last-submission-time", business?.id, currentBranch?.id, saleDate, staffId],
    queryFn: async (): Promise<string | null> => {
      if (!business?.id || !currentBranch?.id || !staffId) return null;

      const { data, error } = await supabase
        .from("daily_pump_sales")
        .select("submitted_at")
        .eq("business_id", business.id)
        .eq("branch_id", currentBranch.id)
        .eq("staff_id", staffId)
        .eq("sale_date", saleDate)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.submitted_at || null;
    },
    enabled: !!business?.id && !!currentBranch?.id && !!staffId,
    staleTime: 10000,
  });
}

// Get cashier's own sales for the day - SINGLE SOURCE OF TRUTH
export function useMySales(date?: string) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const { data: staffId } = useCurrentStaffId();
  const saleDate = date || new Date().toISOString().split('T')[0];
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["my-daily-sales", business?.id, currentBranch?.id, saleDate, staffId],
    queryFn: async () => {
      if (!business?.id || !currentBranch?.id || !staffId) return [];

      const { data, error } = await supabase
        .from("daily_pump_sales")
        .select(`
          *,
          pump:pumps(name, fuel_type, unit),
          staff:staff!daily_pump_sales_staff_id_fkey(full_name)
        `)
        .eq("business_id", business.id)
        .eq("branch_id", currentBranch.id)
        .eq("staff_id", staffId)
        .eq("sale_date", saleDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as DailyPumpSale[];
    },
    enabled: !!business?.id && !!currentBranch?.id && !!staffId,
    // Disabled aggressive polling to prevent interference with offline sales
    refetchInterval: false,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Real-time subscription disabled to prevent interference with offline sales
  // Manual refresh can be triggered by the user when needed

  return query;
}

// Get all sales for a branch on a date (manager/admin view) - SINGLE SOURCE OF TRUTH
export function useBranchDailySales(date: string, branchId?: string) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const targetBranchId = branchId || currentBranch?.id;
  const saleDate = date || new Date().toISOString().split('T')[0];
  const queryClient = useQueryClient();
  
  // Use refs to avoid stale closures in the subscription callback
  const businessIdRef = useRef(business?.id);
  const branchIdRef = useRef(targetBranchId);
  const saleDateRef = useRef(saleDate);
  
  // Keep refs updated
  useEffect(() => {
    businessIdRef.current = business?.id;
    branchIdRef.current = targetBranchId;
    saleDateRef.current = saleDate;
  }, [business?.id, targetBranchId, saleDate]);

  // Realtime subscription for instant updates when cashier submits
  useEffect(() => {
    if (!targetBranchId || !business?.id) return;

    const channel = supabase
      .channel(`daily-pump-sales:${targetBranchId}:${saleDate}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_pump_sales',
          filter: `branch_id=eq.${targetBranchId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["branch-daily-sales", businessIdRef.current, branchIdRef.current, saleDateRef.current] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetBranchId, business?.id, saleDate, queryClient]);

  const query = useQuery({
    queryKey: ["branch-daily-sales", business?.id, targetBranchId, saleDate],
    queryFn: async () => {
      if (!business?.id || !targetBranchId) return [];

      const { data, error } = await supabase
        .from("daily_pump_sales")
        .select(`
          *,
          pump:pumps(name, fuel_type, unit),
          staff:staff!daily_pump_sales_staff_id_fkey(full_name)
        `)
        .eq("business_id", business.id)
        .eq("branch_id", targetBranchId)
        .eq("sale_date", saleDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as DailyPumpSale[];
    },
    enabled: !!business?.id && !!targetBranchId,
    refetchInterval: 30000, // Poll every 30s as fallback
    staleTime: 30000,
  });

  return query;
}

// Compute live summary from raw sales data - NO SEPARATE TABLE NEEDED
export function useLiveDailySummary(sales: DailyPumpSale[]) {
  const summary = {
    total_cash: 0,
    total_transfer: 0,
    total_card: 0, // pos_collected
    grand_total: 0,
    total_liters: 0,
    total_expected: 0,
    total_variance: 0,
    entry_count: sales.length,
    submitted_count: 0,
    pending_count: 0,
    shortage_count: 0,
    cashier_ids: new Set<string>(),
  };

  for (const sale of sales) {
    summary.total_cash += sale.cash_collected || 0;
    summary.total_transfer += sale.transfer_collected || 0;
    summary.total_card += sale.pos_collected || 0;
    summary.grand_total += sale.total_collected || 0;
    summary.total_liters += sale.liters_sold || 0;
    summary.total_expected += sale.expected_revenue || 0;
    summary.total_variance += sale.variance || 0;
    summary.cashier_ids.add(sale.staff_id);
    
    if (sale.status === 'submitted') {
      summary.submitted_count++;
    } else {
      summary.pending_count++;
    }
    
    if (sale.variance < 0) {
      summary.shortage_count++;
    }
  }

  return {
    ...summary,
    cashier_count: summary.cashier_ids.size,
  };
}

// Get summary for a date (uses view for efficiency, but also subscribes to live updates)
export function useDailySalesSummary(date?: string, branchId?: string) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const targetBranchId = branchId || currentBranch?.id;
  const saleDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ["daily-sales-summary", business?.id, targetBranchId, saleDate],
    queryFn: async () => {
      if (!business?.id || !targetBranchId) return null;

      const { data, error } = await supabase
        .from("daily_sales_summary")
        .select("*")
        .eq("business_id", business.id)
        .eq("branch_id", targetBranchId)
        .eq("sale_date", saleDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as DailySalesSummary | null;
    },
    enabled: !!business?.id && !!targetBranchId,
  });
}

// Auto-save a sale entry - creates or updates based on whether ID exists
export function useAutoSaveDailySale() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const { data: staffId } = useCurrentStaffId();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const mutate = useMutation({
    mutationFn: async (input: AutoSaveInput) => {
      if (!business?.id || !currentBranch?.id || !staffId) {
        throw new Error("Missing required context");
      }

      const saleDate = new Date().toISOString().split('T')[0];
      
      if (input.id) {
        // First check if entry is still pending
        const { data: existingSale, error: fetchError } = await supabase
          .from("daily_pump_sales")
          .select("id, status")
          .eq("id", input.id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        
        if (!existingSale) {
          throw new Error("Sale entry not found");
        }

        // If already submitted, don't try to update - just return silently
        if (existingSale.status !== 'pending') {
          return existingSale; // Return existing data, don't attempt update
        }

        // Update existing record
        const { data, error } = await supabase
          .from("daily_pump_sales")
          .update({
            closing_meter: input.closing_meter,
            cash_collected: input.cash_collected,
            pos_collected: input.pos_collected,
            transfer_collected: input.transfer_collected,
            notes: input.notes,
          })
          .eq("id", input.id)
          .eq("status", "pending") // Only update pending entries
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new record as draft
        const { data, error } = await supabase
          .from("daily_pump_sales")
          .insert({
            business_id: business.id,
            branch_id: currentBranch.id,
            staff_id: staffId,
            sale_date: saleDate,
            pump_id: input.pump_id,
            opening_meter: input.opening_meter,
            closing_meter: input.closing_meter,
            price_per_liter: input.price_per_liter,
            cash_collected: input.cash_collected,
            pos_collected: input.pos_collected,
            transfer_collected: input.transfer_collected,
            notes: input.notes,
            status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["branch-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales-summary"] });
    },
  });

  // Debounced auto-save function
  const autoSave = useCallback((input: AutoSaveInput) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      mutate.mutate(input);
    }, 500); // 500ms debounce
  }, [mutate]);

  return { autoSave, ...mutate };
}

// Create a new daily sale entry (immediate save, not auto-save)
export function useCreateDailySale() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const { data: staffId } = useCurrentStaffId();

  return useMutation({
    mutationFn: async (input: CreateDailyPumpSaleInput) => {
      if (!business?.id || !currentBranch?.id || !staffId) {
        throw new Error("Missing required context");
      }

      const { data, error } = await supabase
        .from("daily_pump_sales")
        .insert({
          business_id: business.id,
          branch_id: currentBranch.id,
          staff_id: staffId,
          sale_date: new Date().toISOString().split('T')[0],
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["branch-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales-summary"] });
      toast.success("Sale entry saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save entry: ${error.message}`);
    },
  });
}

// Submit a pending sale (locks it)
export function useSubmitDailySale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      // First check the current status of the sale
      const { data: existingSale, error: fetchError } = await supabase
        .from("daily_pump_sales")
        .select("id, status, submitted_at")
        .eq("id", saleId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!existingSale) {
        throw new Error("Sale entry not found");
      }

      // If already submitted, show a friendly message
      if (existingSale.status !== 'pending') {
        throw new Error("This entry has already been submitted and is locked. No changes can be made.");
      }

      const { data, error } = await supabase
        .from("daily_pump_sales")
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq("id", saleId)
        .eq("status", "pending")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["branch-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales-summary"] });
      queryClient.invalidateQueries({ queryKey: ["pump-sales-history"] });
      // Invalidate previous closing meter so next entry gets the new closing meter
      if (data?.pump_id) {
        queryClient.invalidateQueries({ queryKey: ["previous-closing-meter", data.pump_id] });
      }
      // Invalidate last submission time so shop sales/expenses refresh with new cutoff
      queryClient.invalidateQueries({ queryKey: ["last-submission-time"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales-payment-summary"] });
      queryClient.invalidateQueries({ queryKey: ["todays_expenses"] });
      toast.success("Sale submitted and locked");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Reopen a submitted sale (manager/admin only)
export function useReopenDailySale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data, error } = await supabase
        .from("daily_pump_sales")
        .update({ 
          status: 'pending',
          submitted_at: null,
        })
        .eq("id", saleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["branch-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales-summary"] });
      queryClient.invalidateQueries({ queryKey: ["pump-sales-history"] });
      // Invalidate previous closing meter and pump data since reopening reverts the meter
      if (data?.pump_id) {
        queryClient.invalidateQueries({ queryKey: ["previous-closing-meter", data.pump_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["pumps"] });
      toast.success("Sale reopened for editing");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reopen: ${error.message}`);
    },
  });
}

// Delete a pump entry (admin/owner only)
export function useDeleteDailySale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data, error } = await supabase
        .from("daily_pump_sales")
        .delete()
        .eq("id", saleId)
        .select("pump_id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["branch-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["daily-sales-summary"] });
      queryClient.invalidateQueries({ queryKey: ["pump-sales-history"] });
      if (data?.pump_id) {
        queryClient.invalidateQueries({ queryKey: ["previous-closing-meter", data.pump_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["pumps"] });
      toast.success("Pump entry deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete entry: ${error.message}`);
    },
  });
}

// Update a pending sale
export function useUpdateDailySale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyPumpSale> & { id: string }) => {
      const { data, error } = await supabase
        .from("daily_pump_sales")
        .update(updates)
        .eq("id", id)
        .eq("status", "pending")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-daily-sales"] });
      queryClient.invalidateQueries({ queryKey: ["branch-daily-sales"] });
      toast.success("Sale entry updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}
