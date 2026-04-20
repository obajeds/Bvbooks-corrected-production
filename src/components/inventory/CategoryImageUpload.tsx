import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CategoryImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
}

export function CategoryImageUpload({
  imageUrl,
  onImageChange,
  disabled = false,
}: CategoryImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 500KB for optimized storage)
    if (file.size > 500 * 1024) {
      toast.error("Image must be less than 500KB");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `categories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("category-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("category-images")
        .getPublicUrl(filePath);

      onImageChange(publicUrl.publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split("/category-images/");
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        await supabase.storage.from("category-images").remove([filePath]);
      }
      onImageChange(null);
      toast.success("Image removed");
    } catch (error) {
      console.error("Remove error:", error);
      onImageChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {imageUrl ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted border">
          <img
            src={imageUrl}
            alt="Category"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 border-dashed flex flex-col gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Uploading...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              <span className="text-xs">Add Image (Optional)</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
