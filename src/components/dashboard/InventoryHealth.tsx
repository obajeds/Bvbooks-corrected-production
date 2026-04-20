import { Package, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useInventoryHealth } from "@/hooks/useDashboardStats";

export function InventoryHealth() {
  const { data: inventoryData, isLoading } = useInventoryHealth();

  const getPercentage = (value: number) => {
    if (!inventoryData?.total) return "0";
    return ((value / inventoryData.total) * 100).toFixed(0);
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Inventory Health</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Inventory Health</h3>
      </div>
      <div className="space-y-4">
        {/* In Stock */}
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">In Stock</span>
              <span className="text-sm text-muted-foreground">
                {inventoryData?.inStock || 0} items
              </span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${getPercentage(inventoryData?.inStock || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Low Stock</span>
              <span className="text-sm text-muted-foreground">
                {inventoryData?.lowStock || 0} items
              </span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-yellow-500"
                style={{ width: `${getPercentage(inventoryData?.lowStock || 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Out of Stock</span>
              <span className="text-sm text-muted-foreground">
                {inventoryData?.outOfStock || 0} items
              </span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-red-500"
                style={{ width: `${getPercentage(inventoryData?.outOfStock || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
