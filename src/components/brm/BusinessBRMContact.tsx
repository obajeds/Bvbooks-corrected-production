import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Loader2, Phone } from "lucide-react";
import { useClientBRM } from "@/hooks/useClientBRM";

interface BusinessBRMContactProps {
  businessId: string;
  businessName?: string;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

const BusinessBRMContact = ({ businessId, businessName = "BVBooks" }: BusinessBRMContactProps) => {
  const { data: brm, isLoading, error } = useClientBRM(businessId);

  // Show loading spinner
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Hide component entirely if no BRM assigned or error
  if (error || !brm) {
    return null;
  }

  const whatsappMessage = encodeURIComponent(`Hi, I'm contacting you from ${businessName}`);
  const contactNumber = (brm.whatsapp_number || brm.phone)?.replace(/[^0-9]/g, '') || '';
  const whatsappUrl = contactNumber ? `https://wa.me/${contactNumber}?text=${whatsappMessage}` : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          Your Relationship Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {/* Avatar placeholder */}
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold">
              {brm.first_name} {brm.last_name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs font-mono">
                {brm.staff_id}
              </Badge>
              {brm.phone && (
                <Badge variant="outline" className="text-xs">
                  {brm.phone}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {contactNumber && (
            <Button 
              asChild
              variant="outline"
              className="w-full font-medium"
            >
              <a 
                href={`tel:${contactNumber}`}
                className="flex items-center justify-center gap-2"
              >
                <Phone className="h-5 w-5" />
                Call {brm.phone || brm.whatsapp_number}
              </a>
            </Button>
          )}
          
          {whatsappUrl ? (
            <Button 
              asChild
              className="w-full text-white font-medium bg-[#25D366] hover:bg-[#128C7E]"
            >
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Chat on WhatsApp
              </a>
            </Button>
          ) : !contactNumber && (
            <p className="text-sm text-muted-foreground text-center">
              Contact not available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessBRMContact;
