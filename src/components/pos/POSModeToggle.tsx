import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";

type POSMode = 'categories' | 'list';

interface POSModeToggleProps {
  mode: POSMode;
  onModeChange: (mode: POSMode) => void;
}

export function POSModeToggle({ mode, onModeChange }: POSModeToggleProps) {
  return (
    <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
      <Button
        variant={mode === 'categories' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('categories')}
        className="flex items-center gap-1.5 h-8 px-3"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Categories</span>
      </Button>
      <Button
        variant={mode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('list')}
        className="flex items-center gap-1.5 h-8 px-3"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </Button>
    </div>
  );
}
