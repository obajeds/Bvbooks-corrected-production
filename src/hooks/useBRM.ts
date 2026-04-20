import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";

export const useAssignedBRM = () => {
  const { data: business } = useBusiness();

  return useQuery({
    queryKey: ["assigned-brm", business?.id],
    queryFn: async () => {
      if (!business?.brm_id) return null;

      const { data, error } = await supabase
        .from("brms")
        .select("*")
        .eq("id", business.brm_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!business?.brm_id,
  });
};

export const useBRMConversation = () => {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();

  const conversationQuery = useQuery({
    queryKey: ["brm-conversation", business?.id],
    queryFn: async () => {
      if (!business?.id || !business?.brm_id) return null;

      const { data, error } = await supabase
        .from("brm_conversations")
        .select("*")
        .eq("business_id", business.id)
        .eq("brm_id", business.brm_id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!business?.id && !!business?.brm_id,
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      if (!business?.id || !business?.brm_id) {
        throw new Error("Business or BRM not found");
      }

      const { data, error } = await supabase
        .from("brm_conversations")
        .insert({
          business_id: business.id,
          brm_id: business.brm_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brm-conversation"] });
    },
  });

  return { ...conversationQuery, createConversation };
};

export const useBRMMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["brm-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("brm_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
};

export const useSendBRMMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      message,
      senderId,
      senderType,
    }: {
      conversationId: string;
      message: string;
      senderId: string;
      senderType: "brm" | "client_admin";
    }) => {
      const { data, error } = await supabase
        .from("brm_messages")
        .insert({
          conversation_id: conversationId,
          message,
          sender_id: senderId,
          sender_type: senderType,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["brm-messages", variables.conversationId] 
      });
      queryClient.invalidateQueries({ queryKey: ["brm-conversation"] });
    },
  });
};

export const useMarkBRMMessagesRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      // Mark all unread messages as read
      const { error } = await supabase
        .from("brm_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversationId)
        .eq("sender_type", "brm")
        .eq("is_read", false);

      if (error) throw error;

      // Reset unread count for client
      const { error: convError } = await supabase
        .from("brm_conversations")
        .update({ unread_client: 0 })
        .eq("id", conversationId);

      if (convError) throw convError;
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["brm-messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["brm-conversation"] });
    },
  });
};
