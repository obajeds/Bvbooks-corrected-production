import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, useUpdateBusiness } from "@/hooks/useBusiness";
import { useQueryClient } from "@tanstack/react-query";

export function BusinessLogoUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const { data: business } = useBusiness();
  const updateBusiness = useUpdateBusiness();
  const queryClient = useQueryClient();

  // Get the current logo URL from business data
  const logoUrl = business?.logo_url || null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${business.id}/logo-${Date.now()}.${fileExt}`;

      // Delete old logo if exists
      if (business.logo_url) {
        const oldPath = business.logo_url.split('/business-logos/')[1];
        if (oldPath) {
          await supabase.storage.from('business-logos').remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-logos')
        .getPublicUrl(fileName);

      // Update business record with new logo URL
      await updateBusiness.mutateAsync({
        id: business.id,
        logo_url: publicUrl,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["business"] });

      toast.success("Logo uploaded successfully");
      setPreviewUrl(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload logo");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Are you sure you want to remove the business logo?")) return;
    if (!business || !business.logo_url) return;

    setIsRemoving(true);

    try {
      // Extract path from URL
      const oldPath = business.logo_url.split('/business-logos/')[1];
      if (oldPath) {
        await supabase.storage.from('business-logos').remove([oldPath]);
      }

      // Update business record to remove logo URL
      await updateBusiness.mutateAsync({
        id: business.id,
        logo_url: null,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["business"] });

      toast.success("Logo removed successfully");
    } catch (error: any) {
      console.error("Remove error:", error);
      toast.error(error.message || "Failed to remove logo");
    } finally {
      setIsRemoving(false);
    }
  };

  const displayUrl = previewUrl || logoUrl;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium">Business Logo</h3>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="shrink-0">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted">
              {displayUrl ? (
                <img
                  src={displayUrl}
                  alt="Business logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div>
              <Label className="text-base font-medium">Upload Logo</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload your business logo. Recommended size: 512x512px. Max file size: 2MB.
                Supported formats: PNG, JPG, WEBP.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !business}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {logoUrl ? "Change Logo" : "Upload Logo"}
              </Button>

              {logoUrl && (
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={handleRemoveLogo}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Remove Logo
                </Button>
              )}
            </div>

            {logoUrl && (
              <p className="text-xs text-muted-foreground">
                Logo will appear on the sidebar, invoices, receipts, and public-facing pages.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
