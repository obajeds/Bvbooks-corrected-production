import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BRMData {
  id: string;
  first_name: string;
  last_name: string;
  staff_id: string;
  whatsapp_number: string | null;
  phone: string | null;
}

export const useClientBRM = (businessId: string | null) => {
  return useQuery({
    queryKey: ["client-brm", businessId],
    queryFn: async (): Promise<BRMData | null> => {
      if (!businessId) return null;

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("No authentication session");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-brm?action=get-brm&businessId=${businessId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseData = await response.json();
      
      // Handle auth failures gracefully (expired session)
      if (responseData?.ok === false) {
        console.warn('[ClientBRM]', responseData.error);
        return null;
      }

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to fetch BRM');
      }

      return responseData.brm || null;
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
