import { Search, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;
type Product = Tables<"products">;

interface POSListViewProps {
  products: Product[];
  categories: Category[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  onProductSelect: (product: Product) => void;
  formatCurrency: (value: number) => string;
}

export function POSListView({
  products,
  categories,
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onProductSelect,
  formatCurrency,
}: POSListViewProps) {
  // Filter products based on search and category
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === "All" || 
      categories.find(c => c.id === product.category_id)?.name === selectedCategory;
    return matchesSearch && matchesCategory && product.is_active;
  });

  const categoryOptions = ["All", ...categories.map(c => c.name)];

  // Format quantity display
  const formatQuantity = (qty: number) => {
    const rounded = Math.round(qty * 100) / 100;
    if (Number.isInteger(rounded)) return rounded.toFixed(0);
    return rounded.toString().replace(/\.?0+$/, '');
  };

  // Format unit display
  const formatUnit = (unit: string) => unit.replace(/:decimal$/i, '');

  return (
    <div className="h-full flex flex-col">
      {/* Search and filter header */}
      <div className="p-4 pb-3 flex-shrink-0 space-y-3">
        <h2 className="text-lg font-semibold text-foreground">All Items</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search item name..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-popover border">
              {categoryOptions.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Product list - with responsive scroll */}
      <ScrollArea className="flex-1 min-h-0 px-4 pb-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p>No products found</p>
            {searchTerm && <p className="text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProducts.map((product) => {
              const categoryName = categories.find(c => c.id === product.category_id)?.name;
              
              return (
                <button
                  key={product.id}
                  onClick={() => onProductSelect(product)}
                  disabled={product.stock_quantity === 0}
                  className="w-full p-3 bg-card border rounded-lg text-left hover:border-primary hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  {/* Product image */}
                  {product.image_url ? (
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</span>
                      {categoryName && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{categoryName}</span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{formatUnit(product.unit)}</span>
                    </div>
                  </div>

                  {/* Price and stock */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary">
                      {formatCurrency(Number(product.selling_price))}
                    </p>
                    <Badge
                      variant={product.stock_quantity > 10 ? "secondary" : product.stock_quantity > 0 ? "outline" : "destructive"}
                      className="text-xs mt-0.5"
                    >
                      {product.stock_quantity === 0 ? 'Out of stock' : `${formatQuantity(product.stock_quantity)} in stock`}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
