import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useBranchContext } from "@/contexts/BranchContext";
import { useStaff } from "./useStaff";

export interface ProductLogEntry {
  id: string;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  performer: string;
}

export function useProductLog(productId: string | null) {
  const { data: business } = useBusiness();
  const { currentBranch } = useBranchContext();
  const { data: staffList = [] } = useStaff();

  return useQuery({
    queryKey: ["product-log", productId, business?.id, currentBranch?.id],
    queryFn: async (): Promise<ProductLogEntry[]> => {
      if (!productId || !business?.id || !currentBranch?.id) return [];

      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, movement_type, quantity, previous_quantity, new_quantity, notes, created_at, created_by")
        .eq("product_id", productId)
        .eq("business_id", business.id)
        .eq("branch_id", currentBranch.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((m) => ({
        ...m,
        performer: resolvePerformer(m.created_by, staffList, business),
      }));
    },
    enabled: !!productId && !!business?.id && !!currentBranch?.id,
  });
}

function resolvePerformer(
  userId: string | null,
  staffList: { user_id: string | null; full_name: string; role: string }[],
  business: { owner_user_id?: string | null; owner_name?: string | null } | null
): string {
  if (!userId) return "System";

  // Check if business owner
  if (business?.owner_user_id === userId) {
    const firstName = business.owner_name?.split(" ")[0] || "Owner";
    return `${firstName} (Owner)`;
  }

  // Find in staff list
  const staff = staffList.find((s) => s.user_id === userId);
  if (staff) {
    const firstName = staff.full_name.split(" ")[0];
    const role = staff.role.charAt(0).toUpperCase() + staff.role.slice(1);
    return `${firstName} (${role})`;
  }

  return "Unknown";
}
