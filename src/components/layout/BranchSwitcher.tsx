import { ChevronDown, Building2, Check, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useBranchContext } from "@/contexts/BranchContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export function BranchSwitcher() {
  const { 
    branches, 
    currentBranch, 
    setCurrentBranch, 
    isLoading, 
    accessibleBranches,
    currentRoleName,
    isOwner 
  } = useBranchContext();

  const handleBranchSwitch = (branch: typeof currentBranch) => {
    if (branch && branch.id !== currentBranch?.id) {
      setCurrentBranch(branch);
      toast.success(`Switched to ${branch.name}`);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-8 w-8 sm:w-32" />;
  }

  if (branches.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-2">
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline">No branches</span>
      </div>
    );
  }

  if (branches.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium px-2">
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline truncate max-w-[120px]">{currentBranch?.name || "Branch"}</span>
        {currentRoleName && (
          <Badge variant="secondary" className="hidden sm:flex text-[10px] px-1.5 py-0">
            {currentRoleName}
          </Badge>
        )}
      </div>
    );
  }

  // Get role for each branch for display
  const getBranchRole = (branchId: string) => {
    if (isOwner) return "Owner";
    const access = accessibleBranches.find(ba => ba.branch.id === branchId);
    return access?.role_name || null;
  };

  const getBranchIsPrimary = (branchId: string) => {
    const access = accessibleBranches.find(ba => ba.branch.id === branchId);
    return access?.is_primary || false;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 px-2 sm:px-3 max-w-[180px] sm:max-w-[240px]">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate hidden sm:inline">{currentBranch?.name || "Select"}</span>
          {currentRoleName && (
            <Badge variant="secondary" className="hidden lg:flex text-[10px] px-1 py-0 shrink-0">
              {currentRoleName}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 bg-popover z-50">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground flex items-center justify-between">
          <span>Switch Branch</span>
          <span className="text-[10px]">{branches.length} available</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((branch) => {
          const role = getBranchRole(branch.id);
          const isPrimary = getBranchIsPrimary(branch.id);
          
          return (
            <DropdownMenuItem
              key={branch.id}
              onClick={() => handleBranchSwitch(branch)}
              className="flex items-center justify-between cursor-pointer py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm">{branch.name}</span>
                    {isPrimary && (
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                    )}
                    {branch.is_main && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">Main</Badge>
                    )}
                  </div>
                  {role && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Shield className="h-2.5 w-2.5" />
                      {role}
                    </span>
                  )}
                </div>
              </div>
              {currentBranch?.id === branch.id && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
