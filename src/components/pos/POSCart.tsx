import { useState, useEffect, useCallback, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  X, 
  Percent, 
  Receipt,
  Scale,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  cost_price?: number;
  stock: number;
  quantity: number;
  sku: string | null;
  unit: string;
  sellMode: "quantity" | "price";
  allowsPriceSale: boolean;
  allowsDecimal: boolean;
  enteredPrice?: number;
}

// --- Helpers (stable, outside component) ---

const formatQuantity = (qty: number) => {
  const rounded = Math.round(qty * 100) / 100;
  if (Number.isInteger(rounded)) return rounded.toFixed(0);
  return rounded.toString().replace(/\.?0+$/, '');
};

const formatUnit = (unit: string) => unit.replace(/:decimal$/i, '');



const getQuantityStep = (_unit: string, allowsDecimal?: boolean) => {
  return allowsDecimal ? 0.5 : 1;
};

// --- Extracted stable CartItemRow ---

interface CartItemRowProps {
  item: CartItem;
  isHighlighted: boolean;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onQuantityInput: (productId: string, value: string) => void;
  onRemove: (productId: string) => void;
  onToggleSellMode: (productId: string) => void;
  onPriceInput: (productId: string, value: string) => void;
  formatCurrency: (value: number) => string;
}

const CartItemRow = memo(function CartItemRow({
  item,
  isHighlighted,
  onUpdateQuantity,
  onQuantityInput,
  onRemove,
  onToggleSellMode,
  onPriceInput,
  formatCurrency,
}: CartItemRowProps) {
  const stopProp = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);

  return (
    <div 
      className={cn(
        "p-3 border rounded-lg space-y-2 transition-all duration-300",
        isHighlighted && "ring-2 ring-primary bg-primary/5 animate-pulse"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.name}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{formatCurrency(item.price)} / {formatUnit(item.unit)}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium",
              item.allowsDecimal 
                ? "bg-accent text-accent-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              {item.allowsDecimal ? "Decimal" : "Standard"}
            </span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-destructive shrink-0 hover:bg-destructive/10" 
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      
      {item.allowsPriceSale && (
        <div className="flex items-center gap-2 text-xs">
          <button 
            onClick={() => onToggleSellMode(item.id)} 
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded transition-colors",
              item.sellMode === "quantity" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}
          >
            <Scale className="h-3 w-3" />Qty
          </button>
          <button 
            onClick={() => onToggleSellMode(item.id)} 
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded transition-colors",
              item.sellMode === "price" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}
          >
            <DollarSign className="h-3 w-3" />Price
          </button>
        </div>
      )}
      
      {item.sellMode === "quantity" ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => onUpdateQuantity(item.id, -1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input 
              type="text"
              inputMode={item.allowsDecimal ? "decimal" : "numeric"}
              value={formatQuantity(item.quantity)} 
              onChange={(e) => onQuantityInput(item.id, e.target.value)} 
              onClick={stopProp}
              onFocus={stopProp}
              step={getQuantityStep(item.unit, item.allowsDecimal)} 
              min={getQuantityStep(item.unit, item.allowsDecimal)} 
              className="w-16 h-8 text-center text-sm px-1" 
            />
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => onUpdateQuantity(item.id, 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <p className="font-bold text-sm text-primary">
            {formatCurrency(item.price * item.quantity)}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Amount:</span>
            <Input 
              type="text"
              inputMode="decimal"
              value={item.enteredPrice ? item.enteredPrice : ""} 
              onChange={(e) => onPriceInput(item.id, e.target.value)} 
              onClick={stopProp}
              onFocus={stopProp}
              placeholder="Enter amount" 
              className="h-8 text-sm flex-1" 
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Selling: {formatQuantity(item.quantity)} {formatUnit(item.unit)}
            </span>
            <span className="font-bold text-primary">
              {formatCurrency(item.enteredPrice || 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// --- Main POSCart component ---

interface POSCartProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onQuantityInput: (productId: string, value: string) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onToggleSellMode: (productId: string) => void;
  onPriceInput: (productId: string, value: string) => void;
  onCheckout: () => void;
  subtotal: number;
  discountPercent: string;
  onDiscountChange: (value: string) => void;
  discountAmount: number;
  discountLimit: number;
  canApplyDiscount: boolean;
  tax: number;
  taxEnabled: boolean;
  onTaxToggle: (enabled: boolean) => void;
  taxName?: string;
  taxRate?: number;
  total: number;
  formatCurrency: (value: number) => string;
  isLoading?: boolean;
  isMobile?: boolean;
}

export function POSCart({
  cart,
  onUpdateQuantity,
  onQuantityInput,
  onRemove,
  onClear,
  onToggleSellMode,
  onPriceInput,
  onCheckout,
  subtotal,
  discountPercent,
  onDiscountChange,
  discountAmount,
  discountLimit,
  canApplyDiscount,
  tax,
  taxEnabled,
  onTaxToggle,
  taxName = "VAT",
  taxRate = 7.5,
  total,
  formatCurrency,
  isLoading = false,
  isMobile = false,
}: POSCartProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null);

  const discountPercentValue = parseFloat(discountPercent) || 0;
  const isDiscountOverLimit = discountPercentValue > discountLimit;

  // Track when new items are added for highlight effect
  useEffect(() => {
    if (cart.length > 0) {
      const latestItem = cart[cart.length - 1];
      setLastAddedItem(latestItem.id);
      const timer = setTimeout(() => setLastAddedItem(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [cart.length]);

  const stopProp = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);

  const cartSummary = (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatCurrency(subtotal)}</span>
      </div>
      
      {canApplyDiscount && (
        <div className="flex items-center justify-between gap-2 py-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Percent className="h-3 w-3" />Discount
            <span className="text-xs text-muted-foreground/70">(max {discountLimit}%)</span>
          </span>
          <div className="flex items-center gap-1">
            <Input 
              type="text"
              inputMode="decimal"
              value={discountPercent} 
              onChange={(e) => onDiscountChange(e.target.value)} 
              onClick={stopProp}
              onFocus={stopProp}
              placeholder="0" 
              className={cn(
                "w-14 h-7 text-right text-sm px-2",
                isDiscountOverLimit && "border-warning text-warning"
              )} 
            />
            <span className="text-xs">%</span>
          </div>
        </div>
      )}
      
      {discountAmount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount ({discountPercentValue}%)</span>
          <span>-{formatCurrency(discountAmount)}</span>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{taxName} ({taxRate}%)</span>
          <Switch 
            checked={taxEnabled} 
            onCheckedChange={onTaxToggle}
            className="scale-75"
          />
        </div>
        <span className={!taxEnabled ? "text-muted-foreground" : ""}>
          {formatCurrency(tax)}
        </span>
      </div>
      
      <Separator className="my-2" />
      
      <div className="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span className="text-primary">{formatCurrency(total)}</span>
      </div>
    </div>
  );

  const cartContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="font-semibold">Cart</span>
          {cart.length > 0 && (
            <Badge variant="secondary" className="rounded-full">
              {cart.length}
            </Badge>
          )}
        </div>
        {cart.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground hover:text-destructive">
            <X className="h-4 w-4 mr-1" />Clear
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden py-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ShoppingCart className="h-16 w-16 mb-3 opacity-20" />
            <p className="font-medium">No items yet</p>
            <p className="text-sm">Select items to add to cart</p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-2">
            <div className="space-y-2">
              {cart.map((item) => (
                <CartItemRow 
                  key={item.id} 
                  item={item} 
                  isHighlighted={lastAddedItem === item.id}
                  onUpdateQuantity={onUpdateQuantity}
                  onQuantityInput={onQuantityInput}
                  onRemove={onRemove}
                  onToggleSellMode={onToggleSellMode}
                  onPriceInput={onPriceInput}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t pt-3 mt-auto bg-background">
          {cartSummary}
          <Button 
            className="w-full mt-4" 
            size="lg" 
            onClick={onCheckout} 
            disabled={cart.length === 0 || isLoading}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Complete Sale
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="default" 
            size="default"
            className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg h-12 px-4"
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.length > 0 ? (
              <>
                <span className="font-bold ml-1.5 text-sm">{formatCurrency(total)}</span>
                <Badge variant="secondary" className="ml-1.5 rounded-full text-xs">
                  {cart.length}
                </Badge>
              </>
            ) : (
              <span className="ml-1.5">Cart</span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[85vw] max-w-sm">
          <SheetHeader className="sr-only">
            <SheetTitle>Shopping Cart</SheetTitle>
          </SheetHeader>
          <div className="h-full pt-2">
            {cartContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="p-3 h-full">
        {cartContent}
      </div>
    </Card>
  );
}
