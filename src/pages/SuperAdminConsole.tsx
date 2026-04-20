import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { SuperAdminControls } from "@/components/admin/SuperAdminControls";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldX, Loader2 } from "lucide-react";

const SuperAdminConsole = () => {
  const { data: superAdminData, isLoading } = useSuperAdmin();
  const navigate = useNavigate();
  const isSuperAdmin = superAdminData?.isSuperAdmin ?? false;

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      // Redirect non-super admins away
      navigate("/dashboard");
    }
  }, [isLoading, isSuperAdmin, navigate]);

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!isSuperAdmin) {
    return (
      <main className="flex-1 overflow-y-auto p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <ShieldX className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground text-center max-w-md">
              This area is restricted to Super Administrators only.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Super Admin Console</h1>
        <p className="text-muted-foreground">Manage platform features, plans, and business overrides</p>
      </div>

      <SuperAdminControls />
    </main>
  );
};

export default SuperAdminConsole;
