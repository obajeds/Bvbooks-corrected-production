import { Package, ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Category = Tables<"categories">;
type Product = Tables<"products">;

interface POSCategoryGridProps {
  categories: Category[];
  products: Product[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onProductSelect: (product: Product) => void;
  formatCurrency: (value: number) => string;
}

export function POSCategoryGrid({
  categories,
  products,
  selectedCategoryId,
  onCategorySelect,
  onProductSelect,
  formatCurrency,
}: POSCategoryGridProps) {
  // Get parent categories (no parent)
  const parentCategories = categories.filter(c => c.parent_id === null);
  
  // Get subcategories for a parent
  const getSubcategories = (parentId: string) => 
    categories.filter(c => c.parent_id === parentId);

  // Get item count for a category (including subcategories)
  const getCategoryItemCount = (categoryId: string) => {
    const directCount = products.filter(p => p.category_id === categoryId && p.is_active).length;
    const subcategories = getSubcategories(categoryId);
    const subCount = subcategories.reduce((acc, sub) => 
      acc + products.filter(p => p.category_id === sub.id && p.is_active).length, 0
    );
    return directCount + subCount;
  };

  // Get current category details
  const currentCategory = selectedCategoryId 
    ? categories.find(c => c.id === selectedCategoryId) 
    : null;

  // Get products for selected category
  const categoryProducts = selectedCategoryId
    ? products.filter(p => p.category_id === selectedCategoryId && p.is_active)
    : [];

  // Get subcategories for current selection
  const currentSubcategories = selectedCategoryId 
    ? getSubcategories(selectedCategoryId)
    : [];

  // Format quantity display
  const formatQuantity = (qty: number) => {
    const rounded = Math.round(qty * 100) / 100;
    if (Number.isInteger(rounded)) return rounded.toFixed(0);
    return rounded.toString().replace(/\.?0+$/, '');
  };

  // Format unit display
  const formatUnit = (unit: string) => unit.replace(/:decimal$/i, '');

  // When no category is selected, show category grid
  if (!selectedCategoryId) {
    return (
      <ScrollArea className="h-full">
        <div className="p-3 sm:p-4 pb-24 md:pb-4">
          <h2 className="text-base sm:text-lg font-semibold mb-3 text-foreground">Categories</h2>
          {parentCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p>No categories found. Add categories in Inventory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
              {parentCategories.map((category) => {
                const itemCount = getCategoryItemCount(category.id);
                const hasSubcategories = getSubcategories(category.id).length > 0;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => onCategorySelect(category.id)}
                    className="group relative bg-card border border-border rounded-md text-left hover:border-primary hover:bg-accent transition-all duration-200 overflow-hidden"
                  >
                    {category.image_url ? (
                      <div className="w-full aspect-square overflow-hidden">
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="p-1.5 flex flex-col items-center justify-center min-h-[40px] sm:min-h-[50px]">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Package className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        </div>
                      </div>
                    )}
                    <div className={`p-1 ${category.image_url ? 'bg-background/95' : ''}`}>
                      <p className="font-medium text-[10px] sm:text-xs text-center line-clamp-1">{category.name}</p>
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 py-0 h-4">
                          {itemCount}
                        </Badge>
                        {hasSubcategories && (
                          <Badge variant="outline" className="text-[8px] sm:text-[10px] px-0.5 py-0 h-4">
                            +{getSubcategories(category.id).length}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }

  // When a category is selected, show items
  return (
    <ScrollArea className="h-full">
      <div className="p-3 sm:p-4 pb-24 md:pb-4">
        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // If current category has a parent, go to parent, else go to root
              if (currentCategory?.parent_id) {
                onCategorySelect(currentCategory.parent_id);
              } else {
                onCategorySelect(null);
              }
            }}
            className="flex items-center gap-1 h-8 px-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <span className="text-muted-foreground">•</span>
          <span className="font-medium text-foreground">{currentCategory?.name}</span>
        </div>

        {/* Show subcategories if they exist */}
        {currentSubcategories.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Subcategories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {currentSubcategories.map((sub) => {
                const subItemCount = products.filter(p => p.category_id === sub.id && p.is_active).length;
                return (
                  <button
                    key={sub.id}
                    onClick={() => onCategorySelect(sub.id)}
                    className="p-3 bg-muted/50 border rounded-lg text-left hover:border-primary hover:bg-accent transition-colors"
                  >
                    <p className="font-medium text-sm">{sub.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {subItemCount} item{subItemCount !== 1 ? 's' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Products in category */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Items in {currentCategory?.name}
          </h3>
          {categoryProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No items in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {categoryProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => onProductSelect(product)}
                  disabled={product.stock_quantity === 0}
                  className="p-2 bg-card border rounded-lg text-left hover:border-primary hover:bg-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {product.image_url ? (
                    <div className="w-full aspect-square mb-1.5 rounded-md overflow-hidden bg-muted">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square mb-1.5 rounded-md bg-muted/50 flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <p className="font-semibold text-xs line-clamp-2">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-xs text-primary">
                      {formatCurrency(Number(product.selling_price))}
                    </span>
                    <Badge
                      variant={product.stock_quantity > 10 ? "secondary" : product.stock_quantity > 0 ? "outline" : "destructive"}
                      className="text-[10px] px-1 h-4"
                    >
                      {product.stock_quantity === 0 ? 'Out' : formatQuantity(product.stock_quantity)}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatUnit(product.unit)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
