import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Barcode, Search } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (barcodeValue: string) => void;
  isEnabled: boolean;
  isLoading?: boolean;
}

export function BarcodeScanner({ onScan, isEnabled, isLoading }: BarcodeScannerProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const lastScanTime = useRef<number>(0);

  // Auto-focus the input when enabled
  useEffect(() => {
    if (isEnabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEnabled]);

  // Handle barcode scanner input
  // Scanners typically input characters rapidly and end with Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      const now = Date.now();
      
      // Debounce to prevent double scans
      if (now - lastScanTime.current > 300) {
        lastScanTime.current = now;
        onScan(inputValue.trim());
        setInputValue("");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Allow manual search with button/enter
  const handleManualSearch = () => {
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue("");
    }
  };

  if (!isEnabled) return null;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Scan barcode or type code..."
            className="pl-10 pr-10"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={isLoading}
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleManualSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Scan a barcode or type the code and press Enter
      </p>
    </div>
  );
}
