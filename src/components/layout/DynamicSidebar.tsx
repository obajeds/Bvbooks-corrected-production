import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronLeft, Menu, Building2, Fuel } from "lucide-react";
import { useDynamicSidebar, type ProcessedMenuSection, type ProcessedMenuItem } from "@/hooks/useDynamicSidebar";
import { useBusiness } from "@/hooks/useBusiness";
import { useGasModuleEnabled } from "@/hooks/useGasModuleEnabled";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import bvbooksLogo from "@/assets/bvbooks-logo.jpeg";

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  collapsed: boolean;
  badge?: number;
}

const NavItem = ({
  to,
  icon,
  label,
  isActive,
  collapsed,
  badge
}: NavItemProps) => (
  <Link 
    to={to} 
    className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
      isActive 
        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm" 
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      collapsed && "justify-center px-2"
    )}
  >
    <div className="relative">
      {icon}
      {badge && badge > 0 && collapsed && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 text-[8px] flex items-center justify-center text-white font-bold">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
    {!collapsed && (
      <span className="flex items-center gap-2 flex-1">
        {label}
        {badge && badge > 0 && (
          <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-auto">
            {badge}
          </span>
        )}
      </span>
    )}
  </Link>
);

interface CollapsibleNavProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collapsed: boolean;
  children: React.ReactNode;
  badge?: number;
}

const CollapsibleNav = ({
  label,
  icon,
  isActive,
  isOpen,
  onOpenChange,
  collapsed,
  children,
  badge
}: CollapsibleNavProps) => (
  <Collapsible open={isOpen} onOpenChange={onOpenChange}>
    <CollapsibleTrigger asChild>
      <button 
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
          isActive 
            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="relative">
          {icon}
          {badge && badge > 0 && collapsed && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-500 text-[8px] flex items-center justify-center text-white font-bold">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        {!collapsed && (
          <>
            <span className="flex-1 text-left flex items-center gap-2">
              {label}
              {badge && badge > 0 && (
                <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {badge}
                </span>
              )}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </>
        )}
      </button>
    </CollapsibleTrigger>
    {!collapsed && (
      <CollapsibleContent className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-4">
        {children}
      </CollapsibleContent>
    )}
  </Collapsible>
);

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onClose?: () => void;
}

export function AppSidebar({
  collapsed,
  onToggle,
  onClose
}: AppSidebarProps) {
  const location = useLocation();
  const { menu, isLoading } = useDynamicSidebar();
  const { data: business } = useBusiness();
  const { data: gasModuleEnabled = false } = useGasModuleEnabled();

  // Track open state for each collapsible section
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

   // Stable key representing menu structure (avoids re-running effect on every menu reference change)
   const menuKey = menu.map(s => s.id + ':' + s.items.map(i => i.path).join(',')).join('|');

   // Initialize open states based on current location
   useEffect(() => {
     const newOpenStates: Record<string, boolean> = {};
     
     for (const section of menu) {
       if (!section.isDirectLink && section.items.length > 0) {
         // Check if any child item matches current path
         const hasActiveChild = section.items.some(item => 
           location.pathname === item.path || location.pathname.startsWith(item.path + '/')
         );
         newOpenStates[section.id] = hasActiveChild;
       }
     }
     
     setOpenSections(prev => {
       // Only update if something actually changed to avoid unnecessary re-renders
       const changed = Object.keys(newOpenStates).some(k => prev[k] !== newOpenStates[k]);
       if (!changed) return prev;
       return { ...prev, ...newOpenStates };
     });
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [location.pathname, menuKey]);

  const toggleSection = (sectionId: string, open: boolean) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: open }));
  };

  const isActive = (path: string) => location.pathname === path;
  const isActivePrefix = (prefix: string) => location.pathname.startsWith(prefix);

  // Check if a section has any active items
  const isSectionActive = (section: ProcessedMenuSection): boolean => {
    if (section.isDirectLink && section.path) {
      return isActive(section.path) || (section.path !== '/dashboard' && isActivePrefix(section.path));
    }
    return section.items.some(item => 
      isActive(item.path) || isActivePrefix(item.path + '/')
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div 
        className={cn("flex h-screen flex-col text-sidebar-foreground transition-all duration-300", collapsed ? "w-16" : "w-64")}
        style={{ backgroundColor: 'hsl(222 47% 11%)' }}
      >
        <div className="flex h-16 items-center justify-center border-b border-sidebar-border px-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          {!collapsed && <Skeleton className="h-4 w-24 ml-3" />}
        </div>
        <div className="flex-1 p-3 space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Check if we have any gas-related items in operations
  const hasGasItems = gasModuleEnabled && menu.some(s => 
    s.id === 'operations' && s.items.some(i => i.id.startsWith('gas-'))
  );

  return (
    <div 
      className={cn("flex h-screen flex-col text-sidebar-foreground transition-all duration-300", collapsed ? "w-16" : "w-64")} 
      style={{ backgroundColor: 'hsl(222 47% 11%)' }}
    >
      {/* Header - Business Logo & Name */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {business?.logo_url ? (
              <img 
                src={business.logo_url} 
                alt={business.trading_name} 
                className="h-10 w-10 rounded-lg object-cover flex-shrink-0" 
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-sidebar-foreground" />
              </div>
            )}
            <span className="font-semibold text-sm truncate">
              {business?.trading_name || "My Business"}
            </span>
          </div>
        )}
        {collapsed && (
          business?.logo_url ? (
            <img 
              src={business.logo_url} 
              alt={business?.trading_name || "Business"} 
              className="h-8 w-8 object-cover rounded" 
            />
          ) : (
            <div className="h-8 w-8 rounded bg-sidebar-accent flex items-center justify-center">
              <Building2 className="h-4 w-4 text-sidebar-foreground" />
            </div>
          )
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggle} 
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation - Dynamically generated */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menu.map((section) => {
          // Render divider if needed
          const divider = section.dividerBefore && (
            <div key={`divider-${section.id}`} className="my-4 border-t border-sidebar-border" />
          );

          // Direct link sections
          if (section.isDirectLink && section.path) {
            const Icon = section.icon;
            return (
              <div key={section.id}>
                {divider}
                <NavItem
                  to={section.path}
                  icon={<Icon className="h-4 w-4" />}
                  label={section.label}
                  isActive={isSectionActive(section)}
                  collapsed={collapsed}
                  badge={section.badge}
                />
              </div>
            );
          }

          // Collapsible sections
          const Icon = section.icon;
          const sectionActive = isSectionActive(section);

          // Separate gas items from regular items for Operations section
          const regularItems = section.items.filter(i => !i.id.startsWith('gas-'));
          const gasItems = section.items.filter(i => i.id.startsWith('gas-'));

          return (
            <div key={section.id}>
              {divider}
              <CollapsibleNav
                label={section.label}
                icon={<Icon className="h-4 w-4" />}
                isActive={sectionActive}
                isOpen={openSections[section.id] || false}
                onOpenChange={(open) => toggleSection(section.id, open)}
                collapsed={collapsed}
                badge={section.badge}
              >
                {/* Regular items */}
                {regularItems.map(item => {
                  const ItemIcon = item.icon;
                  return (
                    <NavItem
                      key={item.id}
                      to={item.path}
                      icon={<ItemIcon className="h-4 w-4" />}
                      label={item.label}
                      isActive={isActive(item.path)}
                      collapsed={false}
                      badge={item.badge}
                    />
                  );
                })}

                {/* Gas Operations sub-section (if applicable) */}
                {gasItems.length > 0 && (
                  <>
                    <div className="pt-2 pb-1">
                      <span className="text-xs text-sidebar-foreground/50 uppercase tracking-wider flex items-center gap-1">
                        <Fuel className="h-3 w-3" />
                        Gas Operations
                      </span>
                    </div>
                    {gasItems.map(item => {
                      const ItemIcon = item.icon;
                      return (
                        <NavItem
                          key={item.id}
                          to={item.path}
                          icon={<ItemIcon className="h-4 w-4" />}
                          label={item.label}
                          isActive={isActive(item.path)}
                          collapsed={false}
                          badge={item.badge}
                        />
                      );
                    })}
                  </>
                )}
              </CollapsibleNav>
            </div>
          );
        })}
      </nav>

      {/* Footer - BVBooks branding */}
      <div className="border-t border-sidebar-border p-3">
        <div className={cn(
          "flex items-center gap-2",
          collapsed ? "justify-center" : "justify-start"
        )}>
          <img src={bvbooksLogo} alt="BVBooks" className="h-6 w-6 rounded object-cover" />
          {!collapsed && (
            <div className="text-xs text-sidebar-foreground/60">
              <span className="font-medium">BVBooks</span>
              <span className="block text-[10px]">by Dot Edge Innovations Ltd</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
