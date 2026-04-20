import { useState, useMemo, useEffect, Component, type ErrorInfo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Loader2,
  Shield,
  User,
  Users,
  Building2,
  UserX,
  UserCheck,
  ChevronRight,
  Lock,
  Unlock,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBranches } from "@/hooks/useBranches";
import { useStaff, type StaffMember } from "@/hooks/useStaff";
import { useBusiness } from "@/hooks/useBusiness";
import {
  useStaffPermissions,
  useRoleTemplates,
  useUpdateStaffPermissions,
  useApplyRoleTemplate,
  useSuspendStaff,
  type RoleTemplate,
} from "@/hooks/usePermissions";
import {
  useRoleTemplatesManagement,
  useCreateRoleTemplate,
  useUpdateRoleTemplate,
  useDeleteRoleTemplate,
  useLockRoleTemplate,
} from "@/hooks/useRoleTemplates";
import { PERMISSION_CATEGORIES, type PermissionKey, isEnterpriseOnly } from "@/lib/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBusinessSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

// Mutable type for filtered categories
interface PermissionItem {
  key: string;
  label: string;
  description: string;
  enterpriseOnly?: boolean;
}

interface CategoryData {
  label: string;
  description: string;
  menuPath: string;
  permissions: PermissionItem[];
}

type FilteredCategories = Record<string, CategoryData>;

export function RolePermissionsSettings() {
  const { data: business, isLoading: businessLoading, isError: businessError } = useBusiness();
  const { data: branches = [], isLoading: branchesLoading, isError: branchesError } = useBranches(business?.id);
  const { data: staff = [], isLoading: staffLoading, isError: staffError } = useStaff();
  const { data: roleTemplates = [], isLoading: templatesLoading, isError: templatesError } = useRoleTemplates();
  const { data: managedTemplates = [], isLoading: managedTemplatesLoading, isError: managedTemplatesError } = useRoleTemplatesManagement();
  const { data: subscriptionData } = useBusinessSubscription();

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [staffToSuspend, setStaffToSuspend] = useState<StaffMember | null>(null);
  
  // Role template management state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleTemplate | null>(null);
  const [deleteConfirmRole, setDeleteConfirmRole] = useState<RoleTemplate | null>(null);

  // Responsive view state
  const [showMatrixView, setShowMatrixView] = useState(false);

  const suspendStaff = useSuspendStaff();
  const lockRole = useLockRoleTemplate();
  const isLoading = businessLoading || branchesLoading || staffLoading || templatesLoading || managedTemplatesLoading;
  const isError = businessError || branchesError || staffError || templatesError || managedTemplatesError;

  const isEnterprisePlan = subscriptionData?.subscription?.tier === 'enterprise';

  const { data: assignmentCountByStaff = {} } = useQuery({
    queryKey: ["staff-branch-assignment-status", business?.id, staff.map((s) => s.id).join("|")],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!staff.length) return {};

      const { data, error } = await supabase
        .from("staff_branch_assignments")
        .select("staff_id, expires_at")
        .in("staff_id", staff.map((member) => member.id))
        .eq("is_active", true);

      if (error) throw error;

      const now = new Date();
      return (data || []).reduce<Record<string, number>>((acc, assignment) => {
        const isExpired = assignment.expires_at && new Date(assignment.expires_at) < now;
        if (!isExpired) {
          acc[assignment.staff_id] = (acc[assignment.staff_id] || 0) + 1;
        }
        return acc;
      }, {});
    },
    enabled: !!business?.id && staff.length > 0,
  });

  const hasBranchAssignment = (staffId: string) => (assignmentCountByStaff[staffId] || 0) > 0;
  const unassignedStaffCount = staff.filter((member) => !hasBranchAssignment(member.id)).length;

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return "No Branch";
    return branches.find((b) => b.id === branchId)?.name || "Unknown Branch";
  };

  const handleOpenPermissions = (member: StaffMember) => {
    setSelectedStaff(member);
    setShowPermissionDialog(true);
  };

  const handleSuspendClick = (member: StaffMember) => {
    setStaffToSuspend(member);
    setShowSuspendDialog(true);
  };

  const handleConfirmSuspend = async () => {
    if (!staffToSuspend) return;
    try {
      await suspendStaff.mutateAsync({
        staffId: staffToSuspend.id,
        suspend: staffToSuspend.is_active,
      });
      toast.success(
        staffToSuspend.is_active
          ? `${staffToSuspend.full_name} has been suspended`
          : `${staffToSuspend.full_name} has been reactivated`
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update staff status");
    }
    setShowSuspendDialog(false);
    setStaffToSuspend(null);
  };

  const handleOpenRoleDialog = (role?: RoleTemplate) => {
    if (role?.is_locked) {
      toast.error("This role is locked and cannot be edited");
      return;
    }
    if (role) {
      setEditingRole(role);
    } else {
      setEditingRole(null);
    }
    setShowRoleDialog(true);
  };

  const handleToggleLock = async (template: RoleTemplate) => {
    try {
      await lockRole.mutateAsync({ id: template.id, lock: !template.is_locked });
      toast.success(template.is_locked ? "Role unlocked" : "Role locked");
    } catch (error: any) {
      toast.error(error.message || "Failed to update lock status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    const failedSources: string[] = [];
    if (businessError) failedSources.push("Business");
    if (branchesError) failedSources.push("Branches");
    if (staffError) failedSources.push("Staff");
    if (templatesError) failedSources.push("Role Templates");
    if (managedTemplatesError) failedSources.push("Managed Templates");

    console.error("[RolePermissionsSettings] Failed data sources:", failedSources.join(", "));

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4">
        <div className="rounded-full bg-destructive/10 p-3">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Failed to load permissions data
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Could not load: {failedSources.join(", ")}. This may be a temporary issue or a permissions problem.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </div>
    );
  }

  const allTemplates = managedTemplates;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Roles & Permissions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage staff roles and granular permissions across all branches
        </p>
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Role Templates</span>
            <span className="sm:hidden">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Staff Permissions</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="matrix" className="gap-2">
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">Permission Matrix</span>
            <span className="sm:hidden">Matrix</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          {/* Role Templates - shows all business templates */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Role Templates</CardTitle>
                <CardDescription>
                  Define permission sets that can be assigned to staff
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenRoleDialog()} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </CardHeader>
            <CardContent>
              {allTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No role templates found. Create your first role to get started.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {allTemplates.map((template) => (
                    <Card key={template.id} className={cn("relative", template.is_locked && "border-amber-500/50")}>
                      {template.is_locked && (
                        <Badge
                          variant="secondary"
                          className="absolute top-2 right-2 text-xs bg-amber-500/10 text-amber-600"
                        >
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2 pr-16">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          {!template.is_locked && (
                            <Badge variant={template.is_active ? "default" : "secondary"}>
                              {template.is_active ? "Active" : "Inactive"}
                            </Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {(template.permissions || []).length} permissions
                          </Badge>
                          {template.discount_limit > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {template.discount_limit}% discount
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleOpenRoleDialog(template)}
                            disabled={template.is_locked}
                          >
                            <Edit2 className="mr-1 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleLock(template)}
                            className={cn(
                              template.is_locked
                                ? "text-amber-600 hover:text-amber-600"
                                : "text-muted-foreground"
                            )}
                            disabled={lockRole.isPending}
                          >
                            {template.is_locked ? (
                              <Unlock className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmRole(template)}
                            disabled={template.is_locked}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          {/* Staff List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                All Staff Members
              </CardTitle>
              <CardDescription>
                Click on a staff member to manage their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unassignedStaffCount > 0 && (
                <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {unassignedStaffCount} staff member{unassignedStaffCount > 1 ? "s" : ""} currently have no active branch assignment.
                  Saving a role/permission now auto-repairs assignment.
                </div>
              )}
              {staff.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No staff members found. Add staff first in the Staff section.
                </p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Staff Member</TableHead>
                        <TableHead className="min-w-[120px]">Branch</TableHead>
                        <TableHead className="min-w-[80px]">Status</TableHead>
                        <TableHead className="text-right min-w-[180px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.map((member) => (
                        <TableRow
                          key={member.id}
                          className={cn(!member.is_active && "opacity-60")}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "rounded-full p-2 flex-shrink-0",
                                  member.is_active ? "bg-primary/10" : "bg-muted"
                                )}
                              >
                                <User className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate flex items-center gap-2">
                                  {member.full_name}
                                  {!hasBranchAssignment(member.id) && (
                                    <Badge variant="destructive" className="text-xs">No branch access</Badge>
                                  )}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {member.email || "No email"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">
                                {getBranchName(member.branch_id)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.is_active ? (
                              <Badge variant="default" className="bg-green-600">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Suspended</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPermissions(member)}
                                className="whitespace-nowrap"
                              >
                                <Shield className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Permissions</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSuspendClick(member)}
                                className={cn(
                                  "whitespace-nowrap",
                                  member.is_active
                                    ? "text-destructive hover:text-destructive"
                                    : "text-green-600 hover:text-green-600"
                                )}
                              >
                                {member.is_active ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          <PermissionMatrixView 
            templates={allTemplates} 
            isEnterprise={isEnterprisePlan}
            onEditRole={handleOpenRoleDialog}
          />
        </TabsContent>
      </Tabs>

      {/* Permission Dialog - isolated with its own error boundary */}
      {selectedStaff && showPermissionDialog && (
        <DialogErrorBoundary
          key={selectedStaff.id}
          onClose={() => {
            setShowPermissionDialog(false);
            setSelectedStaff(null);
          }}
        >
          <StaffPermissionDialog
            staff={selectedStaff}
            roleTemplates={roleTemplates}
            isEnterprise={isEnterprisePlan}
            hasBranchAssignment={hasBranchAssignment(selectedStaff.id)}
            open={showPermissionDialog}
            onOpenChange={(open) => {
              setShowPermissionDialog(open);
              if (!open) setSelectedStaff(null);
            }}
          />
        </DialogErrorBoundary>
      )}

      {/* Role Template Dialog */}
      <RoleTemplateDialog
        role={editingRole}
        isEnterprise={isEnterprisePlan}
        open={showRoleDialog}
        onOpenChange={(open) => {
          setShowRoleDialog(open);
          if (!open) setEditingRole(null);
        }}
      />

      {/* Delete Role Confirmation */}
      <DeleteRoleDialog
        role={deleteConfirmRole}
        onOpenChange={() => setDeleteConfirmRole(null)}
      />

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {staffToSuspend?.is_active ? "Suspend Staff" : "Reactivate Staff"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {staffToSuspend?.is_active
                ? `Are you sure you want to suspend ${staffToSuspend?.full_name}? They will immediately lose access to the system.`
                : `Are you sure you want to reactivate ${staffToSuspend?.full_name}? They will regain their previous permissions.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSuspend}
              className={cn(
                staffToSuspend?.is_active
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-green-600 hover:bg-green-600/90"
              )}
            >
              {suspendStaff.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {staffToSuspend?.is_active ? "Suspend" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Dialog-level error boundary to isolate StaffPermissionDialog crashes
class DialogErrorBoundary extends Component<
  { children: ReactNode; onClose: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[DialogErrorBoundary] Staff permission dialog crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Dialog open onOpenChange={() => this.props.onClose()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" />
                Permission Dialog Error
              </DialogTitle>
              <DialogDescription>
                An unexpected error occurred while loading this dialog.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                {this.state.error?.message || "Unknown error"}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => this.setState({ hasError: false, error: null })}
                >
                  Retry
                </Button>
                <Button size="sm" onClick={() => this.props.onClose()}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      );
    }
    return this.props.children;
  }
}

// Permission Matrix View Component
function PermissionMatrixView({
  templates,
  isEnterprise,
  onEditRole,
}: {
  templates: RoleTemplate[];
  isEnterprise: boolean;
  onEditRole: (role: RoleTemplate) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    Object.keys(PERMISSION_CATEGORIES)
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return PERMISSION_CATEGORIES;
    
    const query = searchQuery.toLowerCase();
    const filtered: FilteredCategories = {};
    
    for (const [key, category] of Object.entries(PERMISSION_CATEGORIES)) {
      const matchingPermissions = category.permissions.filter(
        p => p.label.toLowerCase().includes(query) || 
             p.description.toLowerCase().includes(query) ||
             p.key.toLowerCase().includes(query)
      );
      if (matchingPermissions.length > 0) {
        filtered[key as keyof typeof PERMISSION_CATEGORIES] = {
          ...category,
          permissions: matchingPermissions,
        };
      }
    }
    return filtered;
  }, [searchQuery]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleAllCategories = () => {
    if (expandedCategories.length === Object.keys(PERMISSION_CATEGORIES).length) {
      setExpandedCategories([]);
    } else {
      setExpandedCategories(Object.keys(PERMISSION_CATEGORIES));
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Permission Matrix</CardTitle>
            <CardDescription>
              Compare permissions across all role templates
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAllCategories}
            className="self-start"
          >
            {expandedCategories.length === Object.keys(PERMISSION_CATEGORIES).length ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Expand All
              </>
            )}
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header row with role names */}
            <div className="sticky top-0 z-10 bg-background border-b flex">
              <div className="w-[250px] min-w-[250px] p-3 font-medium text-sm border-r bg-muted/50">
                Permission
              </div>
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex-1 min-w-[100px] p-3 text-center border-r last:border-r-0 bg-muted/50"
                >
                  <button
                    onClick={() => onEditRole(template)}
                    className="font-medium text-sm hover:text-primary transition-colors flex items-center justify-center gap-1 w-full"
                  >
                    {template.name}
                    {template.is_locked && <Lock className="h-3 w-3 text-amber-500" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Permission rows grouped by category */}
            {Object.entries(filteredCategories).map(([categoryKey, category]) => (
              <div key={categoryKey} className="border-b last:border-b-0">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(categoryKey)}
                  className="w-full flex items-center gap-2 p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {expandedCategories.includes(categoryKey) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="font-medium text-sm">{category.label}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {category.permissions.length}
                  </Badge>
                </button>

                {/* Permission rows */}
                {expandedCategories.includes(categoryKey) && (
                  <div>
                    {category.permissions.map((permission) => {
                      const isEntOnly = isEnterpriseOnly(permission.key as PermissionKey);
                      return (
                        <div
                          key={permission.key}
                          className={cn(
                            "flex border-t",
                            isEntOnly && !isEnterprise && "opacity-50"
                          )}
                        >
                          <div className="w-[250px] min-w-[250px] p-3 border-r">
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium flex items-center gap-1">
                                  {permission.label}
                                  {isEntOnly && (
                                    <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {permission.description}
                                </p>
                              </div>
                            </div>
                          </div>
                          {templates.map((template) => {
                            const hasPermission = (template.permissions || []).includes(permission.key as PermissionKey);
                            return (
                              <div
                                key={`${template.id}-${permission.key}`}
                                className="flex-1 min-w-[100px] p-3 flex items-center justify-center border-r last:border-r-0"
                              >
                                {hasPermission ? (
                                  <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <Check className="h-3 w-3 text-green-600" />
                                  </div>
                                ) : (
                                  <div className="h-5 w-5 rounded-full bg-muted" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Role Template Dialog Component
function RoleTemplateDialog({
  role,
  isEnterprise,
  open,
  onOpenChange,
}: {
  role: RoleTemplate | null;
  isEnterprise: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createRole = useCreateRoleTemplate();
  const updateRole = useUpdateRoleTemplate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as PermissionKey[],
    discount_limit: 0,
    refund_limit: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Reset form when dialog opens or role changes
  useEffect(() => {
    if (open && role) {
      setFormData({
        name: role.name,
        description: role.description || "",
        permissions: [...(role.permissions || [])],
        discount_limit: role.discount_limit,
        refund_limit: role.refund_limit,
      });
    } else if (open && !role) {
      setFormData({
        name: "",
        description: "",
        permissions: [],
        discount_limit: 0,
        refund_limit: 0,
      });
    }
  }, [open, role]);

  const handlePermissionToggle = (permission: PermissionKey) => {
    if (isEnterpriseOnly(permission) && !isEnterprise) {
      toast.error("This permission requires an Enterprise plan");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleBulkToggleCategory = (categoryKey: string, permissions: PermissionKey[]) => {
    const availablePermissions = permissions.filter(
      p => !isEnterpriseOnly(p) || isEnterprise
    );
    const allSelected = availablePermissions.every(p => formData.permissions.includes(p));
    
    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !availablePermissions.includes(p))
        : [...new Set([...prev.permissions, ...availablePermissions])],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a role name");
      return;
    }

    try {
      if (role) {
        await updateRole.mutateAsync({
          id: role.id,
          ...formData,
        });
        toast.success("Role updated successfully");
      } else {
        await createRole.mutateAsync(formData);
        toast.success("Role created successfully");
      }
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        permissions: [],
        discount_limit: 0,
        refund_limit: 0,
      });
      setSearchQuery("");
    } catch (error: any) {
      toast.error(error.message || "Failed to save role");
    }
  };

  const isSaving = createRole.isPending || updateRole.isPending;
  const isSystemRole = role?.is_system ?? false;

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return PERMISSION_CATEGORIES;
    
    const query = searchQuery.toLowerCase();
    const filtered: FilteredCategories = {};
    
    for (const [key, category] of Object.entries(PERMISSION_CATEGORIES)) {
      const matchingPermissions = category.permissions.filter(
        p => p.label.toLowerCase().includes(query) || 
             p.description.toLowerCase().includes(query)
      );
      if (matchingPermissions.length > 0) {
        filtered[key as keyof typeof PERMISSION_CATEGORIES] = {
          ...category,
          permissions: matchingPermissions,
        };
      }
    }
    return filtered;
  }, [searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {role ? (isSystemRole ? `Edit "${role.name}" Permissions` : "Edit Role Template") : "Create Role Template"}
          </DialogTitle>
          <DialogDescription>
            {isSystemRole 
              ? "Customize permissions for this predefined role template"
              : "Define permissions for this role template"
            }
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 py-4 pr-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Senior Cashier"
                  disabled={isSystemRole}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Max Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discount_limit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, discount_limit: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this role can do..."
                rows={2}
                disabled={isSystemRole}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Label>Permissions ({formData.permissions.length} selected)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9 w-full sm:w-[200px]"
                  />
                </div>
              </div>
              <div className="rounded-md border p-4">
                <Accordion type="multiple" defaultValue={Object.keys(PERMISSION_CATEGORIES)} className="w-full">
                  {Object.entries(filteredCategories).map(([categoryKey, category]) => {
                    const categoryPermissions = category.permissions.map(p => p.key as PermissionKey);
                    const availablePermissions = categoryPermissions.filter(
                      p => !isEnterpriseOnly(p) || isEnterprise
                    );
                    const selectedCount = categoryPermissions.filter(
                      p => formData.permissions.includes(p)
                    ).length;
                    const allSelected = availablePermissions.length > 0 && 
                      availablePermissions.every(p => formData.permissions.includes(p));

                    return (
                      <AccordionItem key={categoryKey} value={categoryKey}>
                        <AccordionTrigger className="text-sm font-medium hover:no-underline">
                          <div className="flex items-center gap-2 flex-1">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => handleBulkToggleCategory(categoryKey, categoryPermissions)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span>{category.label}</span>
                            <Badge variant="secondary" className="text-xs ml-auto mr-2">
                              {selectedCount}/{category.permissions.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-6">
                            {category.permissions.map((permission) => {
                              const isEntOnly = isEnterpriseOnly(permission.key as PermissionKey);
                              const isDisabled = isEntOnly && !isEnterprise;
                              return (
                                <div 
                                  key={permission.key} 
                                  className={cn(
                                    "flex items-start space-x-2",
                                    isDisabled && "opacity-50"
                                  )}
                                >
                                  <Checkbox
                                    id={permission.key}
                                    checked={formData.permissions.includes(permission.key as PermissionKey)}
                                    onCheckedChange={() => handlePermissionToggle(permission.key as PermissionKey)}
                                    disabled={isDisabled}
                                  />
                                  <div className="grid gap-0.5 leading-none">
                                    <Label
                                      htmlFor={permission.key}
                                      className={cn(
                                        "cursor-pointer text-sm font-normal flex items-center gap-1",
                                        isDisabled && "cursor-not-allowed"
                                      )}
                                    >
                                      {permission.label}
                                      {isEntOnly && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-400">
                                          Enterprise
                                        </Badge>
                                      )}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {role ? "Update Role" : "Create Role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete Role Confirmation Dialog
function DeleteRoleDialog({
  role,
  onOpenChange,
}: {
  role: RoleTemplate | null;
  onOpenChange: () => void;
}) {
  const deleteRole = useDeleteRoleTemplate();

  const handleDelete = async () => {
    if (!role) return;
    try {
      await deleteRole.mutateAsync(role.id);
      toast.success("Role deleted successfully");
      onOpenChange();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete role");
    }
  };

  return (
    <AlertDialog open={!!role} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Role</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{role?.name}"? This action cannot be undone.
            Staff members using this role will lose their assigned permissions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Separate component for the staff permission dialog
function StaffPermissionDialog({
  staff,
  roleTemplates,
  isEnterprise,
  hasBranchAssignment,
  open,
  onOpenChange,
}: {
  staff: StaffMember;
  roleTemplates: RoleTemplate[];
  isEnterprise: boolean;
  hasBranchAssignment: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: currentPermissions, isLoading, isError: permissionsError, error: permissionsErrorObj, refetch: refetchPermissions } = useStaffPermissions(staff.id);
  const updatePermissions = useUpdateStaffPermissions();
  const applyTemplate = useApplyRoleTemplate();

  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Log dialog lifecycle for debugging
  useEffect(() => {
    if (open) {
      console.log("[StaffPermissionDialog] Opened for staff:", staff.id, staff.full_name);
    }
    return () => {
      if (open) {
        console.log("[StaffPermissionDialog] Closing for staff:", staff.id);
      }
    };
  }, [open, staff.id, staff.full_name]);

  // Log data loading state
  useEffect(() => {
    if (open) {
      console.log("[StaffPermissionDialog] Data state:", {
        isLoading,
        permissionsError,
        permissionsCount: currentPermissions?.length ?? "undefined",
        initialized,
      });
    }
  }, [open, isLoading, permissionsError, currentPermissions, initialized]);

  // Sync local state when data loads; reset on close
  useEffect(() => {
    if (open && !isLoading && !initialized && currentPermissions !== undefined) {
      const safePermissions = Array.isArray(currentPermissions) ? currentPermissions : [];
      console.log("[StaffPermissionDialog] Initializing with", safePermissions.length, "permissions");
      setSelectedPermissions(safePermissions);
      setInitialized(true);
    }
    if (!open) {
      setInitialized(false);
      setHasChanges(false);
      setSearchQuery("");
      setSelectedPermissions([]);
    }
  }, [open, isLoading, currentPermissions, initialized]);

  const handlePermissionToggle = (permission: PermissionKey) => {
    if (isEnterpriseOnly(permission) && !isEnterprise) {
      toast.error("This permission requires an Enterprise plan");
      return;
    }
    setHasChanges(true);
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleApplyTemplate = async (template: RoleTemplate) => {
    try {
      const result = await applyTemplate.mutateAsync({
        staffId: staff.id,
        templateId: template.id,
        template,
      });
      setSelectedPermissions(template.permissions || []);
      setHasChanges(false);
      toast.success(
        result.assignmentRepaired
          ? `Applied "${template.name}" role to ${staff.full_name}. Branch access was repaired.`
          : `Applied "${template.name}" role to ${staff.full_name}`
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to apply role template");
    }
  };

  const handleSavePermissions = async () => {
    try {
      const result = await updatePermissions.mutateAsync({
        staffId: staff.id,
        permissions: selectedPermissions,
      });
      setHasChanges(false);
      toast.success(
        result.assignmentRepaired
          ? `Permissions updated for ${staff.full_name}. Branch access was repaired.`
          : `Permissions updated for ${staff.full_name}`
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update permissions");
    }
  };

  const isSaving = updatePermissions.isPending || applyTemplate.isPending;

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return PERMISSION_CATEGORIES;
    
    const query = searchQuery.toLowerCase();
    const filtered: FilteredCategories = {};
    
    for (const [key, category] of Object.entries(PERMISSION_CATEGORIES)) {
      const matchingPermissions = category.permissions.filter(
        p => p.label.toLowerCase().includes(query) || 
             p.description.toLowerCase().includes(query)
      );
      if (matchingPermissions.length > 0) {
        filtered[key as keyof typeof PERMISSION_CATEGORIES] = {
          ...category,
          permissions: matchingPermissions,
        };
      }
    }
    return filtered;
  }, [searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions - {staff.full_name}
          </DialogTitle>
          <DialogDescription>
            Select individual permissions or apply a role template.
          </DialogDescription>
          {!hasBranchAssignment && (
            <div className="text-xs text-destructive mt-1">
              This staff has no active branch assignment yet; applying role/permissions will auto-repair access.
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-sm text-muted-foreground">Loading permissions…</span>
          </div>
        ) : permissionsError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Shield className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground text-center">
              Failed to load permissions for this staff member.
            </p>
            <p className="text-xs text-destructive text-center max-w-sm">
              {permissionsErrorObj?.message || "Unknown error"}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetchPermissions()}>
              Retry
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="templates">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates">Role Templates</TabsTrigger>
              <TabsTrigger value="custom">Custom Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-2">
              {(roleTemplates || []).length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p className="text-sm">No role templates found.</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 py-2">
                {(roleTemplates || []).map((template) => (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all hover:border-primary/50",
                        (template.permissions || []).every((p) =>
                          selectedPermissions.includes(p)
                        ) &&
                          (template.permissions || []).length === selectedPermissions.length &&
                          "border-primary ring-1 ring-primary"
                      )}
                      onClick={() => handleApplyTemplate(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium flex items-center gap-2 text-sm">
                              {template.name}
                              {template.is_system && (
                                <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(template.permissions || []).slice(0, 3).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                          {(template.permissions || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(template.permissions || []).length - 3} more
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-2">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search permissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div>
                <Accordion type="multiple" defaultValue={[]} className="w-full py-2">
                  {Object.entries(filteredCategories).map(
                    ([categoryKey, category]) => (
                      <AccordionItem key={categoryKey} value={categoryKey}>
                        <AccordionTrigger className="text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {category.label}
                            <Badge variant="secondary" className="text-xs">
                              {
                                category.permissions.filter((p) =>
                                  selectedPermissions.includes(p.key as PermissionKey)
                                ).length
                              }
                              /{category.permissions.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pl-2">
                            {category.permissions.map((permission) => {
                              const isEntOnly = isEnterpriseOnly(permission.key as PermissionKey);
                              const isDisabled = isEntOnly && !isEnterprise;
                              return (
                                <div
                                  key={permission.key}
                                  className={cn(
                                    "flex items-start space-x-3",
                                    isDisabled && "opacity-50"
                                  )}
                                >
                                  <Checkbox
                                    id={`${staff.id}-${permission.key}`}
                                    checked={selectedPermissions.includes(
                                      permission.key as PermissionKey
                                    )}
                                    onCheckedChange={() =>
                                      handlePermissionToggle(permission.key as PermissionKey)
                                    }
                                    disabled={isDisabled}
                                  />
                                  <div className="grid gap-1 leading-none">
                                    <Label
                                      htmlFor={`${staff.id}-${permission.key}`}
                                      className={cn(
                                        "cursor-pointer text-sm font-normal flex items-center gap-1",
                                        isDisabled && "cursor-not-allowed"
                                      )}
                                    >
                                      {permission.label}
                                      {isEntOnly && (
                                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-400">
                                          Enterprise
                                        </Badge>
                                      )}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  )}
                </Accordion>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSavePermissions}
            disabled={!hasChanges || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
