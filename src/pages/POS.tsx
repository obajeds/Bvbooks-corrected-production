import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScanBarcode, Loader2, Printer, Check, Wallet, CreditCard, Banknote, Smartphone, User, X, Gift, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { useBranchStock } from "@/hooks/useBranchStock";
import { useCategories } from "@/hooks/useCategories";
import { useCreateSale, Sale } from "@/hooks/useSales";
import { useBranchContext } from "@/contexts/BranchContext";
import { useBusiness } from "@/hooks/useBusiness";
import { printInvoice } from "@/components/sales/InvoicePrint";
import { useBarcodeSettings } from "@/hooks/useBarcodeSettings";
import { useBarcodes } from "@/hooks/useBarcodes";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useOfflineSalesSync } from "@/hooks/useOfflineSalesSync";
import { useDiscountLimit } from "@/hooks/useDiscountLimit";
import { useCustomers } from "@/hooks/useCustomers";
import { useCreditSalesEnabled, useRecordCreditSale } from "@/hooks/useCreditSales";
import { useCurrency } from "@/hooks/useCurrency";
import { usePOSMode } from "@/hooks/usePOSMode";
import { POSModeToggle } from "@/components/pos/POSModeToggle";
import { POSCategoryGrid } from "@/components/pos/POSCategoryGrid";
import { POSListView } from "@/components/pos/POSListView";
import { POSCart } from "@/components/pos/POSCart";
import { SyncStatusIndicator } from "@/components/pos/SyncStatusIndicator";
import { SalesSyncStatusCard } from "@/components/pos/SalesSyncStatusCard";
import { CustomerSearchSelector } from "@/components/pos/CustomerSearchSelector";
import { useRewardsRedemption, DISCOUNT_REASONS } from "@/hooks/useRewardsRedemption";
import { useRewardsSettings, REWARDS_LIMITS } from "@/hooks/useRewardsSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCreateApprovalRequest } from "@/hooks/useApprovalRequests";
import { useCurrentActiveDiscount } from "@/hooks/useActiveDiscounts";
import { DiscountReasonId } from "@/hooks/useRewardsRedemption";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { SubscriptionOverlay } from "@/components/subscription/SubscriptionBlocker";
import { useCartPersistence } from "@/hooks/useCartPersistence";
import { SavedCartsPanel } from "@/components/pos/SavedCartsPanel";
import { useCheckoutValidation, type PriceChange, type StockIssue } from "@/hooks/useCheckoutValidation";
import { 
  RewardsDiscountPanel, 
  RewardsDiscountState, 
  createDefaultRewardsDiscountState,
  validateDiscountState,
  getDiscountAmount,
} from "@/components/pos/RewardsDiscountPanel";
interface CartItem {
  id: string;
  name: string;
  price: number;
  cost_price: number;
  stock: number;
  quantity: number;
  sku: string | null;
  unit: string;
  sellMode: "quantity" | "price";
  allowsPriceSale: boolean;
  allowsDecimal: boolean;
  enteredPrice?: number;
  priceAtTimeAdded?: number;
}

const POS = () => {
  const { currentBranch } = useBranchContext();
  const { data: business } = useBusiness();
  const { data: allProducts = [], isLoading: productsLoading } = useProducts();
  const { data: branchStockData = [] } = useBranchStock();
  const branchStockMap = useMemo(() => new Map(branchStockData.map(bs => [bs.product_id, Number(bs.quantity)])), [branchStockData]);
  const getBranchQty = (productId: string, fallback: number) => branchStockMap.get(productId) ?? fallback;
  // Only show products that exist in the current branch's stock
  const products = useMemo(() => allProducts.filter(p => branchStockMap.has(p.id)), [allProducts, branchStockMap]);
  const { data: categories = [] } = useCategories();
  const createSale = useCreateSale();
  const { data: barcodeSettings } = useBarcodeSettings();
  const { data: barcodes = [] } = useBarcodes();
  
  const isBarcodeEnabled = barcodeSettings?.is_enabled ?? false;
  
  // Offline sync (legacy)
  const {
    isOnline,
    pendingSalesCount,
    queueOfflineSale,
    cacheProducts,
    cacheBarcodes,
  } = useOfflineSync(business?.id, currentBranch?.id);
  
  // New offline sales sync with device tracking
  const { syncStatus, queueSale } = useOfflineSalesSync();
  
  const { data: discountData } = useDiscountLimit();
  const { data: activeDiscount } = useCurrentActiveDiscount();
  const { data: customers = [] } = useCustomers();
  const { data: creditSalesEnabled } = useCreditSalesEnabled();
  const recordCreditSale = useRecordCreditSale();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const { validateCart, isValidating } = useCheckoutValidation();
  
  // Rewards system
  const { data: rewardsSettings } = useRewardsSettings();
  const { isRewardsEnabled, maxDiscountPercent, processRedemption, isProcessing: isRewardsProcessing } = useRewardsRedemption();
  
  // User role for discount requests
  const { data: roleData } = useUserRole();
  const createApprovalRequest = useCreateApprovalRequest();
  const [isRequestingDiscount, setIsRequestingDiscount] = useState(false);
  
  // POS Mode state
  const { mode, setMode } = usePOSMode();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  // Cart state (persisted)
  const { cart, setCart, clearCart: persistedClearCart, savedCarts, saveCart, loadSavedCart, deleteSavedCart } = useCartPersistence();
  const [discountPercent, setDiscountPercent] = useState<string>("");
  
  // Rewards/Discount state (new system)
  const [rewardsDiscountState, setRewardsDiscountState] = useState<RewardsDiscountState>(createDefaultRewardsDiscountState());
  
  // Checkout state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [isSplitPaymentMode, setIsSplitPaymentMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: string }[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState("");
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationPriceChanges, setValidationPriceChanges] = useState<PriceChange[]>([]);
  const [validationStockIssues, setValidationStockIssues] = useState<StockIssue[]>([]);
  // Tax toggle state — default from saved settings
  const [taxRate, setTaxRate] = useState(0.075);
  const [taxName, setTaxName] = useState("VAT");
  const [taxEnabled, setTaxEnabled] = useState(() => {
    if (business?.id) {
      try {
        const saved = localStorage.getItem(`tax_settings_${business.id}`);
        if (saved) {
          const s = JSON.parse(saved);
          return s.enabled ?? false;
        }
      } catch {}
    }
    return false;
  });

  // Load tax rate/name from saved settings
  useEffect(() => {
    if (business?.id) {
      try {
        const saved = localStorage.getItem(`tax_settings_${business.id}`);
        if (saved) {
          const s = JSON.parse(saved);
          if (s.rate) setTaxRate(parseFloat(s.rate) / 100);
          if (s.name) setTaxName(s.name);
          setTaxEnabled(s.enabled ?? false);
        }
      } catch {}
    }
  }, [business?.id]);
  
  // Barcode state
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut for barcode input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cache products and barcodes for offline use
  useEffect(() => {
    if (products.length > 0) cacheProducts(products);
  }, [products, cacheProducts]);

  useEffect(() => {
    if (barcodes.length > 0) cacheBarcodes(barcodes);
  }, [barcodes, cacheBarcodes]);

  // Reset rewards discount state when customer changes
  useEffect(() => {
    setRewardsDiscountState(createDefaultRewardsDiscountState());
  }, [selectedCustomerId]);

  // Handle discount approval request
  const handleRequestDiscountApproval = async (
    percent: number,
    amount: number,
    reason: DiscountReasonId
  ) => {
    if (!roleData?.staffId) {
      toast.error("Unable to submit request. Staff ID not found.");
      return;
    }

    const reasonLabel = DISCOUNT_REASONS.find(r => r.id === reason)?.label || reason;

    setIsRequestingDiscount(true);
    try {
      await createApprovalRequest.mutateAsync({
        request_type: "discount",
        requested_by: roleData.staffId,
        amount: amount,
        notes: JSON.stringify({
          discountPercent: percent,
          discountAmount: amount,
          reason: reasonLabel,
          cartSubtotal: subtotal,
          customerId: selectedCustomerId || null,
        }),
      });
      toast.success("Discount approval request submitted!");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit discount request");
    } finally {
      setIsRequestingDiscount(false);
    }
  };


  const getQuantityStep = (_unit: string, allowsDecimal?: boolean) => {
    return allowsDecimal ? 0.5 : 1;
  };

  const formatQuantity = (qty: number) => {
    const rounded = Math.round(qty * 100) / 100;
    if (Number.isInteger(rounded)) return rounded.toFixed(0);
    return rounded.toString().replace(/\.?0+$/, '');
  };

  // Barcode handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    const searchValue = barcodeInput.trim();
    const barcodeRecord = barcodes.find(b => b.barcode_value === searchValue);
    if (barcodeRecord) {
      const product = products.find(p => p.id === barcodeRecord.product_id);
      if (product) {
        addToCart(product);
        setBarcodeInput("");
        return;
      }
    }
    
    const product = products.find(p => 
      p.barcode === searchValue || 
      p.sku?.toLowerCase() === searchValue.toLowerCase()
    );
    
    if (product) {
      addToCart(product);
    } else {
      toast.error("Product not found for this barcode");
    }
    setBarcodeInput("");
  };

  // Cart operations
  const addToCart = (product: typeof products[0]) => {
    const existing = cart.find((item) => item.id === product.id);
    const allowsDecimal = product.allows_decimal_quantity || false;
    const step = getQuantityStep(product.unit, allowsDecimal);
    const allowsPriceSale = product.allows_price_based_sale || false;
    const branchQty = getBranchQty(product.id, product.stock_quantity);
    
    if (existing) {
      if (existing.quantity >= branchQty) {
        toast.error("Cannot add more - insufficient stock");
        return;
      }
      setCart(cart.map((item) => item.id === product.id ? { ...item, quantity: Math.round((item.quantity + step) * 100) / 100 } : item));
    } else {
      setCart([...cart, { 
        id: product.id, 
        name: product.name, 
        price: Number(product.selling_price),
        cost_price: Number(product.cost_price) || 0,
        stock: branchQty, 
        quantity: step, 
        sku: product.sku,
        unit: product.unit,
        sellMode: "quantity",
        allowsPriceSale,
        allowsDecimal,
        priceAtTimeAdded: Number(product.selling_price),
      }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.id === productId) {
        const step = getQuantityStep(item.unit, item.allowsDecimal);
        const newQty = Math.round((item.quantity + (delta * step)) * 100) / 100;
        if (newQty > item.stock) { toast.error("Insufficient stock"); return item; }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter((item) => item.quantity > 0));
  };

  const handleQuantityInput = (productId: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setCart(cart.map((item) => {
      if (item.id === productId) {
        const step = getQuantityStep(item.unit, item.allowsDecimal);
        const roundedValue = item.allowsDecimal 
          ? Math.round(numValue * 100) / 100 
          : Math.round(numValue);
        if (roundedValue > item.stock) { 
          toast.error("Insufficient stock"); 
          return item; 
        }
        if (roundedValue < step) return item;
        return { ...item, quantity: roundedValue };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => setCart(cart.filter((item) => item.id !== productId));
  
  const clearCart = () => { 
    persistedClearCart(); 
    toast.info("Cart cleared"); 
    setShowClearCartConfirm(false); 
  };
  
  const handleClearCartClick = () => { 
    if (cart.length > 0) setShowClearCartConfirm(true); 
  };

  const toggleSellMode = (productId: string) => {
    setCart(cart.map(item => {
      if (item.id === productId && item.allowsPriceSale) {
        const newMode = item.sellMode === "quantity" ? "price" : "quantity";
        if (newMode === "price") {
          const enteredPrice = item.price * item.quantity;
          return { ...item, sellMode: newMode, enteredPrice };
        }
        return { ...item, sellMode: newMode, enteredPrice: undefined };
      }
      return item;
    }));
  };

  const handlePriceInput = (productId: string, value: string) => {
    if (value === "" || value === ".") {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, enteredPrice: 0, quantity: 0 }
          : item
      ));
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    
    setCart(cart.map(item => {
      if (item.id === productId) {
        const calculatedQty = numValue / item.price;
        const roundedQty = Math.round(calculatedQty * 1000) / 1000;
        
        if (roundedQty > item.stock) {
          toast.error("Insufficient stock for this amount");
          return item;
        }
        
        return { ...item, enteredPrice: numValue, quantity: roundedQty };
      }
      return item;
    }));
  };

  // Pricing calculations - now uses new rewards/discount system
  const subtotal = cart.reduce((sum, item) => {
    if (item.sellMode === "price" && item.enteredPrice !== undefined) {
      return sum + item.enteredPrice;
    }
    return sum + item.price * item.quantity;
  }, 0);
  
  // Get selected customer's vault balance
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const customerVaultBalance = selectedCustomer?.reward_points_value ?? 0;
  
  // Calculate discount from new system OR legacy percentage input
  const newSystemDiscountAmount = getDiscountAmount(rewardsDiscountState);
  const legacyDiscountPercentValue = parseFloat(discountPercent) || 0;
  const legacyDiscountAmount = (subtotal * legacyDiscountPercentValue) / 100;
  
  // Use new system if active, otherwise fall back to legacy
  const discountAmount = newSystemDiscountAmount > 0 ? newSystemDiscountAmount : legacyDiscountAmount;
  const discountPercentValue = newSystemDiscountAmount > 0 
    ? (newSystemDiscountAmount / subtotal) * 100 
    : legacyDiscountPercentValue;
  
  const discountedSubtotal = subtotal - discountAmount;
  const tax = taxEnabled ? discountedSubtotal * taxRate : 0;
  const total = discountedSubtotal + tax;
  
  const discountLimit = discountData?.discountLimit ?? 0;
  const canApplyDiscount = discountData?.canApplyDiscount ?? false;

  const handleDiscountChange = (value: string) => {
    const numValue = parseFloat(value);
    if (value === "" || (numValue >= 0 && numValue <= 100)) {
      setDiscountPercent(value);
      if (numValue > discountLimit && !discountData?.canOverrideDiscount) {
        toast.warning(`Your discount limit is ${discountLimit}%`);
      }
    }
  };

  const handleCheckout = () => { 
    if (cart.length === 0) { toast.error("Cart is empty"); return; } 
    setIsCheckoutOpen(true); 
  };

  // Split payment handling - use explicit mode flag
  const isSplitPayment = isSplitPaymentMode;
  const validSplitPayments = splitPayments.filter(p => p.method !== "" && p.method !== undefined);
  
  const getCalculatedSplitPayments = () => {
    if (validSplitPayments.length === 0) return [];
    const firstAmount = parseFloat(validSplitPayments[0]?.amount) || 0;
    return validSplitPayments.map((p, index) => ({
      ...p,
      calculatedAmount: index === 0 ? firstAmount : Math.max(0, total - firstAmount)
    }));
  };
  
  const calculatedSplitPayments = getCalculatedSplitPayments();
  const splitPaymentTotal = calculatedSplitPayments.reduce((sum, p) => sum + p.calculatedAmount, 0);
  
  const toggleSplitPaymentMethod = (method: string) => {
    const existing = splitPayments.find(p => p.method === method);
    if (existing) {
      const newPayments = splitPayments.filter(p => p.method !== method);
      setSplitPayments(newPayments);
    } else {
      setSplitPayments([...splitPayments, { method, amount: "" }]);
    }
  };

  const updateSplitPaymentAmount = (method: string, amount: string) => {
    setSplitPayments(splitPayments.map(p => 
      p.method === method ? { ...p, amount } : p
    ));
  };

  const getPaymentMethodString = () => {
    if (isSplitPayment) {
      return calculatedSplitPayments.map(p => `${p.method}:${p.calculatedAmount.toFixed(2)}`).join(',');
    }
    return paymentMethod;
  };

  const getPaymentMethodDisplay = () => {
    if (isSplitPayment) {
      return validSplitPayments.map(p => p.method.toUpperCase()).join(' + ');
    }
    return paymentMethod?.toUpperCase() || '';
  };

  const processPayment = async () => {
    if (isSplitPayment) {
      if (validSplitPayments.length < 2) {
        toast.error("Please select at least two payment methods for split payment");
        return;
      }
      const firstPaymentAmount = parseFloat(validSplitPayments[0]?.amount) || 0;
      if (firstPaymentAmount <= 0) {
        toast.error("Please enter the first payment amount");
        return;
      }
      if (firstPaymentAmount >= total) {
        toast.error("First payment cannot be the full amount. Use single payment instead.");
        return;
      }
      if (validSplitPayments.some(p => p.method === "credit") && !selectedCustomerId) {
        toast.error("Please select a customer for credit payment");
        return;
      }
    } else {
      if (!paymentMethod) { toast.error("Please select a payment method"); return; }
      if (paymentMethod === "credit" && !selectedCustomerId) {
        toast.error("Please select a customer for credit sale");
        return;
      }
      const paid = parseFloat(amountPaid) || 0;
      if (paymentMethod === "cash" && paid < total) { 
        toast.error("Amount paid is less than total"); 
        return; 
      }
    }

    const paymentMethodStr = getPaymentMethodString();
    const hasCredit = isSplitPayment 
      ? validSplitPayments.some(p => p.method === "credit")
      : paymentMethod === "credit";
    
    // Generate invoice number for offline use
    const offlineInvoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Determine discount tracking metadata
    const discountType = rewardsDiscountState.mode === "rewards" 
      ? "rewards_redemption" as const
      : (discountAmount > 0 ? "company_discount" as const : null);
    const discountReason = rewardsDiscountState.mode === "company" 
      ? (DISCOUNT_REASONS.find(r => r.id === rewardsDiscountState.discountReason)?.label || null)
      : (rewardsDiscountState.mode === "rewards" ? "Rewards redemption" : null);
    const discountApprovedBy = activeDiscount?.approved_by || null;
    
    // Prepare sale data
    const saleData = {
      branch_id: currentBranch?.id,
      customer_id: selectedCustomerId || null,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: tax,
      total_amount: total,
      payment_method: paymentMethodStr,
      payment_status: hasCredit ? "pending" : "completed",
      discount_type: discountType,
      discount_reason: discountReason,
      discount_approved_by: discountApprovedBy,
      rewards_redeemed_value: rewardsDiscountState.mode === "rewards" ? rewardsDiscountState.rewardsAmount : 0,
      items: cart.map(item => ({ 
        product_id: item.id, 
        product_name: item.name, 
        quantity: item.quantity, 
        unit_price: item.price, 
        total_price: item.price * item.quantity,
        cost_price: item.cost_price,
        discount: 0,
      })),
    };

    // Helper function to complete the sale UI flow
    const completeSaleFlow = (saleResult: Sale | null, isOffline: boolean = false) => {
      const offlineSaleId = crypto.randomUUID();
      const nowIso = new Date().toISOString();
      const completeSale: Sale = saleResult || {
        id: offlineSaleId,
        business_id: business?.id || '',
        branch_id: currentBranch?.id || '',
        customer_id: selectedCustomerId || null,
        invoice_number: offlineInvoiceNumber,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: tax,
        total_amount: total,
        payment_method: paymentMethodStr,
        payment_status: hasCredit ? "pending" : "completed",
        notes: isOffline ? "Offline sale - pending sync" : null,
        created_at: nowIso,
        updated_at: nowIso,
        created_by: null,
        sale_items: cart.map(item => ({
          id: crypto.randomUUID(),
          sale_id: offlineSaleId,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          cost_price: item.cost_price,
          created_at: nowIso,
        })),
      } as Sale;
      
      setCompletedSale(completeSale);
      
      let changeMessage = "";
      if (isSplitPayment) {
        const cashPayment = validSplitPayments.find(p => p.method === "cash");
        if (cashPayment) {
          changeMessage = hasCredit ? "Credit portion recorded." : "";
        }
      } else if (paymentMethod === "cash") {
        const paid = parseFloat(amountPaid) || 0;
        const change = paid - total;
        if (change > 0) changeMessage = `Change: ${formatCurrency(change)}`;
      } else if (paymentMethod === "credit") {
        changeMessage = "Credit sale recorded.";
      }
      
      const offlineNote = isOffline ? " (Saved offline - will sync when online)" : "";
      toast.success(`Sale completed!${offlineNote} ${changeMessage}`);
      
      persistedClearCart();
      setShowConfirmDialog(false);
      setIsCheckoutOpen(false);
      setShowSuccessDialog(true);
      setPaymentMethod("");
      setSplitPayments([]);
      setIsSplitPaymentMode(false);
      setCustomerName("");
      setSelectedCustomerId("");
      setAmountPaid("");
      setDiscountPercent("");
      setRewardsDiscountState(createDefaultRewardsDiscountState());
    };

    // If offline, queue immediately and show success
    if (!isOnline) {
      queueSale({
        business_id: business?.id || '',
        branch_id: currentBranch?.id,
        customer_id: selectedCustomerId || undefined,
        invoice_number: offlineInvoiceNumber,
        subtotal,
        discount_amount: discountAmount,
        tax_amount: tax,
        total_amount: total,
        payment_method: (isSplitPayment ? 'mixed' : paymentMethodStr) as 'cash' | 'card' | 'transfer' | 'credit' | 'mixed',
        payment_status: hasCredit ? "pending" : "completed",
        notes: isSplitPayment ? `Offline sale | Split: ${paymentMethodStr}` : "Offline sale",
        items: saleData.items,
      });
      
      completeSaleFlow(null, true);
      return;
    }

    // Try online sale first
    try {
      const sale = await createSale.mutateAsync(saleData);
      
      // Process rewards redemption if applicable
      if (rewardsDiscountState.mode === "rewards" && rewardsDiscountState.rewardsAmount > 0 && selectedCustomerId) {
        try {
          await processRedemption(selectedCustomerId, rewardsDiscountState.rewardsAmount);
        } catch (rewardsError) {
          console.error("Failed to process rewards redemption:", rewardsError);
          toast.error("Sale completed but rewards deduction failed. Please adjust manually.");
        }
      }
      
      if (hasCredit && selectedCustomerId) {
        const creditAmount = isSplitPayment 
          ? parseFloat(validSplitPayments.find(p => p.method === "credit")?.amount || "0")
          : total;
        await recordCreditSale.mutateAsync({
          customerId: selectedCustomerId,
          saleId: sale.id,
          amount: creditAmount,
          notes: `Credit sale - Invoice ${sale.invoice_number}`,
        });
      }
      
      const fullSale: Sale = {
        id: sale.id,
        invoice_number: sale.invoice_number,
        business_id: business?.id || '',
        branch_id: currentBranch?.id || null,
        customer_id: selectedCustomerId || null,
        subtotal: subtotal,
        discount_amount: discountAmount,
        tax_amount: 0,
        total_amount: total,
        payment_method: isSplitPayment ? 'split' : paymentMethod,
        payment_status: 'completed',
        notes: null,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        device_id: null,
        offline_signature: null,
        sync_status: null,
        discount_type: null,
        discount_reason: null,
        discount_approved_by: null,
        rewards_redeemed_value: rewardsDiscountState.mode === "rewards" && rewardsDiscountState.rewardsAmount > 0 ? rewardsDiscountState.rewardsAmount : null,
        sale_items: cart.map(item => ({
          id: '',
          sale_id: sale.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          cost_price: item.cost_price ?? 0,
          discount: 0,
          created_at: new Date().toISOString(),
        })),
      };
      
      completeSaleFlow(fullSale, false);
    } catch (error: any) {
      const errorMessage = error?.message || "";
      const isNetworkError = (error as any)?.isTransportError ||
                              errorMessage.includes("Load failed") || 
                              errorMessage.includes("Failed to send a request") ||
                              errorMessage.includes("Failed to fetch") ||
                              errorMessage.includes("Unable to reach the server") ||
                              !navigator.onLine;
      
      if (isNetworkError) {
        // Queue for offline sync and complete the sale UI
        queueSale({
          business_id: business?.id || '',
          branch_id: currentBranch?.id,
          customer_id: selectedCustomerId || undefined,
          invoice_number: offlineInvoiceNumber,
          subtotal,
          discount_amount: discountAmount,
          tax_amount: tax,
          total_amount: total,
          payment_method: (isSplitPayment ? 'mixed' : paymentMethodStr) as 'cash' | 'card' | 'transfer' | 'credit' | 'mixed',
          payment_status: hasCredit ? "pending" : "completed",
          notes: isSplitPayment ? `Offline sale - network error | Split: ${paymentMethodStr}` : "Offline sale - network error",
          items: saleData.items,
        });
        
        completeSaleFlow(null, true);
      } else if (errorMessage.includes("check constraint")) {
        toast.error("Invalid sale data. Please try again.");
      } else {
        toast.error(errorMessage || "Failed to complete sale. Please try again.");
      }
    }
  };

  const handlePrintReceipt = () => {
    if (completedSale) {
      printInvoice(completedSale, {
        businessName: business?.trading_name || "Your Business",
        businessAddress: business?.address || "",
        businessPhone: business?.phone || "",
      });
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessDialog(false);
    setCompletedSale(null);
  };

  if (productsLoading) {
    return <main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;
  }

  // Sales sync status indicator with today's sync details
  const offlineIndicator = <SalesSyncStatusCard compact />;

  return (
    <SubscriptionOverlay>
    <main className="flex-1 overflow-hidden flex flex-col md:flex-row gap-4 p-4 h-full">
      {/* Product selection area */}
      <div className="flex-1 flex flex-col min-h-0 md:min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-2 sm:pb-3 flex-shrink-0 space-y-2 sm:space-y-3 px-3 sm:px-6 pt-3 sm:pt-6">
            {/* Header with title and mode toggle */}
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Point of Sale</h1>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <SavedCartsPanel
                  savedCarts={savedCarts}
                  currentCartLength={cart.length}
                  onSaveCart={() => { saveCart(); toast.success("Cart held — start a new sale"); }}
                  onLoadCart={(id) => { loadSavedCart(id); toast.success("Cart restored"); }}
                  onDeleteCart={(id) => { deleteSavedCart(id); toast.info("Held cart discarded"); }}
                  formatCurrency={formatCurrency}
                />
                {offlineIndicator}
                <POSModeToggle mode={mode} onModeChange={setMode} />
              </div>
            </div>
            
            {/* Barcode scanner */}
            {isBarcodeEnabled && (
              <form onSubmit={handleBarcodeSubmit}>
                <div className="relative">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input 
                    ref={barcodeInputRef} 
                    placeholder="Scan barcode or enter SKU (Press F2)" 
                    value={barcodeInput} 
                    onChange={(e) => setBarcodeInput(e.target.value)} 
                    className="pl-10 border-primary/50" 
                  />
                </div>
              </form>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0">
            {mode === 'categories' ? (
              <POSCategoryGrid
                categories={categories}
                products={products}
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={setSelectedCategoryId}
                onProductSelect={addToCart}
                formatCurrency={formatCurrency}
              />
            ) : (
              <POSListView
                products={products}
                categories={categories}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                onProductSelect={addToCart}
                formatCurrency={formatCurrency}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cart */}
      <div className="md:hidden">
        <POSCart
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onQuantityInput={handleQuantityInput}
          onRemove={removeFromCart}
          onClear={handleClearCartClick}
          onToggleSellMode={toggleSellMode}
          onPriceInput={handlePriceInput}
          onCheckout={handleCheckout}
          subtotal={subtotal}
          discountPercent={discountPercent}
          onDiscountChange={handleDiscountChange}
          discountAmount={discountAmount}
          discountLimit={discountLimit}
          canApplyDiscount={canApplyDiscount}
          tax={tax}
           taxEnabled={taxEnabled}
           onTaxToggle={setTaxEnabled}
           taxName={taxName}
           taxRate={parseFloat((taxRate * 100).toFixed(2))}
           total={total}
          formatCurrency={formatCurrency}
          isLoading={createSale.isPending}
          isMobile={true}
        />
      </div>

      {/* Desktop/Tablet Cart */}
      <div className="hidden md:flex w-[280px] xl:w-[320px] flex-col min-h-0">
        <POSCart
          cart={cart}
          onUpdateQuantity={updateQuantity}
          onQuantityInput={handleQuantityInput}
          onRemove={removeFromCart}
          onClear={handleClearCartClick}
          onToggleSellMode={toggleSellMode}
          onPriceInput={handlePriceInput}
          onCheckout={handleCheckout}
          subtotal={subtotal}
          discountPercent={discountPercent}
          onDiscountChange={handleDiscountChange}
          discountAmount={discountAmount}
          discountLimit={discountLimit}
          canApplyDiscount={canApplyDiscount}
          tax={tax}
           taxEnabled={taxEnabled}
           onTaxToggle={setTaxEnabled}
           taxName={taxName}
           taxRate={parseFloat((taxRate * 100).toFixed(2))}
           total={total}
          formatCurrency={formatCurrency}
          isLoading={createSale.isPending}
          isMobile={false}
        />
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Customer selection */}
            <div>
              <label className="text-sm font-medium">Customer (Optional)</label>
              <CustomerSearchSelector
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onSelect={setSelectedCustomerId}
                formatCurrency={formatCurrency}
              />
            </div>

            {/* Rewards/Discount Panel - show for rewards or discount requests */}
            {(() => {
              const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
              const vaultBalance = selectedCustomer?.reward_points_value ?? 0;
              const canRequestDiscount = !discountData?.canApplyCompanyDiscount && !!roleData?.staffId;
              
              // Show panel if: has customer with rewards, or can apply discount, or can request discount
              const showPanel = (isRewardsEnabled && selectedCustomerId && selectedCustomerId !== "walk-in") 
                || discountData?.canApplyCompanyDiscount 
                || canRequestDiscount;
              
              if (!showPanel) return null;
              
              return (
                <RewardsDiscountPanel
                  selectedCustomerId={selectedCustomerId || null}
                  customerVaultBalance={vaultBalance}
                  customerName={selectedCustomer?.name ?? null}
                  cartSubtotal={subtotal}
                  permissions={discountData}
                  maxDiscountPercent={maxDiscountPercent}
                  isRewardsEnabled={isRewardsEnabled}
                  state={rewardsDiscountState}
                  onStateChange={setRewardsDiscountState}
                  formatCurrency={formatCurrency}
                  isMobile={true}
                  onRequestDiscountApproval={canRequestDiscount ? handleRequestDiscountApproval : undefined}
                  isRequestingApproval={isRequestingDiscount}
                />
              );
            })()}
            {/* Payment methods */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (isSplitPaymentMode) {
                      // Switch to single payment mode
                      setIsSplitPaymentMode(false);
                      setSplitPayments([]);
                    } else {
                      // Switch to split payment mode
                      setIsSplitPaymentMode(true);
                      setPaymentMethod("");
                      setSplitPayments([]);
                    }
                  }}
                  className="text-xs h-7"
                >
                  {isSplitPaymentMode ? "Single Payment" : "Split Payment"}
                </Button>
              </div>
              
              {!isSplitPayment ? (
                <div className="grid gap-2 grid-cols-4">
                  <Button variant={paymentMethod === "cash" ? "default" : "outline"} onClick={() => setPaymentMethod("cash")} className="flex flex-col h-auto py-3">
                    <Banknote className="h-5 w-5 mb-1" /><span className="text-xs">Cash</span>
                  </Button>
                  <Button variant={paymentMethod === "transfer" ? "default" : "outline"} onClick={() => setPaymentMethod("transfer")} className="flex flex-col h-auto py-3">
                    <Smartphone className="h-5 w-5 mb-1" /><span className="text-xs">Transfer</span>
                  </Button>
                  <Button variant={paymentMethod === "card" ? "default" : "outline"} onClick={() => setPaymentMethod("card")} className="flex flex-col h-auto py-3">
                    <CreditCard className="h-5 w-5 mb-1" /><span className="text-xs">Card</span>
                  </Button>
                  {creditSalesEnabled && (
                    <Button variant={paymentMethod === "credit" ? "default" : "outline"} onClick={() => setPaymentMethod("credit")} className="flex flex-col h-auto py-3">
                      <Wallet className="h-5 w-5 mb-1" /><span className="text-xs">Credit</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-2 grid-cols-4">
                    <Button 
                      variant={splitPayments.some(p => p.method === "cash") ? "default" : "outline"} 
                      onClick={() => toggleSplitPaymentMethod("cash")} 
                      className="flex flex-col h-auto py-2"
                      size="sm"
                    >
                      <Banknote className="h-4 w-4 mb-1" /><span className="text-xs">Cash</span>
                    </Button>
                    <Button 
                      variant={splitPayments.some(p => p.method === "transfer") ? "default" : "outline"} 
                      onClick={() => toggleSplitPaymentMethod("transfer")} 
                      className="flex flex-col h-auto py-2"
                      size="sm"
                    >
                      <Smartphone className="h-4 w-4 mb-1" /><span className="text-xs">Transfer</span>
                    </Button>
                    <Button 
                      variant={splitPayments.some(p => p.method === "card") ? "default" : "outline"} 
                      onClick={() => toggleSplitPaymentMethod("card")} 
                      className="flex flex-col h-auto py-2"
                      size="sm"
                    >
                      <CreditCard className="h-4 w-4 mb-1" /><span className="text-xs">Card</span>
                    </Button>
                    {creditSalesEnabled && (
                      <Button 
                        variant={splitPayments.some(p => p.method === "credit") ? "default" : "outline"} 
                        onClick={() => toggleSplitPaymentMethod("credit")} 
                        className="flex flex-col h-auto py-2"
                        size="sm"
                      >
                        <Wallet className="h-4 w-4 mb-1" /><span className="text-xs">Credit</span>
                      </Button>
                    )}
                  </div>
                  
                  {validSplitPayments.length > 0 && (
                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                      {calculatedSplitPayments.map((payment, index) => {
                        const isFirstPayment = index === 0;
                        const firstAmount = parseFloat(splitPayments[0]?.amount) || 0;
                        const balanceAmount = Math.max(0, total - firstAmount);
                        
                        return (
                          <div key={payment.method} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium capitalize w-20">{payment.method}</span>
                              {isFirstPayment ? (
                                <Input
                                  type="number"
                                  placeholder="Enter amount"
                                  value={payment.amount}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    const cappedValue = Math.min(value, total - 0.01);
                                    updateSplitPaymentAmount(payment.method, cappedValue > 0 ? cappedValue.toString() : e.target.value);
                                  }}
                                  max={total - 0.01}
                                  className="flex-1 h-8"
                                />
                              ) : (
                                <div className="flex-1 h-8 px-3 flex items-center bg-background border rounded-md text-sm font-semibold">
                                  {formatCurrency(balanceAmount)} <span className="text-muted-foreground font-normal ml-1">(Balance)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      <Separator className="my-2" />
                      <div className="space-y-1.5 text-sm">
                        <div className="font-semibold text-foreground mb-2">Payment Breakdown</div>
                        {calculatedSplitPayments.map((payment) => (
                          <div key={`breakdown-${payment.method}`} className="flex justify-between">
                            <span className="capitalize text-muted-foreground">{payment.method}:</span>
                            <span className="font-medium">{formatCurrency(payment.calculatedAmount)}</span>
                          </div>
                        ))}
                        <Separator className="my-1.5" />
                        <div className="flex justify-between font-bold">
                          <span>Total:</span>
                          <span className={splitPaymentTotal === total ? "text-green-600" : "text-destructive"}>
                            {formatCurrency(splitPaymentTotal)}
                          </span>
                        </div>
                        {splitPaymentTotal === total && (
                          <div className="flex items-center gap-1 text-green-600 text-xs mt-1">
                            <Check className="h-3 w-3" /> Payment complete
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {!isSplitPayment && paymentMethod === "cash" && (
              <div>
                <label className="text-sm font-medium">Amount Paid</label>
                <Input type="number" placeholder="Enter amount" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="mt-1" />
                {amountPaid && parseFloat(amountPaid) >= total && (
                  <p className="text-sm text-green-600 mt-1">Change: {formatCurrency(parseFloat(amountPaid) - total)}</p>
                )}
              </div>
            )}
            
            {!isSplitPayment && paymentMethod === "credit" && selectedCustomerId && (
              <div className="bg-warning/10 border border-warning/30 text-warning-foreground p-3 rounded-lg text-sm">
                <p className="font-medium">Credit Sale</p>
                <p className="text-muted-foreground">This amount will be added to the customer's credit balance.</p>
              </div>
            )}
            
            {isSplitPayment && validSplitPayments.some(p => p.method === "credit") && selectedCustomerId && (
              <div className="bg-warning/10 border border-warning/30 text-warning-foreground p-3 rounded-lg text-sm">
                <p className="font-medium">Partial Credit</p>
                <p className="text-muted-foreground">The credit portion will be added to the customer's balance.</p>
              </div>
            )}
            
            <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600"><span>Discount ({discountPercentValue}%)</span><span>-{formatCurrency(discountAmount)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">VAT (7.5%)</span><span>{formatCurrency(tax)}</span></div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button 
              onClick={async () => {
                if (isSplitPayment) {
                  if (validSplitPayments.length < 2) {
                    toast.error("Please select at least two payment methods for split payment");
                    return;
                  }
                  const firstAmount = parseFloat(validSplitPayments[0]?.amount) || 0;
                  if (firstAmount <= 0) {
                    toast.error("Please enter the first payment amount");
                    return;
                  }
                  if (validSplitPayments.some(p => p.method === "credit") && !selectedCustomerId) {
                    toast.error("Please select a customer for credit payment");
                    return;
                  }
                } else {
                  if (!paymentMethod) { toast.error("Please select a payment method"); return; }
                  if (paymentMethod === "credit" && !selectedCustomerId) {
                    toast.error("Please select a customer for credit sale");
                    return;
                  }
                  const paid = parseFloat(amountPaid) || 0;
                  if (paymentMethod === "cash" && paid < total) { 
                    toast.error("Amount paid is less than total"); 
                    return; 
                  }
                }

                // Run pre-checkout validation (price + stock re-check)
                try {
                  const result = await validateCart(cart, currentBranch?.id);
                  
                  if (result.stockIssues.length > 0) {
                    setValidationStockIssues(result.stockIssues);
                    setValidationPriceChanges(result.priceChanges);
                    setShowValidationDialog(true);
                    return;
                  }

                  if (result.priceChanges.length > 0) {
                    // Update cart with latest prices and show confirmation
                    setCart(result.updatedCart);
                    setValidationPriceChanges(result.priceChanges);
                    setValidationStockIssues([]);
                    setShowValidationDialog(true);
                    return;
                  }

                  // All valid — proceed to confirm
                  setCart(result.updatedCart);
                  setShowConfirmDialog(true);
                } catch (err) {
                  // If validation fails (e.g. offline), allow sale to proceed
                  console.warn("Checkout validation failed, proceeding:", err);
                  setShowConfirmDialog(true);
                }
              }} 
              className="w-full"
              disabled={createSale.isPending || recordCreditSale.isPending || isValidating}
            >
              {isValidating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Validating...</>
              ) : (
                "Continue to Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="w-[95vw] max-w-sm max-h-[70vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-center text-base">Confirm Sale</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {cart.length} item{cart.length > 1 ? 's' : ''} • {getPaymentMethodDisplay()}
              </p>
              {isSplitPayment && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {splitPayments.map(p => (
                    <span key={p.method} className="inline-block bg-muted px-2 py-0.5 rounded mr-1">
                      {p.method}: {formatCurrency(parseFloat(p.amount) || 0)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-muted/50 p-2 rounded-lg space-y-1 text-xs max-h-24 overflow-y-auto">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span className="truncate flex-1">{item.name} × {formatQuantity(item.quantity)}</span>
                  <span className="font-medium ml-2">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            {paymentMethod === "cash" && parseFloat(amountPaid) > total && (
              <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Change</p>
                <p className="text-base font-bold text-green-600">{formatCurrency(parseFloat(amountPaid) - total)}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)} 
              className="flex-1"
              disabled={createSale.isPending || recordCreditSale.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={processPayment} 
              className="flex-1"
              disabled={createSale.isPending || recordCreditSale.isPending}
            >
              {(createSale.isPending || recordCreditSale.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Sale Completed!
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold">Transaction Successful</p>
              {completedSale && (
                <p className="text-muted-foreground mt-1">
                  Invoice: {completedSale.invoice_number}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handlePrintReceipt} className="w-full" variant="default">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              <Button onClick={handleCloseSuccess} variant="outline" className="w-full">
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Confirmation */}
      <Dialog open={showClearCartConfirm} onOpenChange={setShowClearCartConfirm}>
        <DialogContent className="w-[95vw] max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">Clear Cart?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-center">
            <p className="text-muted-foreground text-sm">
              Are you sure you want to remove all {cart.length} item{cart.length > 1 ? 's' : ''} from the cart?
            </p>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowClearCartConfirm(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={clearCart} className="flex-1">
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Validation Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="w-[95vw] max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              {validationStockIssues.length > 0 ? "Stock Issue" : "Price Updated"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {validationStockIssues.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Insufficient stock for these items:</p>
                {validationStockIssues.map((issue) => (
                  <div key={issue.productId} className="flex justify-between items-center p-2 bg-destructive/10 rounded-lg text-sm">
                    <span className="font-medium">{issue.productName}</span>
                    <span>
                      Need: <strong>{issue.requestedQty}</strong> • Available: <strong>{issue.availableStock}</strong>
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Please adjust quantities before proceeding.</p>
              </div>
            )}

            {validationPriceChanges.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Prices have changed since items were added:</p>
                {validationPriceChanges.map((change) => (
                  <div key={change.productId} className="flex justify-between items-center p-2 bg-warning/10 rounded-lg text-sm">
                    <span className="font-medium">{change.productName}</span>
                    <span>
                      <span className="line-through text-muted-foreground">{formatCurrency(change.oldPrice)}</span>
                      {" → "}
                      <strong>{formatCurrency(change.newPrice)}</strong>
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Cart has been updated with current prices.</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowValidationDialog(false)} className="flex-1">
              Go Back
            </Button>
            {validationStockIssues.length === 0 && validationPriceChanges.length > 0 && (
              <Button 
                onClick={() => {
                  setShowValidationDialog(false);
                  setShowConfirmDialog(true);
                }} 
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Accept & Continue
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
    </SubscriptionOverlay>
  );
};

export default POS;
