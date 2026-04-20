import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";

interface InventoryHealth {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Sale {
  id: string;
  invoice_number: string;
  customer?: { name: string } | null;
  total_amount: number;
  payment_method: string;
  created_at: string;
  created_by?: string | null;
  sale_items?: SaleItem[];
  sold_by_name?: string;
}

interface WeeklySalesData {
  day: string;
  sales: number;
}

export function useInventoryHealth() {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const branchId = currentBranch?.id;

  return useQuery({
    queryKey: ["inventory-health", business?.id, branchId],
    queryFn: async (): Promise<InventoryHealth> => {
      if (!business?.id || !branchId) {
        return { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
      }

      // Get branch-specific stock instead of global product stock
      const { data: branchStockData, error } = await supabase
        .from("branch_stock")
        .select("quantity, low_stock_threshold, product_id")
        .eq("business_id", business.id)
        .eq("branch_id", branchId);

      if (error) throw error;

      const total = branchStockData?.length || 0;
      const outOfStock = branchStockData?.filter(bs => bs.quantity === 0).length || 0;
      const lowStock = branchStockData?.filter(bs => bs.quantity > 0 && bs.quantity <= bs.low_stock_threshold).length || 0;
      const inStock = total - outOfStock - lowStock;

      return { total, inStock, lowStock, outOfStock };
    },
    enabled: !!business?.id && !!branchId,
  });
}

export function useRecentSales(limit: number = 5) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const branchId = currentBranch?.id;

  return useQuery({
    queryKey: ["recent-sales", business?.id, branchId, limit],
    queryFn: async (): Promise<Sale[]> => {
      if (!business?.id || !branchId) return [];

      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          invoice_number,
          total_amount,
          payment_method,
          created_at,
          created_by,
          customer:customers (name),
          sale_items (id, product_name, quantity, unit_price, total_price)
        `)
        .eq("business_id", business.id)
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get unique creator user IDs and fetch their staff info
      const creatorIds = [...new Set((data || []).map(s => s.created_by).filter(Boolean))] as string[];
      
      let staffMap: Record<string, { full_name: string; role: string }> = {};
      if (creatorIds.length > 0) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("user_id, full_name, role")
          .eq("business_id", business.id)
          .in("user_id", creatorIds);
        
        staffMap = (staffData || []).reduce((acc, s) => {
          if (s.user_id) acc[s.user_id] = { full_name: s.full_name, role: s.role };
          return acc;
        }, {} as Record<string, { full_name: string; role: string }>);
      }
      
      // Map to include sold_by_name for display - show first name from full_name
      // Also handle the business owner case (not in staff table)
      return (data || []).map(sale => {
        const staff = sale.created_by ? staffMap[sale.created_by] : null;
        const isOwner = sale.created_by === business.owner_user_id;
        
        let firstName: string | null = null;
        let role: string | null = null;
        
        if (staff) {
          firstName = staff.full_name?.split(' ')[0] || null;
          role = staff.role;
        } else if (isOwner) {
          firstName = business.owner_name?.split(' ')[0] || null;
          role = "Owner";
        }
        
        return {
          ...sale,
          sold_by_name: firstName && role ? `${firstName} (${role})` : null
        };
      }) as (Sale & { sold_by_name?: string })[];
    },
    enabled: !!business?.id && !!branchId,
  });
}

export function useWeeklySales() {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const branchId = currentBranch?.id;

  return useQuery({
    queryKey: ["weekly-sales", business?.id, branchId],
    queryFn: async (): Promise<WeeklySalesData[]> => {
      if (!business?.id || !branchId) {
        return [];
      }

      // Get sales from the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: sales, error } = await supabase
        .from("sales")
        .select("total_amount, created_at")
        .eq("business_id", business.id)
        .eq("branch_id", branchId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by day of week
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const salesByDay: Record<string, number> = {};
      
      // Initialize all days with 0
      dayNames.forEach(day => { salesByDay[day] = 0; });

      // Sum up sales for each day
      (sales || []).forEach(sale => {
        const date = new Date(sale.created_at);
        const dayName = dayNames[date.getDay()];
        salesByDay[dayName] += Number(sale.total_amount) || 0;
      });

      // Return in order starting from Monday
      const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return orderedDays.map(day => ({
        day,
        sales: salesByDay[day] || 0,
      }));
    },
    enabled: !!business?.id && !!branchId,
  });
}

export function useTotalSales() {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const branchId = currentBranch?.id;

  return useQuery({
    queryKey: ["total-sales", business?.id, branchId],
    placeholderData: () => {
      try {
        const cached = localStorage.getItem(`total-sales-${business?.id}-${branchId}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch { return undefined; }
    },
    queryFn: async () => {
      if (!business?.id || !branchId) return { today: 0, month: 0, count: 0 };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Parallelize all three queries
      const [todayResult, monthResult, countResult] = await Promise.all([
        supabase
          .from("sales")
          .select("total_amount")
          .eq("business_id", business.id)
          .eq("branch_id", branchId)
          .gte("created_at", today.toISOString()),
        supabase
          .from("sales")
          .select("total_amount")
          .eq("business_id", business.id)
          .eq("branch_id", branchId)
          .gte("created_at", monthStart.toISOString()),
        supabase
          .from("sales")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
          .eq("branch_id", branchId),
      ]);

      if (todayResult.error) throw todayResult.error;
      if (monthResult.error) throw monthResult.error;
      if (countResult.error) throw countResult.error;

      const result = {
        today: todayResult.data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
        month: monthResult.data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
        count: countResult.count || 0,
      };

      // Cache for instant placeholder on next mount
      try {
        localStorage.setItem(`total-sales-${business.id}-${branchId}`, JSON.stringify(result));
      } catch {}

      return result;
    },
    enabled: !!business?.id && !!branchId,
  });
}
