import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;
type ExpenseCategory = Tables<"expense_categories">;

export function useExpenses(dateFilter?: { from: string; to: string }, branchId?: string) {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["expenses", business?.id, branchId, dateFilter?.from, dateFilter?.to],
    queryFn: async (): Promise<Expense[]> => {
      if (!business) return [];

      let query = supabase
        .from("expenses")
        .select("*")
        .eq("business_id", business.id);

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      if (dateFilter) {
        query = query.gte("expense_date", dateFilter.from).lte("expense_date", dateFilter.to);
      }

      const { data, error } = await query.order("expense_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

// Fetch today's expenses for the current branch
export function useTodaysExpenses(date?: string, cashierUserId?: string, afterTimestamp?: string | null) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const today = date || format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["todays_expenses", business?.id, currentBranch?.id, today, cashierUserId, afterTimestamp],
    queryFn: async () => {
      if (!business) return { expenses: [], total: 0, cashExpenses: 0 };

      let query = supabase
        .from("expenses")
        .select("*")
        .eq("business_id", business.id)
        .eq("expense_date", today);

      // Filter by branch if selected (expenses may have branch_id)
      if (currentBranch?.id) {
        query = query.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
      }

      // Filter by cashier if provided (scopes to individual cashier's expenses)
      if (cashierUserId) {
        query = query.eq("created_by", cashierUserId);
      }

      // Filter to only include expenses after the last gas entry submission
      if (afterTimestamp) {
        query = query.gt("created_at", afterTimestamp);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      const expenses = data || [];
      const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      // Cash expenses are what gets deducted from cash collected
      const cashExpenses = expenses
        .filter((exp) => exp.payment_method?.toLowerCase() === "cash")
        .reduce((sum, exp) => sum + (exp.amount || 0), 0);

      return { expenses, total, cashExpenses };
    },
    enabled: !!business?.id,
  });
}

export function useExpenseCategories() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["expense_categories", business?.id],
    queryFn: async (): Promise<ExpenseCategory[]> => {
      if (!business) return [];

      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .eq("business_id", business.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"expenses">, "business_id" | "branch_id" | "created_by">) => {
      if (!business) throw new Error("No business found");
      if (!currentBranch?.id) throw new Error("No branch selected");

      const { error } = await supabase
        .from("expenses")
        .insert({ ...data, business_id: business.id, branch_id: currentBranch.id, created_by: user?.id || null });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["todays_expenses"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["todays_expenses"] });
    },
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: Omit<TablesInsert<"expense_categories">, "business_id">) => {
      if (!business) throw new Error("No business found");

      const { data: category, error } = await supabase
        .from("expense_categories")
        .insert({ ...data, business_id: business.id })
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_categories"] });
    },
  });
}
