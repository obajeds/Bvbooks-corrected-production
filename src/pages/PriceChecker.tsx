import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Barcode, Search, RotateCcw, PackageCheck, PackageMinus, PackageX, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const IDLE_TIMEOUT_MS = 15_000;

interface ProductResult {
  name: string;
  price: number;
  stockStatus: "In Stock" | "Low Stock" | "Out of Stock";
  unit: string;
  imageUrl: string | null;
}

interface BusinessInfo {
  name: string;
  logoUrl: string | null;
  currency: string;
}

type ViewState = "idle" | "loading" | "found" | "not-found";

// Standalone currency formatter (no hooks — public page, no auth)
const CURRENCY_MAP: Record<string, { symbol: string; locale: string }> = {
  NGN: { symbol: "₦", locale: "en-NG" },
  USD: { symbol: "$", locale: "en-US" },
  GBP: { symbol: "£", locale: "en-GB" },
  EUR: { symbol: "€", locale: "de-DE" },
  GHS: { symbol: "₵", locale: "en-GH" },
  KES: { symbol: "KSh", locale: "en-KE" },
  ZAR: { symbol: "R", locale: "en-ZA" },
};

function formatPrice(amount: number, currencyCode: string): string {
  const cfg = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.NGN;
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

const stockConfig = {
  "In Stock": { icon: PackageCheck, className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  "Low Stock": { icon: PackageMinus, className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  "Out of Stock": { icon: PackageX, className: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export default function PriceChecker() {
  const { businessId } = useParams<{ businessId: string }>();
  const [state, setState] = useState<ViewState>("idle");
  const [inputValue, setInputValue] = useState("");
  const [product, setProduct] = useState<ProductResult | null>(null);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetToIdle = useCallback(() => {
    setState("idle");
    setProduct(null);
    setError(null);
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Auto-reset after showing result
  useEffect(() => {
    if (state === "found" || state === "not-found") {
      idleTimer.current = setTimeout(resetToIdle, IDLE_TIMEOUT_MS);
      return () => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
      };
    }
  }, [state, resetToIdle]);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleLookup = useCallback(
    async (barcodeValue: string) => {
      if (!barcodeValue.trim() || !businessId) return;
      setState("loading");
      setError(null);

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/price-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, barcodeValue: barcodeValue.trim() }),
        });

        if (res.status === 429) {
          setError("Too many requests. Please wait a moment.");
          setState("idle");
          return;
        }

        const data = await res.json();

        if (data.found) {
          setProduct(data.product);
          setBusiness(data.business);
          setState("found");
        } else {
          setState("not-found");
        }
      } catch {
        setError("Connection error. Please try again.");
        setState("idle");
      }

      setInputValue("");
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    [businessId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleLookup(inputValue);
    }
  };

  const StockIcon = product ? stockConfig[product.stockStatus]?.icon : PackageCheck;

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col">
      {/* Header / branding */}
      <header className="flex items-center justify-center gap-3 px-4 py-5 border-b border-white/10">
        {business?.logoUrl && (
          <img
            src={business.logoUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        )}
        <h1 className="text-lg font-semibold tracking-tight text-white/90">
          {business?.name || "Price Checker"}
        </h1>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6 max-w-lg mx-auto w-full">
        {/* Scan input — always visible */}
        <div className="w-full space-y-2">
          <label className="text-sm font-medium text-white/60 block text-center">
            Scan barcode or type product code
          </label>
          <div className="relative">
            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan or type barcode…"
              className="h-14 pl-12 pr-14 text-lg bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-white/30 rounded-xl"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={state === "loading"}
            />
            {inputValue && (
              <button
                type="button"
                onClick={() => handleLookup(inputValue)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {state === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 animate-pulse">
            <Loader2 className="h-10 w-10 text-white/50 animate-spin" />
            <p className="text-white/50 text-sm">Looking up product…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {/* Product found */}
        {state === "found" && product && business && (
          <Card className="w-full bg-white/5 border-white/10 rounded-2xl overflow-hidden">
            {product.imageUrl && (
              <div className="w-full aspect-[3/2] bg-white/5 flex items-center justify-center overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-white leading-tight">
                {product.name}
              </h2>

              <p className="text-4xl font-extrabold tracking-tight text-white">
                {formatPrice(product.price, business.currency)}
              </p>

              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={`${stockConfig[product.stockStatus].className} text-sm px-3 py-1`}
                >
                  <StockIcon className="h-4 w-4 mr-1.5" />
                  {product.stockStatus}
                </Badge>
                <span className="text-white/40 text-sm">
                  Sold per {product.unit}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Not found */}
        {state === "not-found" && (
          <div className="text-center space-y-3 py-6">
            <PackageX className="h-12 w-12 text-white/20 mx-auto" />
            <p className="text-white/60 text-lg font-medium">Product not found</p>
            <p className="text-white/40 text-sm">
              The scanned barcode does not match any product in this store.
            </p>
          </div>
        )}

        {/* Scan another */}
        {(state === "found" || state === "not-found") && (
          <Button
            onClick={resetToIdle}
            variant="outline"
            size="lg"
            className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white rounded-xl gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Scan Another
          </Button>
        )}

        {/* Idle prompt */}
        {state === "idle" && !error && (
          <div className="text-center space-y-1 py-4">
            <Barcode className="h-16 w-16 text-white/10 mx-auto" />
            <p className="text-white/30 text-sm">
              Ready to scan
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-white/20 text-xs border-t border-white/5">
        Price Checker • Powered by BVBooks
      </footer>
    </div>
  );
}
