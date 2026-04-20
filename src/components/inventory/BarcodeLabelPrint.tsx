import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, X } from "lucide-react";
import { toast } from "sonner";
import JsBarcode from "jsbarcode";

interface BarcodeLabelPrintProps {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    sku: string | null;
    unit: string;
  };
  barcodeValue: string;
}

type LabelSize = "40x30" | "50x25";

const LABEL_SIZES: Record<LabelSize, { width: number; height: number; name: string }> = {
  "40x30": { width: 40, height: 30, name: "40×30mm" },
  "50x25": { width: 50, height: 25, name: "50×25mm" },
};

export function BarcodeLabelPrint({ open, onClose, product, barcodeValue }: BarcodeLabelPrintProps) {
  const [labelSize, setLabelSize] = useState<LabelSize>("40x30");
  const [quantity, setQuantity] = useState(1);
  const [barcodeReady, setBarcodeReady] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const generateBarcode = useCallback(() => {
    if (barcodeRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
          margin: 2,
          textMargin: 2,
        });
        setBarcodeReady(true);
      } catch (error) {
        console.error("Error generating barcode:", error);
        setBarcodeReady(false);
      }
    }
  }, [barcodeValue]);

  // Generate barcode after dialog mounts with a small delay for DOM readiness
  useEffect(() => {
    if (!open) {
      setBarcodeReady(false);
      return;
    }
    const timer = setTimeout(generateBarcode, 100);
    return () => clearTimeout(timer);
  }, [open, generateBarcode]);

  const handlePrint = () => {
    if (!barcodeRef.current?.innerHTML) {
      toast.error("Barcode not generated yet. Please wait and try again.");
      return;
    }

    const size = LABEL_SIZES[labelSize];
    const labels = Array(quantity).fill(null);
    const barcodeHtml = barcodeRef.current.outerHTML;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Labels</title>
        <style>
          @page {
            size: ${size.width}mm ${size.height}mm;
            margin: 0;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }
          .label {
            width: ${size.width}mm;
            height: ${size.height}mm;
            padding: 1mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            overflow: hidden;
          }
          .label:last-child { page-break-after: auto; }
          .product-name {
            font-size: 7pt;
            font-weight: bold;
            text-align: center;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-bottom: 1mm;
          }
          .barcode-container {
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .barcode-container svg {
            max-width: ${size.width - 4}mm;
            height: auto;
          }
          .sku-label {
            font-size: 6pt;
            color: #666;
            margin-top: 1mm;
          }
        </style>
      </head>
      <body>
        ${labels.map(() => `
          <div class="label">
            <div class="product-name">${product.name}</div>
            <div class="barcode-container">${barcodeHtml}</div>
            <div class="sku-label">${product.sku || barcodeValue}</div>
          </div>
        `).join('')}
      </body>
      </html>
    `;

    const isAndroidDevice = /Android/i.test(navigator.userAgent);

    if (isAndroidDevice) {
      // Use iframe for Android/RawBT compatibility
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        toast.error("Could not create print frame. Please try again.");
        return;
      }

      iframeDoc.open();
      iframeDoc.write(printContent);
      iframeDoc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Iframe print failed:', e);
          // Fallback: open as Blob URL in a new tab
          try {
            const blob = new Blob([printContent], { type: 'text/html' });
            const blobUrl = URL.createObjectURL(blob);
            const win = window.open(blobUrl, '_blank');
            if (win) {
              win.onload = () => {
                setTimeout(() => { win.print(); URL.revokeObjectURL(blobUrl); }, 500);
              };
            } else {
              URL.revokeObjectURL(blobUrl);
              toast.error("Printing failed. Please allow pop-ups and try again.");
            }
          } catch {
            toast.error("Printing failed. Please try again.");
          }
        }
        // Cleanup iframe after print spooler has time to process
        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch {}
        }, 5000);
      };

      // Use onload event with a fallback timeout
      let loaded = false;
      iframe.onload = () => {
        if (loaded) return;
        loaded = true;
        triggerPrint();
      };
      setTimeout(() => {
        if (loaded) return;
        loaded = true;
        triggerPrint();
      }, 1000);
    } else {
      // Desktop: use window.open
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Pop-up blocked. Please allow pop-ups for this site and try again.");
        return;
      }

      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };

      setTimeout(() => {
        try {
          if (!printWindow.closed) {
            printWindow.print();
            printWindow.close();
          }
        } catch (_) {
          // Window may have already been closed
        }
      }, 500);
    }
  };

  const formatUnit = (unit: string) => unit.replace(/:decimal$/i, '');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Barcode Labels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          <div className="border rounded-lg p-4 bg-white">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-center truncate max-w-full">
                {product.name}
              </p>
              <svg ref={barcodeRef} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {product.sku || barcodeValue} • {formatUnit(product.unit)}
              </p>
            </div>
          </div>

          {/* Settings */}
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Label Size</Label>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LABEL_SIZES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={!barcodeReady}>
            <Printer className="h-4 w-4 mr-2" />
            Print {quantity} Label{quantity > 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
