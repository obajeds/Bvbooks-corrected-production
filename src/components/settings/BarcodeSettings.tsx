import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Barcode, Save, Info, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useBarcodeSettings, useUpdateBarcodeSettings } from "@/hooks/useBarcodeSettings";
import { useBusiness } from "@/hooks/useBusiness";
import { getAuthBaseUrl } from "@/lib/authUrls";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function BarcodeSettings() {
  const { data: settings, isLoading } = useBarcodeSettings();
  const { data: business } = useBusiness();
  const updateSettings = useUpdateBarcodeSettings();

  const [isEnabled, setIsEnabled] = useState(false);
  const [allowManufacturer, setAllowManufacturer] = useState(true);
  const [allowPrinting, setAllowPrinting] = useState(true);

  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.is_enabled);
      setAllowManufacturer(settings.allow_manufacturer_barcode);
      setAllowPrinting(settings.allow_barcode_printing);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        is_enabled: isEnabled,
        allow_manufacturer_barcode: allowManufacturer,
        allow_barcode_printing: allowPrinting,
      });
      toast.success("Barcode settings saved");
    } catch (error) {
      toast.error("Failed to save barcode settings");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Barcode className="h-5 w-5" />
          Barcode System Settings
        </CardTitle>
        <CardDescription>
          Configure barcode scanning and printing for your business
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            When enabled, barcode scanning will be available at POS. All barcodes use Code 128 format.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="barcode-enabled">Enable Barcode System</Label>
              <p className="text-sm text-muted-foreground">
                Turn on barcode scanning at POS
              </p>
            </div>
            <Switch
              id="barcode-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Barcode Type</Label>
              <p className="text-sm text-muted-foreground">
                Standard format for all barcodes
              </p>
            </div>
            <Input value="Code 128" disabled className="w-32 text-center" />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-manufacturer">Allow Manufacturer Barcodes</Label>
              <p className="text-sm text-muted-foreground">
                Allow attaching existing barcodes from manufacturers
              </p>
            </div>
            <Switch
              id="allow-manufacturer"
              checked={allowManufacturer}
              onCheckedChange={setAllowManufacturer}
              disabled={!isEnabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allow-printing">Allow Barcode Printing</Label>
              <p className="text-sm text-muted-foreground">
                Enable printing of barcode labels
              </p>
            </div>
            <Switch
              id="allow-printing"
              checked={allowPrinting}
              onCheckedChange={setAllowPrinting}
              disabled={!isEnabled}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>

    {isEnabled && business?.id && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Price Checker Kiosk
          </CardTitle>
          <CardDescription>
            Share this link or open it on a tablet for customers to scan barcodes and check prices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={`${getAuthBaseUrl()}/price-check/${business.id}`}
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(`${getAuthBaseUrl()}/price-check/${business.id}`);
                toast.success("Link copied to clipboard");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This public page lets anyone scan a barcode or enter a SKU to see the product name, price, and stock status. No login required — ideal for in-store kiosk tablets.
          </p>
        </CardContent>
      </Card>
    )}
  </>
  );
}
