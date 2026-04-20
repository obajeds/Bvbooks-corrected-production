import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';

export function useGasModuleEnabled() {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ['gas-module', business?.id],
    queryFn: async () => {
      if (!business?.id) return false;
      
      const { data, error } = await supabase
        .from('businesses')
        .select('feature_gas_module')
        .eq('id', business.id)
        .single();
      
      if (error) throw error;
      return data?.feature_gas_module ?? false;
    },
    enabled: !!business?.id,
  });
}
