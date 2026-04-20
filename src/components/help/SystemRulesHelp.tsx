import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ShoppingCart, 
  Package, 
  ClipboardEdit, 
  Users, 
  Shield, 
  Building2,
  HelpCircle 
} from "lucide-react";

const rules = [
  {
    icon: ShoppingCart,
    title: "Sales",
    description: "Sales change stock because customers buy products.",
    color: "text-emerald-500",
  },
  {
    icon: Package,
    title: "Purchases",
    description: "Purchases change stock because suppliers deliver goods.",
    color: "text-blue-500",
  },
  {
    icon: ClipboardEdit,
    title: "Adjustments",
    description: "Adjustments change stock because reality disagrees with the system.",
    color: "text-amber-500",
  },
  {
    icon: Building2,
    title: "Branch Access",
    description: "Staff can only access branches they are assigned to.",
    color: "text-purple-500",
  },
  {
    icon: Shield,
    title: "Branch-Specific Roles",
    description: "Roles are branch-specific; permissions only apply within the assigned branch.",
    color: "text-rose-500",
  },
  {
    icon: Users,
    title: "Multi-Branch Staff",
    description: "Staff assigned to multiple branches may have different roles per branch.",
    color: "text-cyan-500",
  },
];

export function SystemRulesHelp() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          System Rules
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <div
              key={rule.title}
              className="flex items-start gap-3 p-4 rounded-lg border bg-card"
            >
              <div className={`shrink-0 ${rule.color}`}>
                <rule.icon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium text-sm">{rule.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
