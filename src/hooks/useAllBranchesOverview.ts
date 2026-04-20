import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranches } from "./useBranches";

interface DateFilter {
  from: string;
  to: string;
}

interface BranchBreakdown {
  branchId: string;
  branchName: string;
  sales: number;
  expenses: number;
  stockValue: number;
  cogs: number;
  profit: number;
}

interface AllBranchesOverview {
  totalSales: number;
  totalExpenses: number;
  totalStockValue: number;
  totalCogs: number;
  grossProfit: number;
  netProfit: number;
  byBranch: BranchBreakdown[];
}

export function useAllBranchesOverview(dateFilter?: DateFilter) {
  const { data: business } = useBusiness();
  const { data: branches } = useBranches(business?.id);

  return useQuery({
    queryKey: ["all-branches-overview", business?.id, dateFilter?.from, dateFilter?.to],
    queryFn: async (): Promise<AllBranchesOverview> => {
      if (!business) throw new Error("No business");

      // 1. Fetch sales
      let salesQuery = supabase
        .from("sales")
        .select("id, total_amount, branch_id")
        .eq("business_id", business.id);
      if (dateFilter) {
        salesQuery = salesQuery.gte("created_at", dateFilter.from).lte("created_at", dateFilter.to);
      }
      const { data: sales = [] } = await salesQuery;

      // 2. Fetch sale_items for COGS (only for fetched sales)
      let totalCogs = 0;
      if (sales.length > 0) {
        const saleIds = sales.map(s => s.id);
        // Batch in chunks of 200 to avoid URL length limits
        for (let i = 0; i < saleIds.length; i += 200) {
          const chunk = saleIds.slice(i, i + 200);
          const { data: items = [] } = await supabase
            .from("sale_items")
            .select("sale_id, cost_price, quantity")
            .in("sale_id", chunk);
          totalCogs += items.reduce((sum, it) => sum + (Number(it.cost_price) || 0) * (it.quantity || 0), 0);
        }
      }

      // 3. Fetch expenses
      let expQuery = supabase
        .from("expenses")
        .select("amount, branch_id")
        .eq("business_id", business.id);
      if (dateFilter) {
        expQuery = expQuery.gte("expense_date", dateFilter.from).lte("expense_date", dateFilter.to);
      }
      const { data: expenses = [] } = await expQuery;

      // 4. Fetch stock value (branch_stock joined with products for cost_price)
      const { data: stockRows = [] } = await supabase
        .from("branch_stock")
        .select("branch_id, quantity, product_id")
        .eq("business_id", business.id);

      // Get product cost prices
      const productIds = [...new Set(stockRows.map(s => s.product_id))];
      const productCosts: Record<string, number> = {};
      for (let i = 0; i < productIds.length; i += 200) {
        const chunk = productIds.slice(i, i + 200);
        const { data: prods = [] } = await supabase
          .from("products")
          .select("id, cost_price")
          .in("id", chunk);
        prods.forEach(p => { productCosts[p.id] = Number(p.cost_price) || 0; });
      }

      // Build branch map
      const branchMap: Record<string, BranchBreakdown> = {};
      (branches || []).forEach(b => {
        branchMap[b.id] = {
          branchId: b.id,
          branchName: b.name,
          sales: 0,
          expenses: 0,
          stockValue: 0,
          cogs: 0,
          profit: 0,
        };
      });

      // Aggregate sales per branch
      let totalSales = 0;
      sales.forEach(s => {
        const amt = Number(s.total_amount) || 0;
        totalSales += amt;
        if (s.branch_id && branchMap[s.branch_id]) {
          branchMap[s.branch_id].sales += amt;
        }
      });

      // Aggregate expenses per branch
      let totalExpenses = 0;
      expenses.forEach(e => {
        const amt = Number(e.amount) || 0;
        totalExpenses += amt;
        if (e.branch_id && branchMap[e.branch_id]) {
          branchMap[e.branch_id].expenses += amt;
        }
      });

      // Aggregate stock value per branch
      let totalStockValue = 0;
      stockRows.forEach(s => {
        const val = (s.quantity || 0) * (productCosts[s.product_id] || 0);
        totalStockValue += val;
        if (s.branch_id && branchMap[s.branch_id]) {
          branchMap[s.branch_id].stockValue += val;
        }
      });

      const byBranch = Object.values(branchMap).map(b => ({
        ...b,
        profit: b.sales - b.expenses,
      }));

      const grossProfit = totalSales - totalCogs;
      const netProfit = grossProfit - totalExpenses;

      return { totalSales, totalExpenses, totalStockValue, totalCogs, grossProfit, netProfit, byBranch };
    },
    enabled: !!business?.id && !!branches,
  });
}
