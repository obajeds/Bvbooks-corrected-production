import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, Star } from "lucide-react";
import { useBranchContext, type Branch } from "@/contexts/BranchContext";

interface BranchSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function BranchSelectorModal({
  open,
  onOpenChange,
  title = "Select Branch",
  description = "Choose which branch you want to work in",
}: BranchSelectorModalProps) {
  const { accessibleBranches, switchBranch, currentBranch } = useBranchContext();

  const handleSelectBranch = (branch: Branch) => {
    switchBranch(branch);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
          {accessibleBranches.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground border-dashed">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No branches available</p>
              <p className="text-sm">Contact your administrator for access</p>
            </Card>
          ) : (
            accessibleBranches.map((access) => (
              <Card
                key={access.branch.id}
                className={`p-4 cursor-pointer transition-all hover:border-primary ${
                  currentBranch?.id === access.branch.id
                    ? "border-primary bg-primary/5"
                    : ""
                }`}
                onClick={() => handleSelectBranch(access.branch)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {access.branch.name}
                      </span>
                      {access.is_primary && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />
                      )}
                    </div>
                    {access.branch.address && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {access.branch.address}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {access.role_name && (
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        {access.role_name}
                      </Badge>
                    )}
                    {access.expires_at && (
                      <Badge variant="outline" className="text-xs">
                        Expires{" "}
                        {new Date(access.expires_at).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {accessibleBranches.length > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            You have access to {accessibleBranches.length} branch
            {accessibleBranches.length !== 1 ? "es" : ""}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
