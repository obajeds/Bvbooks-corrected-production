import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Plus, ArrowLeft, Clock, CheckCircle, Bot, User, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupportTickets, useSupportMessages, useCreateSupportTicket, useSendSupportMessage, useLiveChat, type SupportTicket } from "@/hooks/useSupportChat";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { supportTicketSchema, sanitizeText } from "@/lib/validation";

type View = "list" | "chat" | "new" | "live";

// Plans that have access to support
const SUPPORT_ENABLED_PLANS = ["professional", "enterprise"];

export function SupportChatWidget() {
  const { user } = useAuth();
  const { data: business, isLoading: businessLoading } = useBusiness();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>("live");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [message, setMessage] = useState("");
  const [newTicket, setNewTicket] = useState({ subject: "", description: "", category: "general" });

  const { data: tickets = [], isLoading: ticketsLoading } = useSupportTickets();
  const { data: ticketMessages = [] } = useSupportMessages(selectedTicket?.id || null);
  const createTicket = useCreateSupportTicket();
  const sendTicketMessage = useSendSupportMessage();
  const liveChat = useLiveChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const liveChatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ticketMessages]);
  useEffect(() => { liveChatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [liveChat.messages]);

  // Don't show widget if user is not logged in
  if (!user) return null;

  // Don't show widget while loading business data
  if (businessLoading) return null;

  // Only show support for Professional and Enterprise plans
  const currentPlan = business?.current_plan?.toLowerCase();
  if (!currentPlan || !SUPPORT_ENABLED_PLANS.includes(currentPlan)) {
    return null;
  }

  const openTickets = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const hasUnread = openTickets.length > 0;

  const handleOpenTicket = (ticket: SupportTicket) => { setSelectedTicket(ticket); setView("chat"); };

  const handleSendTicketMessage = async () => {
    if (!message.trim() || !selectedTicket) return;
    const sanitizedMessage = sanitizeText(message);
    if (!sanitizedMessage) return;
    try { await sendTicketMessage.mutateAsync({ ticketId: selectedTicket.id, message: sanitizedMessage }); setMessage(""); } catch { toast.error("Failed to send message"); }
  };

  const handleSendLiveMessage = async () => {
    if (!message.trim()) return;
    const sanitizedMsg = sanitizeText(message);
    if (!sanitizedMsg) return;
    setMessage("");
    await liveChat.sendMessage(sanitizedMsg);
  };

  const handleConnectToAgent = async () => {
    await liveChat.connectToAgent();
    toast.success("Escalated to human support", { description: "An agent will respond shortly." });
  };

  const handleCreateTicket = async () => {
    // Validate with Zod
    const validation = supportTicketSchema.safeParse(newTicket);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }
    
    try {
      const ticket = await createTicket.mutateAsync({
        subject: validation.data.subject,
        description: validation.data.description,
        category: validation.data.category,
      });
      toast.success("Support ticket created");
      setNewTicket({ subject: "", description: "", category: "general" });
      setSelectedTicket(ticket);
      setView("chat");
    } catch { toast.error("Failed to create ticket"); }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Open</Badge>;
      case "in_progress": return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">In Progress</Badge>;
      case "resolved": return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Resolved</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(!isOpen)} className={cn("fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg", "bg-primary hover:bg-primary/90 text-primary-foreground", "md:h-12 md:w-auto md:px-4 md:rounded-full", "lg:right-[300px]")}>
        {isOpen ? <X size={24} /> : (
          <>
            <MessageCircle size={24} className="md:mr-2" />
            <span className="hidden md:inline">Support</span>
            {hasUnread && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-white font-bold md:hidden">{openTickets.length}</span>}
          </>
        )}
      </Button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 lg:right-[300px] z-50 w-[360px] max-h-[500px] rounded-xl shadow-2xl border bg-card overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-primary text-primary-foreground p-4 flex items-center gap-3">
            {view !== "list" && <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => { setView("list"); setSelectedTicket(null); }}><ArrowLeft size={18} /></Button>}
            <div className="flex-1">
              <h3 className="font-semibold flex items-center gap-2">
                {view === "list" && "Support"}
                {view === "new" && "New Ticket"}
                {view === "chat" && selectedTicket?.ticket_number}
                {view === "live" && (<><Bot size={18} />Live Chat</>)}
              </h3>
              {view === "chat" && selectedTicket && <p className="text-xs text-primary-foreground/70 truncate">{selectedTicket.subject}</p>}
              {view === "live" && <p className="text-xs text-primary-foreground/70">{liveChat.isHumanActive ? "Connected to agent" : liveChat.isEscalated ? "Waiting for agent..." : "AI-powered assistant"}</p>}
            </div>
            {view === "list" && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setView("live")} title="Start live chat"><Bot size={18} /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setView("new")} title="Create ticket"><Plus size={18} /></Button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {/* Ticket List */}
            {view === "list" && (
              <ScrollArea className="h-[380px]">
                <div className="p-3 border-b bg-muted/30">
                  <Button className="w-full" variant="outline" onClick={() => setView("live")}><Bot size={16} className="mr-2" />{liveChat.messages.length > 0 ? "Continue Live Chat" : "Start Live Chat"}</Button>
                </div>
                {ticketsLoading ? <div className="p-4 text-center text-muted-foreground">Loading...</div> : tickets.length === 0 ? (
                  <div className="p-8 text-center"><MessageCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" /><p className="text-muted-foreground text-sm mb-4">No support tickets yet</p><Button size="sm" onClick={() => setView("new")}><Plus size={16} className="mr-1" />New Ticket</Button></div>
                ) : (
                  <div className="divide-y">
                    {tickets.map((ticket) => (
                      <button key={ticket.id} className="w-full p-4 text-left hover:bg-muted/50 transition-colors" onClick={() => handleOpenTicket(ticket)}>
                        <div className="flex items-start justify-between gap-2 mb-1"><span className="font-medium text-sm truncate flex-1">{ticket.subject}</span>{getStatusBadge(ticket.status)}</div>
                        <p className="text-xs text-muted-foreground truncate mb-2">{ticket.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock size={12} /><span>{format(new Date(ticket.created_at), "MMM d, h:mm a")}</span><span className="text-muted-foreground/50">•</span><span>{ticket.ticket_number}</span></div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}

            {/* New Ticket Form */}
            {view === "new" && (
              <div className="p-4 space-y-4">
                <div className="space-y-2"><Label htmlFor="subject">Subject *</Label><Input id="subject" placeholder="Brief description of your issue" value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="category">Category</Label><Select value={newTicket.category} onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">General Inquiry</SelectItem><SelectItem value="technical">Technical Issue</SelectItem><SelectItem value="billing">Billing</SelectItem><SelectItem value="feature">Feature Request</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label htmlFor="description">Description *</Label><Textarea id="description" placeholder="Describe your issue in detail..." rows={4} value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} /></div>
                <Button className="w-full" onClick={handleCreateTicket} disabled={createTicket.isPending}>{createTicket.isPending ? "Creating..." : "Submit Ticket"}</Button>
              </div>
            )}

            {/* Ticket Chat View */}
            {view === "chat" && selectedTicket && (
              <div className="flex flex-col h-[380px]">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {ticketMessages.map((msg) => (
                      <div key={msg.id} className={cn("max-w-[85%] rounded-lg p-3", msg.sender_type === "user" ? "ml-auto bg-primary text-primary-foreground" : msg.sender_type === "system" ? "mx-auto text-center bg-muted text-muted-foreground text-xs py-2" : msg.sender_type === "ai" ? "bg-secondary" : "bg-muted")}>
                        {msg.sender_type !== "system" && <p className="text-sm">{msg.message}</p>}
                        {msg.sender_type === "system" && <p className="text-xs">{msg.message}</p>}
                        {msg.sender_type !== "system" && <p className={cn("text-[10px] mt-1", msg.sender_type === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>{format(new Date(msg.created_at), "h:mm a")}</p>}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" ? (
                  <div className="p-3 border-t flex gap-2">
                    <Input placeholder="Type a message..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendTicketMessage(); } }} />
                    <Button size="icon" onClick={handleSendTicketMessage} disabled={sendTicketMessage.isPending || !message.trim()}><Send size={18} /></Button>
                  </div>
                ) : (
                  <div className="p-3 border-t bg-muted/50 flex items-center justify-center gap-2 text-sm text-muted-foreground"><CheckCircle size={16} className="text-green-500" />This ticket has been resolved</div>
                )}
              </div>
            )}

            {/* Live Chat View */}
            {view === "live" && (
              <div className="flex flex-col h-[380px]">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {liveChat.messages.length === 0 && (
                      <div className="text-center py-8"><Bot className="h-12 w-12 mx-auto mb-3 text-primary/50" /><p className="text-sm text-muted-foreground mb-2">Hi! I'm your AI support assistant.</p><p className="text-xs text-muted-foreground">Ask me anything about BVBooks. I'll connect you to a human if needed.</p></div>
                    )}
                    {liveChat.messages.map((msg) => (
                      <div key={msg.id} className={cn("max-w-[85%] rounded-lg p-3", msg.sender_type === "client_admin" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
                        <div className="flex items-start gap-2">
                          {msg.sender_type !== "client_admin" && <Bot size={14} className="mt-0.5 shrink-0 text-primary" />}
                          <div className="flex-1">
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className={cn("text-[10px] mt-1", msg.sender_type === "client_admin" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                              {msg.sender_type === "super_admin" ? `${msg.sender_name} • ` : msg.sender_type === "ai" ? "AI • " : ""}
                              {format(new Date(msg.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {liveChat.isSending && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 size={14} className="animate-spin" /><span className="text-xs">AI is thinking...</span></div>}
                    <div ref={liveChatEndRef} />
                  </div>
                </ScrollArea>

                {/* Escalate Button - Only show when AI suggests or user requests */}
                {liveChat.isEscalated && !liveChat.isHumanActive && (
                  <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-center">
                    <p className="text-xs text-amber-600 mb-1">Waiting for a support agent...</p>
                  </div>
                )}
                {!liveChat.isEscalated && liveChat.showEscalationOption && (
                  <div className="px-4 py-2 border-t">
                    <Button variant="outline" size="sm" className="w-full" onClick={handleConnectToAgent} disabled={liveChat.isConnecting}><Phone size={14} className="mr-2" />{liveChat.isConnecting ? "Connecting..." : "Connect to Agent"}</Button>
                  </div>
                )}

                {/* Message Input */}
                {!liveChat.isClosed && (
                  <div className="p-3 border-t flex gap-2">
                    <Input placeholder="Type a message..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendLiveMessage(); } }} disabled={liveChat.isSending} />
                    <Button size="icon" onClick={handleSendLiveMessage} disabled={liveChat.isSending || !message.trim()}><Send size={18} /></Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
