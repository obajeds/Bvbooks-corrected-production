import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Send,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  User,
  Building2,
  Bot,
  Loader2,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import {
  useAdminConversations,
  useAdminSendMessage,
  useConversationMessages,
  useTakeConversation,
  useAdminCloseConversation,
  type SupportConversation,
  type ConversationStatus,
} from "@/hooks/useSupportChat";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function SuperAdminSupportPanel() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading, refetch } = useAdminConversations();
  const { data: messages = [] } = useConversationMessages(selectedConversation?.id || null);
  const sendMessage = useAdminSendMessage();
  const takeConversation = useTakeConversation();
  const closeConversation = useAdminCloseConversation();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      conv.client_email.toLowerCase().includes(search) ||
      conv.client_name.toLowerCase().includes(search) ||
      conv.subject?.toLowerCase().includes(search) ||
      conv.business?.trading_name?.toLowerCase().includes(search)
    );
  });

  const escalatedConversations = filteredConversations.filter(c => c.status === "escalated");
  const activeConversations = filteredConversations.filter(c => c.status === "human_active");
  const aiOnlyConversations = filteredConversations.filter(c => c.status === "ai_only");
  const closedConversations = filteredConversations.filter(c => c.status === "closed");

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversation) return;

    try {
      await sendMessage.mutateAsync({
        conversationId: selectedConversation.id,
        message: message.trim(),
      });
      setMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const handleTakeConversation = async () => {
    if (!selectedConversation || !user?.id) return;

    try {
      await takeConversation.mutateAsync(selectedConversation.id);
      // Update local state with correct admin info
      setSelectedConversation(prev => prev ? { 
        ...prev, 
        status: "human_active", 
        assigned_admin_id: user.id,
        assigned_admin_name: user.email || "Support Agent"
      } : null);
      toast.success("You've taken this conversation");
    } catch (error) {
      toast.error("Failed to take conversation");
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation) return;

    try {
      await closeConversation.mutateAsync({ conversationId: selectedConversation.id });
      setSelectedConversation(null);
      toast.success("Conversation closed");
    } catch (error) {
      toast.error("Failed to close conversation");
    }
  };

  const getStatusBadge = (status: ConversationStatus) => {
    switch (status) {
      case "escalated":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Escalated</Badge>;
      case "human_active":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Active</Badge>;
      case "ai_only":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">AI Only</Badge>;
      case "closed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Closed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const canReply = selectedConversation?.status === "human_active" && 
    selectedConversation?.assigned_admin_id === user?.id;

  const needsTakeOver = selectedConversation?.status === "escalated" || 
    (selectedConversation?.status === "human_active" && selectedConversation?.assigned_admin_id !== user?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            Support Conversations
          </h2>
          <p className="text-muted-foreground">
            Manage and respond to client support requests
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Escalated (Needs Action)</CardDescription>
            <CardTitle className="text-3xl text-amber-500">{escalatedConversations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active (Human)</CardDescription>
            <CardTitle className="text-3xl">{activeConversations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI Only</CardDescription>
            <CardTitle className="text-3xl">{aiOnlyConversations.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Closed Today</CardDescription>
            <CardTitle className="text-3xl">
              {closedConversations.filter(c => {
                const today = new Date();
                const closed = new Date(c.closed_at || c.updated_at);
                return closed.toDateString() === today.toDateString();
              }).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, subject, or business..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No conversations found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Last Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConversations.map((conv) => (
                    <TableRow 
                      key={conv.id}
                      className={cn(conv.status === "escalated" && "bg-amber-500/5")}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium truncate max-w-[120px]">{conv.client_name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{conv.client_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[150px]">
                            {conv.business?.trading_name || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px] truncate" title={conv.subject || "General Inquiry"}>
                          {conv.subject || "General Inquiry"}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(conv.status)}</TableCell>
                      <TableCell className="text-sm">
                        {conv.assigned_admin_name || <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {conv.last_message_at 
                          ? format(new Date(conv.last_message_at), "MMM d, h:mm a")
                          : format(new Date(conv.created_at), "MMM d, h:mm a")
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={conv.status === "escalated" ? "default" : "outline"}
                          onClick={() => setSelectedConversation(conv)}
                        >
                          {conv.status === "escalated" && <AlertCircle className="h-4 w-4 mr-1" />}
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {conv.status === "escalated" ? "Respond" : "View"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {selectedConversation?.client_name}
                  {selectedConversation && getStatusBadge(selectedConversation.status)}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedConversation?.subject || "General Inquiry"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation?.client_email} • {selectedConversation?.business?.trading_name}
                </p>
                {selectedConversation?.escalation_reason && (
                  <p className="text-xs text-amber-500 mt-1">
                    Escalation: {selectedConversation.escalation_reason}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {needsTakeOver && selectedConversation?.status !== "closed" && (
                  <Button
                    size="sm"
                    onClick={handleTakeConversation}
                    disabled={takeConversation.isPending}
                  >
                    {takeConversation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-1" />
                    )}
                    Take Conversation
                  </Button>
                )}
                {selectedConversation?.status !== "closed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCloseConversation}
                    disabled={closeConversation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Close
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] rounded-lg p-3",
                    msg.sender_type === "super_admin"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : msg.sender_name === "System"
                      ? "mx-auto text-center bg-muted text-muted-foreground text-xs py-2"
                      : msg.sender_type === "ai"
                      ? "bg-secondary"
                      : "bg-muted"
                  )}
                >
                  {msg.sender_name !== "System" && (
                    <div className="flex items-start gap-2">
                      {msg.sender_type === "ai" && (
                        <Bot size={14} className="mt-0.5 shrink-0 text-primary" />
                      )}
                      {msg.sender_type === "client_admin" && (
                        <User size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            msg.sender_type === "super_admin"
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {msg.sender_type === "super_admin" ? `${msg.sender_name} • ` : 
                           msg.sender_type === "ai" ? "BVBooks AI • " : 
                           msg.sender_type === "client_admin" ? "Client • " : ""}
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}
                  {msg.sender_name === "System" && (
                    <p className="text-xs">{msg.message}</p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          {selectedConversation?.status !== "closed" ? (
            <div className="p-4 border-t">
              {canReply ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your response..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={sendMessage.isPending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sendMessage.isPending || !message.trim()}
                  >
                    {sendMessage.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                  <AlertCircle size={16} />
                  {selectedConversation?.status === "escalated" 
                    ? "Take this conversation to respond" 
                    : selectedConversation?.assigned_admin_id 
                    ? `Assigned to ${selectedConversation.assigned_admin_name}`
                    : "This conversation is handled by AI"
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border-t bg-muted/50 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle size={16} className="text-green-500" />
              This conversation has been closed
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
