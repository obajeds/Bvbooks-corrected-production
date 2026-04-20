import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useBranchContext } from "@/contexts/BranchContext";
import { useBusiness } from "@/hooks/useBusiness";
import { useMobileNavigation } from "@/hooks/useMobileNavigation";
import { BranchSelectorModal } from "./BranchSelectorModal";
import { SupportChatWidget } from "@/components/support/SupportChatWidget";
import { ExperienceSwitcherCompact } from "@/components/settings/ExperienceSwitcher";
import { 
  Menu,
  X,
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBusinessNotifications } from "@/hooks/useBusinessNotifications";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import bvbooksLogo from "@/assets/bvbooks-logo.jpeg";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MobileNavCategory } from "@/hooks/useMobileNavigation";

interface MobileLayoutProps {
  children: React.ReactNode;
}

interface MobileCategoryItemProps {
  category: MobileNavCategory;
  isActiveRoute: (path: string) => boolean;
  expandedCategories: Set<string>;
  toggleCategory: (id: string) => void;
  onClose: () => void;
}

/**
 * Reusable mobile category item component
 * Renders either a direct link or collapsible section based on item count
 */
function MobileCategoryItem({ 
  category, 
  isActiveRoute, 
  expandedCategories, 
  toggleCategory, 
  onClose 
}: MobileCategoryItemProps) {
  if (category.items.length === 1) {
    // Single item category - render as direct link
    return (
      <div key={category.id}>
        <Link
          to={category.items[0].path}
          onClick={onClose}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
            isActiveRoute(category.items[0].path)
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          <category.icon className="h-5 w-5" />
          <span className="flex-1">{category.label}</span>
          {category.badge && category.badge > 0 && (
            <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center p-0 text-xs">
              {category.badge > 9 ? "9+" : category.badge}
            </Badge>
          )}
        </Link>
      </div>
    );
  }

  // Multi-item category - collapsible
  return (
    <div key={category.id}>
      <Collapsible 
        open={expandedCategories.has(category.id)}
        onOpenChange={() => toggleCategory(category.id)}
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left",
              category.items.some(item => isActiveRoute(item.path))
                ? "bg-muted"
                : "hover:bg-muted"
            )}
          >
            <category.icon className="h-5 w-5" />
            <span className="flex-1">{category.label}</span>
            {category.badge && category.badge > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center p-0 text-xs mr-2">
                {category.badge > 9 ? "9+" : category.badge}
              </Badge>
            )}
            {expandedCategories.has(category.id) ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pl-4 mt-1 space-y-1">
            {category.items.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm",
                  isActiveRoute(item.path)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-4 flex items-center justify-center p-0 text-[10px]">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showMoreNav, setShowMoreNav] = useState(false);
  const location = useLocation();
  const { showBranchSelector, setShowBranchSelector, accessibleBranches, currentBranch } = useBranchContext();
  const { data: business } = useBusiness();
  const notificationsQuery = useBusinessNotifications();
  const notifications = notificationsQuery.data || [];
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const { data: permissionsData } = useCurrentUserPermissions();
  
  // Dynamic navigation from same source as desktop - now with priority-based grouping
  const { 
    primaryCategories, 
    secondaryCategories, 
    hiddenCategories,
    bottomNavItems, 
    isLoading 
  } = useMobileNavigation();
  
  // Permission checks
  const canViewSettings = permissionsData?.isOwner || permissionsData?.permissions?.includes('settings.view');
  const canAccessSupportChat = permissionsData?.isOwner || permissionsData?.permissions?.includes('support.chat.access');

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Branch selector modal for multi-branch staff */}
      <BranchSelectorModal
        open={showBranchSelector && accessibleBranches.length > 1}
        onOpenChange={setShowBranchSelector}
        title="Select Your Branch"
        description="You have access to multiple branches. Choose which one to work in."
      />

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          {business?.logo_url ? (
            <img 
              src={business.logo_url} 
              alt={business.trading_name} 
              className="h-7 w-7 rounded object-cover" 
            />
          ) : (
            <div className="h-7 w-7 rounded bg-muted flex items-center justify-center">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className="font-semibold text-sm truncate max-w-[120px]">
            {business?.trading_name || currentBranch?.name || "My Business"}
          </span>
        </div>

        <Link to="/mobile/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </Link>
      </header>

      {/* Slide-out Menu - Dynamic Categories */}
      {menuOpen && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-background shadow-xl animate-in slide-in-from-left overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
              <span className="font-bold text-lg">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <nav className="p-4 space-y-1">

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Primary categories (critical + high priority) */}
                  {primaryCategories.map((category) => (
                    <MobileCategoryItem
                      key={category.id}
                      category={category}
                      isActiveRoute={isActiveRoute}
                      expandedCategories={expandedCategories}
                      toggleCategory={toggleCategory}
                      onClose={() => setMenuOpen(false)}
                    />
                  ))}
                  
                  {/* Secondary categories (medium priority) - "More" section */}
                  {secondaryCategories.length > 0 && (
                    <>
                      <div className="pt-4 pb-2">
                        <Collapsible open={showMoreNav} onOpenChange={setShowMoreNav}>
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-3 px-4 py-2 w-full text-left text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="text-sm font-medium">More</span>
                              {showMoreNav ? (
                                <ChevronDown className="h-4 w-4 ml-auto" />
                              ) : (
                                <ChevronRight className="h-4 w-4 ml-auto" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-1 pt-1">
                              {secondaryCategories.map((category) => (
                                <MobileCategoryItem
                                  key={category.id}
                                  category={category}
                                  isActiveRoute={isActiveRoute}
                                  expandedCategories={expandedCategories}
                                  toggleCategory={toggleCategory}
                                  onClose={() => setMenuOpen(false)}
                                />
                              ))}
                              
                              {/* Hidden categories (low priority) inside More */}
                              {hiddenCategories.map((category) => (
                                <MobileCategoryItem
                                  key={category.id}
                                  category={category}
                                  isActiveRoute={isActiveRoute}
                                  expandedCategories={expandedCategories}
                                  toggleCategory={toggleCategory}
                                  onClose={() => setMenuOpen(false)}
                                />
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </>
                  )}
                </>
              )}
              
              {/* Experience Switcher */}
              <div className="border-t my-4" />
              <div className="px-2">
                <ExperienceSwitcherCompact />
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Bottom Navigation - Dynamic */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            bottomNavItems.map((item) => {
              const isActive = item.path === '/mobile' 
                ? location.pathname === '/mobile'
                : isActiveRoute(item.path);
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors min-w-[60px] min-h-[48px] touch-manipulation",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground active:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              );
            })
          )}
        </div>
      </nav>
      
      {/* Spacer for fixed bottom nav */}
      <div className="h-16" />

      {/* Support Chat Widget - only show if permitted */}
      {canAccessSupportChat && <SupportChatWidget />}
    </div>
  );
}
