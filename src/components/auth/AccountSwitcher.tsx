import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { User, X, ChevronDown, LogOut, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecentUser, getRecentUsers, removeRecentUser } from "@/hooks/useStaffLogin";

interface AccountSwitcherProps {
  onSelectAccount: (email: string) => void;
  onNewAccount: () => void;
  selectedEmail?: string;
}

export function AccountSwitcher({ onSelectAccount, onNewAccount, selectedEmail }: AccountSwitcherProps) {
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>(getRecentUsers());

  const handleRemoveUser = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    removeRecentUser(email);
    setRecentUsers(getRecentUsers());
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (recentUsers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground text-center">Quick switch account</p>
      <div className="space-y-2">
        {recentUsers.slice(0, 3).map((user) => (
          <button
            key={user.email}
            onClick={() => onSelectAccount(user.email)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-accent/50 group ${
              selectedEmail === user.email ? "border-primary bg-accent/30" : "border-border"
            }`}
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{user.fullName}</p>
                {user.role && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {user.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })}
              </span>
              <button
                onClick={(e) => handleRemoveUser(e, user.email)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                title="Remove from list"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={onNewAccount}
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Use different account
      </Button>
    </div>
  );
}

interface AccountSwitcherDropdownProps {
  currentUser: { email: string; fullName: string } | null;
  onSwitchAccount: () => void;
  onSignOut: () => void;
}

export function AccountSwitcherDropdown({ 
  currentUser, 
  onSwitchAccount, 
  onSignOut 
}: AccountSwitcherDropdownProps) {
  const recentUsers = getRecentUsers();
  const otherUsers = recentUsers.filter(u => u.email !== currentUser?.email);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5 px-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {currentUser ? getInitials(currentUser.fullName) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:block max-w-[120px] truncate">
            {currentUser?.fullName || "User"}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{currentUser?.fullName}</p>
            <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
          </div>
        </DropdownMenuLabel>
        
        {otherUsers.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch account
            </DropdownMenuLabel>
            {otherUsers.slice(0, 3).map((user) => (
              <DropdownMenuItem
                key={user.email}
                onClick={onSwitchAccount}
                className="cursor-pointer"
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback className="text-xs bg-muted">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm truncate">{user.fullName}</p>
                    {user.role && (
                      <span className="text-xs text-muted-foreground">({user.role})</span>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSwitchAccount} className="cursor-pointer">
          <UserPlus className="h-4 w-4 mr-2" />
          Add another account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
