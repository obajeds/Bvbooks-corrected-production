import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ChevronDown, ChevronLeft, Menu, Building2
} from "lucide-react";
import { useDynamicSidebar, type ProcessedMenuSection } from "@/hooks/useDynamicSidebar";
import { useBusiness } from "@/hooks/useBusiness";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
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
  
  // Track open state for each collapsible section
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  // Initialize open state based on current path
  useEffect(() => {
    const newOpenSections: Record<string, boolean> = {};
    
    for (const section of menu) {
      if (!section.isDirectLink && section.items.length > 0) {
        // Check if any item in the section matches the current path
        const isActive = section.items.some(item => 
          location.pathname === item.path || location.pathname.startsWith(item.path + '/')
        );
        newOpenSections[section.id] = isActive;
      }
    }
    
    setOpenSections(prev => {
      // Only update sections that need to be opened based on path
      // Don't close manually opened sections
      const merged = { ...prev };
      for (const [id, shouldOpen] of Object.entries(newOpenSections)) {
        if (shouldOpen) {
          merged[id] = true;
        }
      }
      return merged;
    });
  }, [location.pathname, menu]);
  
  const toggleSection = (sectionId: string, open: boolean) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: open }));
  };

  const isActive = (path: string) => location.pathname === path;
  const isActivePrefix = (prefix: string) => location.pathname.startsWith(prefix);
  
  // Check if a section is active (any of its items match the current path)
  const isSectionActive = (section: ProcessedMenuSection): boolean => {
    if (section.isDirectLink && section.path) {
      return location.pathname === section.path || location.pathname === section.path + '/';
    }
    return section.items.some(item => 
      location.pathname === item.path || location.pathname.startsWith(item.path + '/')
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div 
        className={cn("flex h-screen flex-col text-sidebar-foreground transition-all duration-300", collapsed ? "w-16" : "w-64")}
        style={{ backgroundColor: 'hsl(222 47% 11%)' }}
      >
        <div className="flex h-16 items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded bg-sidebar-accent" />
        </div>
      </div>
    );
  }

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

      {/* Navigation - Dynamically generated from menu config */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menu.map((section) => {
          const IconComponent = section.icon;
          const sectionIcon = <IconComponent className="h-4 w-4" />;
          
          // Add divider before section if needed
          const divider = section.dividerBefore ? (
            <div key={`divider-${section.id}`} className="my-4 border-t border-sidebar-border" />
          ) : null;
          
          // Direct link section
          if (section.isDirectLink && section.path) {
            return (
              <div key={section.id}>
                {divider}
                <NavItem 
                  to={section.path} 
                  icon={sectionIcon} 
                  label={section.label} 
                  isActive={isSectionActive(section)} 
                  collapsed={collapsed}
                  badge={section.badge}
                />
              </div>
            );
          }
          
          // Collapsible section with items
          if (section.items.length > 0) {
            return (
              <div key={section.id}>
                {divider}
                <CollapsibleNav
                  label={section.label}
                  icon={sectionIcon}
                  isActive={isSectionActive(section)}
                  isOpen={openSections[section.id] || false}
                  onOpenChange={(open) => toggleSection(section.id, open)}
                  collapsed={collapsed}
                  badge={section.badge}
                >
                  {section.items.map(item => {
                    const ItemIcon = item.icon;
                    return (
                      <NavItem 
                        key={item.id} 
                        to={item.path} 
                        icon={<ItemIcon className="h-4 w-4" />} 
                        label={item.label} 
                        isActive={isActive(item.path) || isActivePrefix(item.path + '/')} 
                        collapsed={false}
                        badge={item.badge}
                      />
                    );
                  })}
                </CollapsibleNav>
              </div>
            );
          }
          
          return null;
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
