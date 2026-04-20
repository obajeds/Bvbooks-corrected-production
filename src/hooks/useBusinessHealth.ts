import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { startOfDay, startOfMonth, subDays, format } from "date-fns";

// ── Health Status Types ──────────────────────────────────────────────
export type InventoryStatus = 'HEALTHY' | 'AT_RISK' | 'CRITICAL' | 'NOT_INITIALIZED' | 'SETUP_INCOMPLETE';
export type SalesStatus = 'ACTIVE' | 'DORMANT' | 'NO_ACTIVITY';
export type BusinessHealthLevel = 'HEALTHY' | 'AT_RISK' | 'DORMANT' | 'NOT_INITIALIZED' | 'SETUP_INCOMPLETE' | 'CRITICAL';

export interface BusinessHealthMetrics {
  // Core health statuses
  inventoryStatus: InventoryStatus;
  salesStatus: SalesStatus;
  businessHealth: BusinessHealthLevel;
  subscriptionActive: boolean;

  // Inventory detail
  totalProducts: number;
  stockAtRisk: number;
  outOfStock: number;
  lowStock: number;
  negativeStock: number;
  hasStockIn: boolean;

  // Financial
  profitToday: number;
  profitTrend: 'up' | 'down' | 'stable';
  salesToday: number;

  // Lists
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  lowStockItems: Array<{ name: string; quantity: number; threshold: number }>;
  staffActivitySummary: { activeToday: number; totalStaff: number };
  alerts: Array<{ type: 'warning' | 'critical' | 'info'; message: string; timestamp: string }>;

  // Legacy compat
  totalStock: number;
}

const HEALTH_CACHE_KEY = 'cached_dashboard_health';

function getCachedHealth(businessId: string | undefined): BusinessHealthMetrics | null {
  try {
    if (!businessId) return null;
    const cached = localStorage.getItem(`${HEALTH_CACHE_KEY}_${businessId}`);
    if (!cached) return null;
    const { data } = JSON.parse(cached);
    return data;
  } catch {
    return null;
  }
}

function setCachedHealth(businessId: string, data: BusinessHealthMetrics) {
  try {
    localStorage.setItem(`${HEALTH_CACHE_KEY}_${businessId}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch { /* localStorage might be full */ }
}

// ── Inventory Status Calculation ─────────────────────────────────────
function calculateInventoryStatus(
  totalProducts: number,
  negativeStock: number,
  lowStock: number,
  outOfStock: number,
  hasStockIn: boolean,
  allZeroOrNull: boolean
): InventoryStatus {
  // Step 1: No products at all
  if (totalProducts === 0) return 'SETUP_INCOMPLETE';
  // Step 2: Products exist but no stock ever initialised
  if (allZeroOrNull && !hasStockIn) return 'NOT_INITIALIZED';
  // Step 3: Negative stock = data corruption
  if (negativeStock > 0) return 'CRITICAL';
  // Step 4: Any item at/below threshold
  if (lowStock > 0 || outOfStock > 0) return 'AT_RISK';
  // Step 5: Earned healthy
  return 'HEALTHY';
}

// ── Sales Status Calculation ─────────────────────────────────────────
function calculateSalesStatus(totalSales: number, lastSaleDate: Date | null): SalesStatus {
  if (totalSales === 0 || !lastSaleDate) return 'NO_ACTIVITY';
  const daysSinceLast = Math.floor((Date.now() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceLast > 7) return 'DORMANT';
  return 'ACTIVE';
}

// ── Final Health Score ───────────────────────────────────────────────
function calculateBusinessHealth(
  inventoryStatus: InventoryStatus,
  salesStatus: SalesStatus,
  subscriptionActive: boolean
): BusinessHealthLevel {
  // Subscription overrides everything
  if (!subscriptionActive) return 'CRITICAL';
  // Priority cascade
  if (inventoryStatus === 'CRITICAL') return 'CRITICAL';
  if (inventoryStatus === 'SETUP_INCOMPLETE') return 'SETUP_INCOMPLETE';
  if (inventoryStatus === 'NOT_INITIALIZED') return 'NOT_INITIALIZED';
  if (inventoryStatus === 'AT_RISK') return 'AT_RISK';
  if (salesStatus === 'DORMANT') return 'DORMANT';
  return 'HEALTHY';
}

export function useBusinessHealth() {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const businessId = business?.id;
  const branchId = currentBranch?.id;

  return useQuery({
    queryKey: ['business-health', businessId, branchId],
    queryFn: async (): Promise<BusinessHealthMetrics> => {
      if (!businessId || !branchId) throw new Error("No business or branch selected");

      const today = startOfDay(new Date());
      const yesterday = startOfDay(subDays(new Date(), 1));
      const monthStart = startOfMonth(new Date());
      const todayDateStr = format(new Date(), 'yyyy-MM-dd'); // timezone-safe local date

      // ── Parallel data fetches ──────────────────────────────────────
      const [
        todaySalesRes, yesterdaySalesRes, productsRes, staffRes,
        expensesTodayRes, saleItemsRes, todaySaleItemsRes,
        businessRes, stockMovementsRes, allSalesRes, branchStockRes
      ] = await Promise.all([
        supabase
          .from('sales').select('total_amount, subtotal')
          .eq('business_id', businessId).eq('branch_id', branchId)
          .gte('created_at', today.toISOString()),
        supabase
          .from('sales').select('total_amount, subtotal')
          .eq('business_id', businessId).eq('branch_id', branchId)
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', today.toISOString()),
        supabase
          .from('products')
          .select('id, name, stock_quantity, low_stock_threshold, cost_price, selling_price')
          .eq('business_id', businessId).eq('is_active', true),
        supabase
          .from('staff').select('id, full_name, is_active')
          .eq('business_id', businessId),
        supabase
          .from('expenses').select('amount')
          .eq('business_id', businessId).eq('branch_id', branchId)
          .eq('expense_date', todayDateStr),
        supabase
          .from('sale_items')
          .select('quantity, total_price, product_name, sales!inner(business_id, branch_id, created_at)')
          .eq('sales.business_id', businessId).eq('sales.branch_id', branchId)
          .gte('sales.created_at', monthStart.toISOString()),
        supabase
          .from('sale_items')
          .select('quantity, unit_price, product_id, cost_price, sales!inner(business_id, branch_id, created_at)')
          .eq('sales.business_id', businessId).eq('sales.branch_id', branchId)
          .gte('sales.created_at', today.toISOString()),
        // Business record for subscription status
        supabase
          .from('businesses')
          .select('account_status, subscription_plan, plan_expires_at, subscription_expiry')
          .eq('id', businessId).single(),
        // Check for any stock_in movements (has stock ever been initialised?)
        supabase
          .from('stock_movements')
          .select('id')
          .eq('business_id', businessId)
          .eq('movement_type', 'stock_in')
          .limit(1),
        // Last sale date for dormancy check
        supabase
          .from('sales')
          .select('created_at')
          .eq('business_id', businessId).eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(1),
        // Branch-specific stock
        supabase
          .from('branch_stock')
          .select('product_id, quantity, low_stock_threshold')
          .eq('business_id', businessId)
          .eq('branch_id', branchId),
      ]);

      // ── Products & Inventory Analysis (branch-specific) ────────────
      const allProducts = productsRes.data || [];
      const branchStockData = branchStockRes.data || [];
      const branchStockMap = new Map(branchStockData.map((bs: any) => [bs.product_id, bs]));
      // Only count products that have branch_stock entries in this branch
      const products = allProducts.filter(p => branchStockMap.has(p.id));
      const totalProducts = products.length;

      // Use branch_stock quantities only — no fallback to global stock
      const getProductQty = (p: typeof products[0]) => {
        const bs = branchStockMap.get(p.id);
        return bs ? Number(bs.quantity) : 0;
      };
      const getProductThreshold = (p: typeof products[0]) => {
        const bs = branchStockMap.get(p.id);
        return bs ? Number(bs.low_stock_threshold) : (p.low_stock_threshold ?? 0);
      };

      const negativeStock = products.filter(p => getProductQty(p) < 0).length;
      const outOfStock = products.filter(p => getProductQty(p) === 0).length;
      const lowStock = products.filter(p => {
        const qty = getProductQty(p);
        return qty > 0 && qty <= getProductThreshold(p);
      }).length;
      const allZeroOrNull = products.every(p => getProductQty(p) === 0);
      const hasStockIn = branchStockData.length > 0 || (stockMovementsRes.data?.length ?? 0) > 0;

      const inventoryStatus = calculateInventoryStatus(
        totalProducts, negativeStock, lowStock, outOfStock, hasStockIn, allZeroOrNull
      );

      // ── Sales Activity ─────────────────────────────────────────────
      const allSales = allSalesRes.data || [];
      const totalSalesCount = allSales.length;
      const lastSaleDate = allSales.length > 0 ? new Date(allSales[0].created_at) : null;
      const salesStatus = calculateSalesStatus(totalSalesCount, lastSaleDate);

      // ── Subscription Validation ────────────────────────────────────
      const biz = businessRes.data;
      const expiryDate = biz?.plan_expires_at || biz?.subscription_expiry;
      const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
      const subscriptionActive = biz?.account_status === 'active' && !isExpired;

      // ── Final Health Score ─────────────────────────────────────────
      const businessHealth = calculateBusinessHealth(inventoryStatus, salesStatus, subscriptionActive);

      // ── Profit Calculation (uses cost_price recorded at sale time) ─
      const productCostMap = new Map(products.map(p => [p.id, Number(p.cost_price) || 0]));
      const todaySaleItems = todaySaleItemsRes.data || [];
      const todayCOGS = todaySaleItems.reduce((sum, item: any) => {
        const recordedCost = item.cost_price != null ? Number(item.cost_price) : 0;
        let unitCost: number;
        if (recordedCost > 0) {
          unitCost = recordedCost;
        } else {
          const costPrice = item.product_id ? productCostMap.get(item.product_id) : undefined;
          unitCost = costPrice !== undefined ? costPrice : Number(item.unit_price) * 0.7;
        }
        return sum + unitCost * item.quantity;
      }, 0);

      const todayRevenue = todaySalesRes.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const yesterdayRevenue = yesterdaySalesRes.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const todayExpenses = expensesTodayRes.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const profitToday = todayRevenue - todayCOGS - todayExpenses;

      let profitTrend: 'up' | 'down' | 'stable' = 'stable';
      if (todayRevenue > yesterdayRevenue * 1.1) profitTrend = 'up';
      else if (todayRevenue < yesterdayRevenue * 0.9) profitTrend = 'down';

      // ── Low Stock Items (branch-specific) ──────────────────────────
      const lowStockItems = products
        .filter(p => getProductQty(p) <= getProductThreshold(p))
        .map(p => ({ name: p.name, quantity: getProductQty(p), threshold: getProductThreshold(p) }))
        .slice(0, 5);

      // ── Top Selling Items ──────────────────────────────────────────
      const saleItemsData = saleItemsRes.data || [];
      const itemSales: Record<string, { quantity: number; revenue: number }> = {};
      saleItemsData.forEach(item => {
        const name = item.product_name;
        if (!itemSales[name]) itemSales[name] = { quantity: 0, revenue: 0 };
        itemSales[name].quantity += item.quantity;
        itemSales[name].revenue += item.total_price;
      });
      const topSellingItems = Object.entries(itemSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // ── Staff Activity (branch-scoped) ──────────────────────────────
      const staffList = staffRes.data || [];
      // Count staff assigned to the current branch via staff_branch_assignments
      const { data: branchAssignments } = await supabase
        .from('staff_branch_assignments')
        .select('staff_id')
        .eq('branch_id', branchId)
        .eq('is_active', true);
      const branchStaffIds = new Set((branchAssignments || []).map((a: any) => a.staff_id));
      // If branch assignments exist, scope to branch; otherwise fall back to all active staff
      const activeStaff = branchStaffIds.size > 0
        ? staffList.filter(s => s.is_active && branchStaffIds.has(s.id)).length
        : staffList.filter(s => s.is_active).length;
      const totalStaffForBranch = branchStaffIds.size > 0 ? branchStaffIds.size : staffList.length;

      // ── Alerts (context-aware) ─────────────────────────────────────
      const alerts: BusinessHealthMetrics['alerts'] = [];

      if (!subscriptionActive) {
        alerts.push({ type: 'critical', message: 'Subscription expired. Renew to restore full access.', timestamp: new Date().toISOString() });
      }
      if (negativeStock > 0) {
        alerts.push({ type: 'critical', message: `${negativeStock} product${negativeStock > 1 ? 's have' : ' has'} negative stock. Investigate immediately.`, timestamp: new Date().toISOString() });
      }
      if (inventoryStatus === 'SETUP_INCOMPLETE') {
        alerts.push({ type: 'warning', message: 'No products added yet. Add products to activate inventory tracking.', timestamp: new Date().toISOString() });
      }
      if (inventoryStatus === 'NOT_INITIALIZED') {
        alerts.push({ type: 'warning', message: 'Products exist but no opening stock recorded. Add stock to activate tracking.', timestamp: new Date().toISOString() });
      }
      if (outOfStock > 0) {
        alerts.push({ type: 'critical', message: `${outOfStock} item${outOfStock > 1 ? 's' : ''} out of stock`, timestamp: new Date().toISOString() });
      }
      if (lowStock > 0) {
        alerts.push({ type: 'warning', message: `${lowStock} item${lowStock > 1 ? 's' : ''} running low on stock`, timestamp: new Date().toISOString() });
      }
      if (salesStatus === 'DORMANT') {
        alerts.push({ type: 'warning', message: 'No sales recorded in the last 7 days.', timestamp: new Date().toISOString() });
      }
      if (salesStatus === 'NO_ACTIVITY') {
        alerts.push({ type: 'info', message: 'No sales recorded yet for this branch.', timestamp: new Date().toISOString() });
      }
      if (profitTrend === 'up' && salesStatus === 'ACTIVE') {
        alerts.push({ type: 'info', message: 'Sales are trending up compared to yesterday', timestamp: new Date().toISOString() });
      }

      const result: BusinessHealthMetrics = {
        inventoryStatus,
        salesStatus,
        businessHealth,
        subscriptionActive,
        totalProducts,
        stockAtRisk: outOfStock + lowStock,
        outOfStock,
        lowStock,
        negativeStock,
        hasStockIn,
        profitToday,
        profitTrend,
        salesToday: todayRevenue,
        topSellingItems,
        lowStockItems,
        staffActivitySummary: { activeToday: activeStaff, totalStaff: totalStaffForBranch },
        alerts,
        totalStock: totalProducts,
      };

      setCachedHealth(businessId, result);
      return result;
    },
    enabled: !!businessId && !!branchId,
    placeholderData: () => getCachedHealth(businessId),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}
