import { usePlatformFeatures } from "@/hooks/usePlatformFeatures";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Map routes to their required feature keys
const ROUTE_FEATURE_MAP: Record<string, string> = {
  "/dashboard/gas": "gas_module",
  "/gas": "gas_module",
  "/dashboard/inventory": "stock.in_out",
  "/dashboard/crm": "customers.list",
  "/dashboard/customers": "customers.list",
  "/dashboard/expenses": "expenses.recording",
  "/dashboard/accounting": "accounting.sales_summary",
  "/dashboard/reports": "insights.daily_snapshot",
  "/dashboard/approvals": "approvals.stock",
  "/dashboard/activity": "activity.sales_stock",
  "/dashboard/staff": "team.basic_accounts",
  "/dashboard/hrm": "team.advanced_roles",
  "/pos": "sales.create",
  "/sales": "sales.create",
};

/**
 * FeatureStatusBanner - Global banner that appears when the current route's feature is disabled
 * Should be placed in the main layout to catch real-time feature disabling
 */
export function FeatureStatusBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: features = [] } = usePlatformFeatures();
  const [dismissed, setDismissed] = useState(false);
  const [disabledFeature, setDisabledFeature] = useState<string | null>(null);

  useEffect(() => {
    // Reset dismissed state when route changes
    setDismissed(false);
    setDisabledFeature(null);
  }, [location.pathname]);

  useEffect(() => {
    if (features.length === 0) return;

    // Check if current route requires a disabled feature
    for (const [routePrefix, featureKey] of Object.entries(ROUTE_FEATURE_MAP)) {
      if (location.pathname.startsWith(routePrefix)) {
        const feature = features.find((f) => f.feature_key === featureKey);
        if (feature && !feature.is_enabled) {
          setDisabledFeature(feature.feature_name);
          return;
        }
      }
    }
    setDisabledFeature(null);
  }, [features, location.pathname]);

  if (!disabledFeature || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-medium">Feature Disabled: </span>
            <span>
              <strong>{disabledFeature}</strong> has been disabled by Super Admin.
              You may not be able to use this section.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive-foreground hover:bg-destructive/80"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
