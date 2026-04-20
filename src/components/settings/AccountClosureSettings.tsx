import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useBusiness, useUpdateBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function AccountClosureSettings() {
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const handleClosureRequest = async () => {
    if (!business?.id) {
      toast.error("No business found");
      return;
    }

    setIsClosing(true);
    try {
      // Update business status to closed_pending_deletion
      await updateBusiness.mutateAsync({
        id: business.id,
        account_status: "suspended" as any, // Using suspended as the closest status
      });

      // Deactivate all staff
      const { error: staffError } = await supabase
        .from("staff")
        .update({ is_active: false })
        .eq("business_id", business.id);

      if (staffError) {
        console.error("Error deactivating staff:", staffError);
      }

      // Create a notification for support team
      await supabase.from("business_notifications").insert({
        business_id: business.id,
        type: "account_closure",
        title: "Account Closure Requested",
        message: `Business "${business.trading_name}" has requested account closure. Owner: ${business.owner_email}`,
      });

      setIsClosed(true);
      setIsDialogOpen(false);
      toast.success("Account closure requested successfully");
    } catch (error) {
      console.error("Error closing account:", error);
      toast.error("Failed to process account closure request");
    } finally {
      setIsClosing(false);
    }
  };

  if (isClosed) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-semibold">Account Closure Requested</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Your BVBooks account has been closed successfully.
          </p>
          <p className="text-muted-foreground text-center max-w-md text-sm">
            Access to this business has been disabled.
            If you need your data exported or have questions about deletion, contact support.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a href="mailto:support@bvbooks.com" className="text-primary hover:underline">
              support@bvbooks.com
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Close Business Account
          </CardTitle>
          <CardDescription>
            Closing your BVBooks account will stop all access to your business data.
            This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={() => setIsDialogOpen(true)}
          >
            Request Account Closure
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Account Closure
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to request the closure of your BVBooks business account.
                </p>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">What happens next:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>All logins for this business will be disabled immediately</li>
                    <li>Staff access will be revoked</li>
                    <li>New sales, stock updates, and reports will be blocked</li>
                    <li>Existing business and transaction records will be retained for legal and audit purposes</li>
                  </ul>
                </div>
                <p className="text-sm text-muted-foreground">
                  Personal information will be deleted or anonymized after the retention period.
                </p>
                <p className="font-medium text-foreground">
                  If you are sure, click Confirm Closure.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleClosureRequest();
              }}
              disabled={isClosing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClosing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Closure"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
