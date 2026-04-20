import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import {
  useAssignedBRM,
  useBRMConversation,
  useBRMMessages,
  useSendBRMMessage,
  useMarkBRMMessagesRead,
} from "@/hooks/useBRM";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

interface BRMChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const BRMChat = ({ isOpen, onClose }: BRMChatProps) => {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { data: brm, isLoading: brmLoading } = useAssignedBRM();
  const { 
    data: conversation, 
    isLoading: convLoading, 
    createConversation 
  } = useBRMConversation();
  const { data: messages = [], isLoading: messagesLoading } = useBRMMessages(
    conversation?.id ?? null
  );
  const sendMessage = useSendBRMMessage();
  const markRead = useMarkBRMMessagesRead();

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`brm-messages-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "brm_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ["brm-messages", conversation.id] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, queryClient]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (isOpen && conversation?.id && conversation.unread_client > 0) {
      markRead.mutate(conversation.id);
    }
  }, [isOpen, conversation?.id, conversation?.unread_client]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user?.id) return;

    let activeConversation = conversation;

    // Create conversation if it doesn't exist
    if (!activeConversation) {
      try {
        activeConversation = await createConversation.mutateAsync();
      } catch (error) {
        console.error("Failed to create conversation:", error);
        return;
      }
    }

    if (!activeConversation?.id) return;

    sendMessage.mutate(
      {
        conversationId: activeConversation.id,
        message: newMessage.trim(),
        senderId: user.id,
        senderType: "client_admin",
      },
      {
        onSuccess: () => {
          setNewMessage("");
        },
      }
    );
  };

  if (!isOpen) return null;

  const isLoading = brmLoading || convLoading;

  return (
    <Card className="fixed bottom-0 right-0 md:bottom-4 md:right-4 w-full md:w-96 h-[100dvh] md:h-[500px] z-50 flex flex-col shadow-lg border-2 md:rounded-lg rounded-none">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">
            {brm ? `Chat with ${brm.first_name}` : "BRM Chat"}
          </CardTitle>
          {conversation?.unread_client > 0 && (
            <Badge variant="destructive" className="ml-2">
              {conversation.unread_client}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-2/3" />
          </div>
        ) : !brm ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-muted-foreground text-center text-sm">
              No relationship manager assigned yet.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-center text-sm">
                    Start a conversation with your relationship manager.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_type === "client_admin";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm break-words">{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {format(new Date(msg.created_at), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sendMessage.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() || sendMessage.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BRMChat;
