import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { toast } from "sonner";

export const UNIT_CATEGORIES = [
  "Quantity",
  "Packaging",
  "Roll/Spool",
  "Weight",
  "Volume",
  "Length",
  "Area",
  "Bulk",
] as const;

export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

export interface MeasurementUnit {
  id: string;
  name: string;
  abbreviation: string;
  is_system: boolean;
  created_at: string;
  business_id?: string | null;
  category?: string | null;
  is_base?: boolean;
  active?: boolean;
}

export function useMeasurementUnits() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["measurement-units", business?.id],
    queryFn: async () => {
      let query = supabase
        .from("measurement_units")
        .select("*")
        .eq("active", true)
        .order("is_system", { ascending: false })
        .order("category")
        .order("name");

      if (business?.id) {
        query = query.or(`is_system.eq.true,business_id.eq.${business.id}`);
      } else {
        query = query.eq("is_system", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MeasurementUnit[];
    },
  });
}

/** Group units by category for dropdown rendering */
export function groupUnitsByCategory(units: MeasurementUnit[]) {
  const grouped: Record<string, MeasurementUnit[]> = {};
  const uncategorized: MeasurementUnit[] = [];

  for (const unit of units) {
    const cat = unit.category || "";
    if (!cat) {
      uncategorized.push(unit);
    } else {
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(unit);
    }
  }

  // Sort categories in the order defined by UNIT_CATEGORIES
  const sortedCategories = UNIT_CATEGORIES.filter((c) => grouped[c]?.length);
  const extraCategories = Object.keys(grouped)
    .filter((c) => !UNIT_CATEGORIES.includes(c as UnitCategory))
    .sort();

  const result: { category: string; units: MeasurementUnit[] }[] = [];
  for (const cat of [...sortedCategories, ...extraCategories]) {
    result.push({ category: cat, units: grouped[cat] });
  }
  if (uncategorized.length) {
    result.push({ category: "Other", units: uncategorized });
  }
  return result;
}

export function useCreateMeasurementUnit() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();

  return useMutation({
    mutationFn: async (data: { name: string; abbreviation: string; category?: string }) => {
      if (!business?.id) throw new Error("No business found");

      const { data: unit, error } = await supabase
        .from("measurement_units")
        .insert({
          name: data.name,
          abbreviation: data.abbreviation,
          category: data.category || null,
          business_id: business.id,
          is_system: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating measurement unit:", error);
        if (error.message?.includes("duplicate") || error.message?.includes("unique")) throw new Error("duplicate abbreviation");
        throw error;
      }
      if (!unit) {
        console.error("No data returned after creating measurement unit");
        throw new Error("Unit created but no data returned");
      }
      return unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurement-units"] });
      toast.success("Measurement unit created");
    },
    onError: (error: Error) => {
      if (error.message === "duplicate abbreviation") {
        toast.error("A unit with this abbreviation already exists");
      } else {
        toast.error(`Failed to create unit: ${error.message}`);
      }
    },
  });
}

export function useUpdateMeasurementUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; name: string; abbreviation: string; category?: string }) => {
      const { data: unit, error } = await supabase
        .from("measurement_units")
        .update({ name: data.name, abbreviation: data.abbreviation, category: data.category || null })
        .eq("id", data.id)
        .eq("is_system", false)
        .select()
        .single();

      if (error) throw error;
      return unit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurement-units"] });
      toast.success("Measurement unit updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update unit: ${error.message}`);
    },
  });
}

export function useDeleteMeasurementUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("measurement_units")
        .delete()
        .eq("id", id)
        .eq("is_system", false);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurement-units"] });
      toast.success("Measurement unit deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete unit: ${error.message}`);
    },
  });
}

export function useToggleUnitActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("measurement_units")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
      return { id, active };
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: ["measurement-units"] });
      toast.success(active ? "Unit activated" : "Unit deactivated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update unit: ${error.message}`);
    },
  });
}
