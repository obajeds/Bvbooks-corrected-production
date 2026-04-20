import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "./useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { useSuperAdmin } from "./useSuperAdmin";

// ==================== Types ====================

export type ConversationStatus = 'ai_only' | 'escalated' | 'human_active' | 'closed' | 'ticket_created';
export type ChatSenderType = 'client_admin' | 'super_admin' | 'ai';

export interface SupportConversation {
  id: string;
  business_id: string;
  client_user_id: string;
  client_name: string;
  client_email: string;
  status: ConversationStatus;
  assigned_admin_id: string | null;
  assigned_admin_name: string | null;
  subject: string | null;
  escalation_reason: string | null;
  escalated_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  ticket_id: string | null;
  created_at: string;
  updated_at: string;
  business?: { trading_name: string };
}

export interface SupportChatMessage {
  id: string;
  conversation_id: string;
  sender_type: ChatSenderType;
  sender_id: string | null;
  sender_name: string;
  message: string;
  is_internal: boolean | null;
  read_at: string | null;
  kb_article_ids: string[] | null;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  business_id: string;
  submitted_by_user_id: string;
  submitted_by_email: string;
  submitted_by_name: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

const ESCALATION_KEYWORDS = [
  "speak to human", "talk to agent", "live agent", "real person", "customer service",
  "fraud", "unauthorized", "hacked", "security breach", "stolen",
  "refund", "dispute", "chargeback", "billing error",
  "cancel account", "delete account", "close account",
  "connect me", "human support", "real agent", "payment issue", "missing money", "account locked"
];

// ==================== Client Hooks ====================

export function useActiveConversation() {
  const { data: business } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["active-conversation", business?.id, user?.id],
    queryFn: async (): Promise<SupportConversation | null> => {
      if (!business?.id || !user?.id) return null;

      const { data: existing, error } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("business_id", business.id)
        .eq("client_user_id", user.id)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return existing as SupportConversation | null;
    },
    enabled: !!business?.id && !!user?.id,
  });

  useEffect(() => {
    if (!query.data?.id) return;

    const channel = supabase
      .channel(`conversation-${query.data.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations", filter: `id=eq.${query.data.id}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            queryClient.setQueryData(["active-conversation", business?.id, user?.id], payload.new as SupportConversation);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [query.data?.id, business?.id, user?.id, queryClient]);

  return query;
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (): Promise<SupportConversation> => {
      if (!business?.id || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("support_conversations")
        .insert({
          business_id: business.id,
          client_user_id: user.id,
          client_name: business.owner_name || user.email || "User",
          client_email: user.email || "",
          status: "ai_only",
        })
        .select()
        .single();

      if (error) throw error;
      return data as SupportConversation;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["active-conversation", business?.id, user?.id], data);
    },
  });
}

export function useConversationMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversation-messages", conversationId],
    queryFn: async (): Promise<SupportChatMessage[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("support_chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as SupportChatMessage[];
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          queryClient.setQueryData<SupportChatMessage[]>(["conversation-messages", conversationId], (old) => {
            const newMsg = payload.new as SupportChatMessage;
            if (old?.some(m => m.id === newMsg.id)) return old;
            return [...(old || []), newMsg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { conversationId: string; message: string; kbArticleIds?: string[] }): Promise<SupportChatMessage> => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: msg, error } = await supabase
        .from("support_chat_messages")
        .insert({
          conversation_id: data.conversationId,
          sender_type: "client_admin" as const,
          sender_id: user.id,
          sender_name: business?.owner_name || user.email || "User",
          message: data.message,
          kb_article_ids: data.kbArticleIds || [],
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("support_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", data.conversationId);

      return msg as SupportChatMessage;
    },
    onSuccess: (msg) => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", msg.conversation_id] });
    },
  });
}

export function useEscalateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { conversationId: string; reason?: string }): Promise<void> => {
      const { error } = await supabase
        .from("support_conversations")
        .update({ status: "escalated", escalation_reason: data.reason || "User requested human support", escalated_at: new Date().toISOString() })
        .eq("id", data.conversationId);

      if (error) throw error;

      await supabase.from("support_chat_messages").insert({
        conversation_id: data.conversationId,
        sender_type: "ai" as const,
        sender_name: "System",
        message: "Conversation escalated to human support. An agent will respond shortly.",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-conversation"] });
    },
  });
}

// Create a ticket from an escalated conversation
export function useCreateTicketFromConversation() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { conversationId: string; subject: string; category?: string }): Promise<SupportTicket> => {
      if (!business?.id || !user?.id) throw new Error("Not authenticated");

      // Generate ticket number
      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

      // Get conversation messages for description
      const { data: messages } = await supabase
        .from("support_chat_messages")
        .select("message, sender_type")
        .eq("conversation_id", data.conversationId)
        .order("created_at", { ascending: true })
        .limit(5);

      const description = messages?.map(m => `${m.sender_type}: ${m.message}`).join('\n') || 'Escalated from live chat';

      // Create ticket linked to conversation
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({
          ticket_number: ticketNumber,
          business_id: business.id,
          submitted_by_user_id: user.id,
          submitted_by_email: user.email || "",
          submitted_by_name: business.owner_name || user.email || "User",
          subject: data.subject,
          description: description,
          category: data.category || "general",
          priority: "medium",
          status: "open",
          conversation_id: data.conversationId,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Update conversation with ticket reference
      await supabase
        .from("support_conversations")
        .update({ ticket_id: ticket.id, status: "ticket_created" })
        .eq("id", data.conversationId);

      // Add system message
      await supabase.from("support_chat_messages").insert({
        conversation_id: data.conversationId,
        sender_type: "ai" as const,
        sender_name: "System",
        message: `Support ticket ${ticketNumber} created. Our team will respond to your issue soon.`,
      });

      return ticket as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-conversation"] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

// ==================== Live Chat Hook ====================

export function useLiveChat() {
  const { data: business } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: conversation, isLoading: conversationLoading } = useActiveConversation();
  const { data: messages = [], isLoading: messagesLoading } = useConversationMessages(conversation?.id || null);
  const createConversation = useCreateConversation();
  const sendMessageMutation = useSendMessage();
  const escalateMutation = useEscalateConversation();
  const createTicketMutation = useCreateTicketFromConversation();
  
  const [isSending, setIsSending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showEscalationOption, setShowEscalationOption] = useState(false);

  const shouldAutoEscalate = useCallback((message: string) => {
    const lowerMessage = message.toLowerCase();
    return ESCALATION_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
  }, []);

  const isEscalated = conversation?.status === "escalated" || conversation?.status === "human_active" || conversation?.status === "ticket_created";
  const isHumanActive = conversation?.status === "human_active";
  const isClosed = conversation?.status === "closed";
  const hasTicket = !!conversation?.ticket_id;

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return;
    setIsSending(true);

    try {
      let activeConversation = conversation;
      if (!activeConversation) {
        activeConversation = await createConversation.mutateAsync();
      }

      await sendMessageMutation.mutateAsync({ conversationId: activeConversation.id, message: content.trim() });

      // Check if user explicitly requested human support
      if (shouldAutoEscalate(content)) {
        await supabase.from("support_chat_messages").insert({
          conversation_id: activeConversation.id,
          sender_type: "ai" as const,
          sender_name: "BVBooks AI",
          message: "I understand you'd like to speak with a live agent. Click the 'Connect to Agent' button below to be connected.",
        });
        setShowEscalationOption(true);
        return;
      }

      if (activeConversation.status === "ai_only") {
        const { data: recentMessages } = await supabase.from("support_chat_messages").select("*").eq("conversation_id", activeConversation.id).order("created_at", { ascending: true }).limit(20);
        const conversationHistory = (recentMessages || []).map(m => ({ role: m.sender_type === "client_admin" ? "user" : "assistant", content: m.message }));

        const { data: aiResponse, error: aiError } = await supabase.functions.invoke("support-ai-chat", {
          body: { message: content.trim(), conversationHistory, conversationId: activeConversation.id },
        });

        if (aiError) throw aiError;

        // Only save AI response if not blocked (conversation is still ai_only)
        if (!aiResponse.blocked && aiResponse.response) {
          await supabase.from("support_chat_messages").insert({
            conversation_id: activeConversation.id,
            sender_type: "ai" as const,
            sender_name: "BVBooks AI",
            message: aiResponse.response,
            kb_article_ids: aiResponse.kbArticleIds || [],
          });

          // Only show escalation option if AI suggests it
          if (aiResponse.shouldEscalate) {
            setShowEscalationOption(true);
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  }, [conversation, isSending, createConversation, sendMessageMutation, escalateMutation, shouldAutoEscalate]);

  const connectToAgent = useCallback(async () => {
    if (!conversation?.id || isConnecting) return;
    setIsConnecting(true);
    try {
      await escalateMutation.mutateAsync({ conversationId: conversation.id, reason: "User clicked connect to agent" });
    } finally {
      setIsConnecting(false);
    }
  }, [conversation?.id, escalateMutation, isConnecting]);

  const createTicket = useCallback(async (subject: string, category?: string) => {
    if (!conversation?.id) return null;
    return await createTicketMutation.mutateAsync({ conversationId: conversation.id, subject, category });
  }, [conversation?.id, createTicketMutation]);

  const resetChat = useCallback(async () => {
    if (conversation?.id && !isClosed) {
      await supabase.from("support_conversations").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", conversation.id);
    }
    queryClient.invalidateQueries({ queryKey: ["active-conversation"] });
  }, [conversation?.id, isClosed, queryClient]);

  return { 
    conversation, 
    messages, 
    isLoading: conversationLoading || messagesLoading, 
    isSending, 
    isConnecting, 
    isEscalated, 
    isHumanActive, 
    isClosed, 
    hasTicket,
    showEscalationOption,
    sendMessage, 
    connectToAgent, 
    createTicket,
    resetChat 
  };
}

// ==================== Ticket Hooks ====================

export function useConversationTicket(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversation-ticket", conversationId],
    queryFn: async (): Promise<SupportTicket | null> => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("conversation_id", conversationId)
        .maybeSingle();

      if (error) throw error;
      return data as SupportTicket | null;
    },
    enabled: !!conversationId,
  });
}

export function useSupportTickets() {
  const { data: business } = useBusiness();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["support-tickets", business?.id, user?.id],
    queryFn: async (): Promise<SupportTicket[]> => {
      if (!business?.id || !user?.id) return [];

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as SupportTicket[];
    },
    enabled: !!business?.id && !!user?.id,
  });
}

// ==================== Admin Hooks ====================

export function useAdminConversations() {
  const { data: superAdminData } = useSuperAdmin();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: async (): Promise<SupportConversation[]> => {
      const { data, error } = await supabase.from("support_conversations").select("*, businesses:business_id(trading_name)").order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(conv => ({ ...conv, business: conv.businesses as { trading_name: string } | undefined })) as SupportConversation[];
    },
    enabled: !!superAdminData?.isSuperAdmin,
  });

  useEffect(() => {
    if (!superAdminData?.isSuperAdmin) return;
    const channel = supabase.channel("admin-conversations").on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () => {
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [superAdminData?.isSuperAdmin, queryClient]);

  return query;
}

export function useTakeConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("admin_profiles").select("display_name").eq("user_id", user.id).maybeSingle();

      await supabase.from("support_conversations").update({ status: "human_active", assigned_admin_id: user.id, assigned_admin_name: profile?.display_name || "Support Agent" }).eq("id", conversationId);
      await supabase.from("support_chat_messages").insert({ conversation_id: conversationId, sender_type: "ai" as const, sender_name: "System", message: `${profile?.display_name || "A support agent"} has joined the conversation.` });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-conversations"] }); },
  });
}

export function useAdminSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { conversationId: string; message: string }): Promise<SupportChatMessage> => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data: profile } = await supabase.from("admin_profiles").select("display_name").eq("user_id", user.id).maybeSingle();

      const { data: msg, error } = await supabase.from("support_chat_messages").insert({
        conversation_id: data.conversationId,
        sender_type: "super_admin" as const,
        sender_id: user.id,
        sender_name: profile?.display_name || "Support Agent",
        message: data.message,
      }).select().single();

      if (error) throw error;
      await supabase.from("support_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", data.conversationId);
      return msg as SupportChatMessage;
    },
    onSuccess: (msg) => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", msg.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
    },
  });
}

export function useAdminCloseConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { conversationId: string; resolutionNotes?: string }): Promise<void> => {
      if (!user?.id) throw new Error("Not authenticated");
      
      // Update conversation
      await supabase.from("support_conversations").update({ 
        status: "closed", 
        closed_at: new Date().toISOString(), 
        closed_by: user.id 
      }).eq("id", data.conversationId);

      // Also close any linked ticket
      const { data: conv } = await supabase
        .from("support_conversations")
        .select("ticket_id")
        .eq("id", data.conversationId)
        .single();

      if (conv?.ticket_id) {
        await supabase.from("support_tickets").update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
          resolution_notes: data.resolutionNotes,
        }).eq("id", conv.ticket_id);
      }

      await supabase.from("support_chat_messages").insert({ 
        conversation_id: data.conversationId, 
        sender_type: "ai" as const, 
        sender_name: "System", 
        message: data.resolutionNotes ? `Conversation closed. Notes: ${data.resolutionNotes}` : "Conversation has been closed." 
      });
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] }); 
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] }); 
    },
  });
}

// ==================== Legacy Compatibility ====================

export interface SupportMessage { 
  id: string; 
  ticket_id: string; 
  sender_id: string; 
  sender_type: "user" | "support" | "system" | "ai"; 
  message: string; 
  is_read: boolean; 
  created_at: string; 
}

export interface LiveChatMessage { 
  id: string; 
  role: "user" | "assistant"; 
  content: string; 
  timestamp: Date; 
}

export function useSupportMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ["support-messages", ticketId],
    queryFn: async (): Promise<SupportMessage[]> => {
      if (!ticketId) return [];

      // Get ticket's conversation_id first
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select("conversation_id")
        .eq("id", ticketId)
        .single();

      if (!ticket?.conversation_id) {
        // Fall back to legacy support_messages table
        const { data, error } = await supabase
          .from("support_messages")
          .select("*")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        return (data || []) as SupportMessage[];
      }

      // Get messages from the linked conversation
      const { data: chatMessages, error } = await supabase
        .from("support_chat_messages")
        .select("*")
        .eq("conversation_id", ticket.conversation_id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Map to legacy format
      return (chatMessages || []).map((m: SupportChatMessage) => ({
        id: m.id,
        ticket_id: ticketId,
        sender_id: m.sender_id || "",
        sender_type: m.sender_type === "client_admin" ? "user" : m.sender_type === "super_admin" ? "support" : m.sender_type,
        message: m.message,
        is_read: !!m.read_at,
        created_at: m.created_at,
      })) as SupportMessage[];
    },
    enabled: !!ticketId,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  const { data: business } = useBusiness();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { subject: string; description: string; category: string }): Promise<SupportTicket> => {
      if (!business?.id || !user?.id) throw new Error("Not authenticated");

      const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          ticket_number: ticketNumber,
          business_id: business.id,
          submitted_by_user_id: user.id,
          submitted_by_email: user.email || "",
          submitted_by_name: business.owner_name || user.email || "User",
          subject: data.subject,
          description: data.description,
          category: data.category,
          priority: "medium",
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;
      return ticket as SupportTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useSendSupportMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { ticketId: string; message: string }): Promise<SupportMessage> => {
      if (!user?.id) throw new Error("Not authenticated");

      // Check if ticket has conversation_id
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select("conversation_id")
        .eq("id", data.ticketId)
        .single();

      if (ticket?.conversation_id) {
        // Send to conversation
        const { data: msg, error } = await supabase
          .from("support_chat_messages")
          .insert({
            conversation_id: ticket.conversation_id,
            sender_type: "client_admin" as const,
            sender_id: user.id,
            sender_name: user.email || "User",
            message: data.message,
          })
          .select()
          .single();

        if (error) throw error;

        return {
          id: msg.id,
          ticket_id: data.ticketId,
          sender_id: user.id,
          sender_type: "user",
          message: data.message,
          is_read: false,
          created_at: msg.created_at,
        } as SupportMessage;
      }

      // Legacy: send to support_messages table
      const { data: msg, error } = await supabase
        .from("support_messages")
        .insert({
          ticket_id: data.ticketId,
          sender_id: user.id,
          sender_type: "user",
          message: data.message,
        })
        .select()
        .single();

      if (error) throw error;
      return msg as SupportMessage;
    },
    onSuccess: (msg) => {
      queryClient.invalidateQueries({ queryKey: ["support-messages", msg.ticket_id] });
    },
  });
}
