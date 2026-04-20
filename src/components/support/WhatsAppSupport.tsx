import { MessageCircle, Lock, Crown, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBusinessPlan } from '@/hooks/useFeatureGating';
import { WHATSAPP_SUPPORT_CONFIG, hasEnterpriseFeature } from '@/lib/planFeatures';
import { Link } from 'react-router-dom';
import { useState } from 'react';

// Send WhatsApp message via API (Enterprise only - enforced on backend)
export async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { to, message }
    });
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    throw error;
  }
}

// Send WhatsApp template message via API (Enterprise only - enforced on backend)
export async function sendWhatsAppTemplate(to: string, templateName: string, templateParams?: string[]) {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { to, templateName, templateParams }
    });
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('WhatsApp template send error:', error);
    throw error;
  }
}

// Hook to check WhatsApp support access
export function useWhatsAppAccess() {
  const { data: planInfo, isLoading } = useBusinessPlan();
  const hasAccess = hasEnterpriseFeature(planInfo?.effectivePlan);
  
  return {
    hasAccess,
    isLoading,
    currentPlan: planInfo?.effectivePlan,
    config: WHATSAPP_SUPPORT_CONFIG,
  };
}

// Open WhatsApp chat (only for Enterprise users)
function openWhatsAppChat(customMessage?: string) {
  const message = encodeURIComponent(customMessage || WHATSAPP_SUPPORT_CONFIG.defaultMessage);
  const number = WHATSAPP_SUPPORT_CONFIG.number.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${number}?text=${message}`, '_blank');
}

// Floating WhatsApp button (only visible for Enterprise)
export function WhatsAppSupport() {
  const { hasAccess, isLoading } = useWhatsAppAccess();

  // Don't show floating button for non-Enterprise users
  if (isLoading || !hasAccess) return null;

  return (
    <Button
      onClick={() => openWhatsAppChat()}
      className="fixed bottom-6 right-24 z-50 h-14 w-14 rounded-full shadow-lg bg-[#25D366] hover:bg-[#20BA5C] text-white md:h-12 md:w-auto md:px-4 md:rounded-full"
    >
      <MessageCircle size={24} className="md:mr-2" />
      <span className="hidden md:inline">WhatsApp</span>
    </Button>
  );
}

// WhatsApp link component (for inline use)
export function WhatsAppSupportLink({ className }: { className?: string }) {
  const { hasAccess, isLoading } = useWhatsAppAccess();

  if (isLoading) {
    return (
      <span className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Loader2 size={16} className="animate-spin" />
        <span>Loading...</span>
      </span>
    );
  }

  if (!hasAccess) {
    return (
      <span className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Lock size={16} />
        <span>WhatsApp Support (Enterprise)</span>
      </span>
    );
  }

  return (
    <button
      onClick={() => openWhatsAppChat()}
      className={`flex items-center gap-2 text-[#25D366] hover:underline ${className}`}
    >
      <MessageCircle size={16} />
      <span>WhatsApp Support</span>
    </button>
  );
}

// WhatsApp support card for Help Center
interface WhatsAppSupportCardProps {
  className?: string;
}

export function WhatsAppSupportCard({ className }: WhatsAppSupportCardProps) {
  const { hasAccess, isLoading } = useWhatsAppAccess();
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenWhatsApp = () => {
    setIsOpening(true);
    openWhatsAppChat();
    // Reset after a short delay
    setTimeout(() => setIsOpening(false), 1000);
  };

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="py-6 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 animate-pulse" />
          <div className="h-5 w-32 bg-muted rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded mx-auto mb-4 animate-pulse" />
          <div className="h-10 w-40 bg-muted rounded mx-auto animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (hasAccess) {
    return (
      <Card className={`bg-[#25D366]/5 border-[#25D366]/20 hover:border-[#25D366]/40 transition-colors ${className}`}>
        <CardContent className="py-6 text-center">
          <div className="h-12 w-12 rounded-full bg-[#25D366]/10 flex items-center justify-center mx-auto mb-4">
            <Phone className="h-6 w-6 text-[#25D366]" />
          </div>
          <h4 className="font-semibold mb-2">WhatsApp Support</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Chat with us instantly on WhatsApp
          </p>
          <Button 
            className="bg-[#25D366] hover:bg-[#20BA5C] text-white"
            onClick={handleOpenWhatsApp}
            disabled={isOpening}
          >
            {isOpening ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4 mr-2" />
            )}
            Chat on WhatsApp
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Locked state for non-Enterprise users
  return (
    <Card className={`bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 ${className}`}>
      <CardContent className="py-6 text-center">
        <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <h4 className="font-semibold mb-2">WhatsApp Support</h4>
        <p className="text-sm text-muted-foreground mb-2">
          {WHATSAPP_SUPPORT_CONFIG.lockMessage}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {WHATSAPP_SUPPORT_CONFIG.featureDescription}
        </p>
        <Button variant="outline" asChild>
          <Link to="/dashboard/subscription">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Enterprise
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}