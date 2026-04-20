import { useState, useMemo } from "react";
import { Gift } from "lucide-react";
import { Check, ChevronsUpDown, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  reward_points?: number | null;
  reward_points_value?: number | null;
}

interface CustomerSearchSelectorProps {
  customers: Customer[];
  selectedCustomerId: string;
  onSelect: (customerId: string) => void;
  disabled?: boolean;
  formatCurrency?: (value: number) => string;
}

export function CustomerSearchSelector({
  customers,
  selectedCustomerId,
  onSelect,
  disabled = false,
  formatCurrency,
}: CustomerSearchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const displayValue =
    selectedCustomerId === "walk-in"
      ? "Walk-in Customer"
      : selectedCustomer?.name || "Select customer...";

  const selectedPoints = selectedCustomer?.reward_points ?? 0;
  const selectedPointsValue = selectedCustomer?.reward_points_value ?? 0;
  const showPoints = selectedCustomerId && selectedCustomerId !== "walk-in" && selectedCustomer;

  return (
    <>

    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between mt-1 font-normal"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{displayValue}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, phone, email..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="walk-in"
                onSelect={() => {
                  onSelect("walk-in");
                  setOpen(false);
                  setSearchQuery("");
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCustomerId === "walk-in" ? "opacity-100" : "opacity-0"
                  )}
                />
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                Walk-in Customer
              </CommandItem>
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => {
                    onSelect(customer.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{customer.name}</span>
                    {(customer.phone || customer.email) && (
                      <span className="text-xs text-muted-foreground truncate">
                        {customer.phone || customer.email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    {showPoints && (
      <div className="flex items-center gap-1.5 mt-1 px-1 text-xs text-muted-foreground">
        <Gift className="h-3 w-3 text-primary" />
        <span>
          <span className="font-medium text-foreground">{selectedPoints.toLocaleString()}</span> pts
          {formatCurrency && (
            <span className="ml-1 text-primary font-medium">
              ({formatCurrency(selectedPointsValue)})
            </span>
          )}
        </span>
      </div>
    )}
    </>
  );
}
