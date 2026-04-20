import { useState } from "react";
import { AppSidebar } from "./DynamicSidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";
import { useBranchContext } from "@/contexts/BranchContext";
import { BranchSelectorModal } from "./BranchSelectorModal";
import { SupportChatWidget } from "@/components/support/SupportChatWidget";
import { SubscriptionExpiryBanner } from "@/components/subscription/SubscriptionExpiryBanner";
import { FeatureStatusBanner } from "@/components/platform/FeatureStatusBanner";
import { FeatureProtectedRoute } from "@/components/auth/FeatureProtectedRoute";
import { GlobalSubscriptionEnforcement } from "@/components/subscription/GlobalSubscriptionEnforcement";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { showBranchSelector, setShowBranchSelector, accessibleBranches } = useBranchContext();
  const { data: permissionsData } = useCurrentUserPermissions();
  
  // Check if user can access support chat
  const canAccessSupportChat = permissionsData?.isOwner || permissionsData?.permissions?.includes('support.chat.access');

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Branch selector modal for multi-branch staff */}
      <BranchSelectorModal
        open={showBranchSelector && accessibleBranches.length > 1}
        onOpenChange={setShowBranchSelector}
        title="Select Your Branch"
        description="You have access to multiple branches. Choose which one to work in."
      />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile by default */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:relative md:z-auto",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Real-time feature status banner - shows when current route's feature is disabled */}
        <FeatureStatusBanner />
        <SubscriptionExpiryBanner />
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
        {/* Global subscription enforcement wraps all content */}
        <GlobalSubscriptionEnforcement>
          {/* Feature protection for real-time gating */}
          <FeatureProtectedRoute>
            <main className="flex-1 overflow-y-auto">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </main>
          </FeatureProtectedRoute>
        </GlobalSubscriptionEnforcement>
      </div>

      {/* Support Chat Widget - only show if permitted */}
      {canAccessSupportChat && <SupportChatWidget />}
    </div>
  );
}
