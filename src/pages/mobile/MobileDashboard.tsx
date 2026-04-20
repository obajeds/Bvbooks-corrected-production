import { useBranchContext } from "@/contexts/BranchContext";
import { useInventoryHealth, useTotalSales, useRecentSales } from "@/hooks/useDashboardStats";
import { useBusiness } from "@/hooks/useBusiness";
import { useClientBRM } from "@/hooks/useClientBRM";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import { useMobileNavigation } from "@/hooks/useMobileNavigation";
import { Loader2, DollarSign, Package, AlertTriangle, MessageCircle } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Mobile-optimized dashboard view
 * Shows key metrics and quick actions in a touch-friendly layout
 * Quick actions are now dynamically filtered based on the same
 * feature toggle, plan, and permission system as the desktop sidebar.
 */
export default function MobileDashboard() {
  const { currentBranch } = useBranchContext();
  const { data: business } = useBusiness();
  const { data: inventoryHealth, isLoading: inventoryLoading } = useInventoryHealth();
  const { data: salesData, isLoading: salesLoading } = useTotalSales();
  const { data: recentSales, isLoading: recentLoading } = useRecentSales(5);
  const { data: brm } = useClientBRM(business?.id || null);
  const { data: permissionsData } = useCurrentUserPermissions();
  const { formatCurrency } = useCurrency();
  
  // Get dynamic quick actions from the same source as sidebar
  const { quickActions, isLoading: navLoading } = useMobileNavigation();
  
  // Check if user can contact BRM
  const canContactBRM = permissionsData?.isOwner || permissionsData?.permissions?.includes('support.brm.contact');

  const isLoading = inventoryLoading || salesLoading || navLoading;

  // WhatsApp BRM contact
  const whatsappMessage = encodeURIComponent(`Hi, I'm contacting you from ${business?.trading_name || 'BVBooks'}`);
  const contactNumber = (brm?.whatsapp_number || brm?.phone)?.replace(/[^0-9]/g, '') || '';
  const whatsappUrl = contactNumber ? `https://wa.me/${contactNumber}?text=${whatsappMessage}` : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {currentBranch?.name || "All Branches"}
        </p>
      </div>

      {/* Quick Actions - Dynamically filtered by feature access */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link key={action.id} to={action.path}>
              <Button 
                variant={action.variant || "outline"} 
                className="w-full h-14 text-base"
              >
                <action.icon className="h-5 w-5 mr-2" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* BRM Support Quick Action - only if permitted */}
      {canContactBRM && whatsappUrl && brm && (
        <a 
          href={whatsappUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="bg-[#25D366]/10 border-[#25D366]/30 hover:bg-[#25D366]/20 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#25D366] flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Need Help?</p>
                <p className="text-xs text-muted-foreground">
                  Chat with {brm.first_name} on WhatsApp
                </p>
              </div>
            </CardContent>
          </Card>
        </a>
      )}

      {/* Recent Sales */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Recent Sales</h2>
          <Link to="/mobile/sales" className="text-sm text-primary">
            View All
          </Link>
        </div>
        <Card>
          <CardContent className="p-0 divide-y">
            {recentLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : recentSales && recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={sale.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{sale.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.customer?.name || "Walk-in Customer"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(sale.total_amount)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{sale.payment_method}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No recent sales
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales & Inventory Stats - Moved below Recent Sales to hide from customer-facing displays */}
      <div className="grid grid-cols-2 gap-3">
        <MobileStatCard
          title="Today's Sales"
          value={formatCurrency(salesData?.today || 0)}
          icon={DollarSign}
          href="/mobile/sales"
          variant="primary"
        />
        <MobileStatCard
          title="Low Stock"
          value={String(inventoryHealth?.lowStock || 0)}
          icon={Package}
          href="/mobile/inventory"
          variant={inventoryHealth?.lowStock && inventoryHealth.lowStock > 5 ? "warning" : "default"}
        />
        <MobileStatCard
          title="Out of Stock"
          value={String(inventoryHealth?.outOfStock || 0)}
          icon={AlertTriangle}
          href="/mobile/inventory"
          variant={inventoryHealth?.outOfStock && inventoryHealth.outOfStock > 0 ? "danger" : "default"}
        />
      </div>
    </div>
  );
}

// Mobile-optimized stat card component
interface MobileStatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  href: string;
  variant?: "primary" | "warning" | "danger" | "default";
}

function MobileStatCard({ title, value, icon: Icon, href, variant = "default" }: MobileStatCardProps) {
  const variantStyles = {
    primary: "bg-gradient-to-br from-primary/15 to-primary/5 border-primary/20",
    warning: "bg-gradient-to-br from-orange-500/15 to-orange-500/5 border-orange-500/20",
    danger: "bg-gradient-to-br from-red-500/15 to-red-500/5 border-red-500/20",
    default: "bg-card",
  };

  return (
    <Link
      to={href}
      className={cn(
        "block rounded-xl border p-4 transition-all active:scale-95",
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
        <div className="rounded-full bg-background/50 p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}
