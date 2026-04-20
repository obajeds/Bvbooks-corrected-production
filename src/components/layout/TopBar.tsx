import { Search, Bell, Plus, User, Menu, LogOut, ShoppingCart, Package, ArrowDownToLine, UserPlus, Users, Shield, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BranchSwitcher } from "./BranchSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getRecentUsers } from "@/hooks/useStaffLogin";
import { switchExperience, detectExperience, ExperienceType } from "@/lib/experienceRouting";
import { OfflineStatusBadge } from "@/components/offline/OfflineStatusBar";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: roleData } = useUserRole();
  const { unreadCount } = useUnreadNotifications();
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  
  // Get recent users for account switching
  const recentUsers = getRecentUsers();
  const otherUsers = recentUsers.filter(u => u.email !== userEmail);
  
  // Determine display role - Owner for owners, otherwise capitalize staff role
  const isOwner = roleData?.isOwner ?? false;
  const userRole = isOwner ? "Owner" : (roleData?.role ? roleData.role.charAt(0).toUpperCase() + roleData.role.slice(1) : recentUsers.find(u => u.email === userEmail)?.role);
  
  // Current experience detection
  const currentExperience = detectExperience({ role: roleData?.role });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const handleSwitchAccount = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleQuickAction = (action: string, route: string) => {
    toast.success(`Opening ${action}...`);
    navigate(route);
  };

  const handleSwitchExperience = () => {
    const newExperience: ExperienceType = currentExperience === 'web' ? 'mobile' : 'web';
    switchExperience(newExperience);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-6">
      <div className="flex flex-1 items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        <BranchSwitcher />

        <div className="relative max-w-md flex-1 hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-8" />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Offline status indicator */}
        <OfflineStatusBadge />

        {/* Mobile search button */}
        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="h-5 w-5" />
        </Button>

        <Button asChild size="sm" variant="default" className="gap-1.5 font-medium px-2 sm:px-3">
          <Link to="/pos">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">POS</span>
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1 px-2 sm:px-3">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Add</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/pos" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span>New Sale</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleQuickAction('Add Product', '/inventory/items?action=add')}
            >
              <Package className="h-4 w-4" />
              <span>Add Product</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleQuickAction('Stock In', '/inventory/stock?action=in')}
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>Stock In</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleQuickAction('Add Customer', '/crm?action=add')}
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Customer</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link to="/notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium max-w-[100px] truncate">{userName}</span>
                {userRole && (
                  <span className={`text-xs ${isOwner ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {isOwner && <Shield className="inline h-3 w-3 mr-0.5" />}
                    {userRole}
                  </span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-popover">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{userName}</p>
                  {userRole && (
                    <Badge variant={isOwner ? "default" : "secondary"} className="text-xs px-1.5 py-0">
                      {isOwner && <Shield className="h-3 w-3 mr-0.5" />}
                      {userRole}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            
            {otherUsers.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Switch account
                </DropdownMenuLabel>
                {otherUsers.slice(0, 3).map((otherUser) => (
                  <DropdownMenuItem
                    key={otherUser.email}
                    onClick={handleSwitchAccount}
                    className="cursor-pointer"
                  >
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarFallback className="text-xs bg-muted">
                        {getInitials(otherUser.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm truncate">{otherUser.fullName}</p>
                        {otherUser.role && (
                          <span className="text-xs text-muted-foreground">({otherUser.role})</span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSwitchExperience} className="cursor-pointer">
              {currentExperience === 'web' ? (
                <>
                  <Smartphone className="mr-2 h-4 w-4" />
                  Switch to Mobile View
                </>
              ) : (
                <>
                  <Monitor className="mr-2 h-4 w-4" />
                  Switch to Desktop View
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSwitchAccount} className="cursor-pointer">
              <UserPlus className="mr-2 h-4 w-4" />
              Add another account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
