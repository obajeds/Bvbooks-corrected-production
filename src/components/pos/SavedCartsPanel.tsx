import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Save, ShoppingBag, Trash2, ArrowDownToLine } from "lucide-react";
import type { SavedCart } from "@/hooks/useCartPersistence";

interface SavedCartsPanelProps {
  savedCarts: SavedCart[];
  currentCartLength: number;
  onSaveCart: () => void;
  onLoadCart: (cartId: string) => void;
  onDeleteCart: (cartId: string) => void;
  formatCurrency: (value: number) => string;
}

export function SavedCartsPanel({
  savedCarts,
  currentCartLength,
  onSaveCart,
  onLoadCart,
  onDeleteCart,
  formatCurrency,
}: SavedCartsPanelProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onSaveCart}
        disabled={currentCartLength === 0}
        className="text-xs gap-1"
        title="Save cart & start new"
      >
        <Save className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Hold</span>
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs gap-1 relative">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Held</span>
            {savedCarts.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
              >
                {savedCarts.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          {savedCarts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No held carts
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {savedCarts.map((sc) => {
                const cartTotal = sc.items.reduce(
                  (s, i) =>
                    s +
                    (i.sellMode === "price" && i.enteredPrice !== undefined
                      ? i.enteredPrice
                      : i.price * i.quantity),
                  0
                );
                return (
                  <div
                    key={sc.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md border text-xs hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{sc.label}</p>
                      <p className="text-muted-foreground">
                        {sc.items.length} items · {formatCurrency(cartTotal)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onLoadCart(sc.id)}
                        title="Resume this cart"
                      >
                        <ArrowDownToLine className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteCart(sc.id)}
                        title="Discard"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
