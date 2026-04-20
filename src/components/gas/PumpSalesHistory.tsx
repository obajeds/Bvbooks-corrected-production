import { useState } from "react";
import { format, parseISO } from "date-fns";
import { History, ChevronDown, ChevronUp, Fuel, Clock, Check, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { usePumpSalesHistory, type DailyPumpSale } from "@/hooks/useDailyPumpSales";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface PumpSalesHistoryProps {
  pumpId?: string;
  staffId?: string;
}

export function PumpSalesHistory({ pumpId, staffId }: PumpSalesHistoryProps) {
  const { formatCurrency } = useCurrency();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const { data: history = [], isLoading } = usePumpSalesHistory(pumpId, staffId);

  // Group entries by date
  const groupedHistory = history.reduce((acc, sale) => {
    const date = sale.sale_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(sale);
    return acc;
  }, {} as Record<string, DailyPumpSale[]>);

  const sortedDates = Object.keys(groupedHistory).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const getFuelTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      pms: "PMS",
      ago: "AGO",
      dpk: "DPK",
      lpg: "LPG",
    };
    return labels[type] || type.toUpperCase();
  };

  const getUnitLabel = (pump?: { unit?: string; fuel_type?: string }) => {
    if (pump?.unit) return pump.unit;
    return pump?.fuel_type === 'lpg' ? 'Kg' : 'L';
  };

  const HistoryContent = () => (
    <ScrollArea className={cn(isMobile ? "h-[70vh]" : "h-[400px]")}>
      {isLoading ? (
        <div className="space-y-4 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <History className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">No historical entries found</p>
          <p className="text-xs mt-1">
            {pumpId ? "No previous submissions for this pump" : "Select a pump to view history"}
          </p>
        </div>
      ) : (
        <div className="space-y-4 p-1">
          {sortedDates.map((date) => {
            const isToday = date === new Date().toISOString().split('T')[0];
            const entries = groupedHistory[date];
            
            return (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-2 sticky top-0 bg-background py-1 z-10">
                  <Badge variant={isToday ? "default" : "secondary"} className="text-xs">
                    {isToday ? "Today" : format(parseISO(date), "EEE, MMM d, yyyy")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {entries.length} {entries.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {entries.map((sale, index) => (
                    <Card 
                      key={sale.id} 
                      className={cn(
                        "transition-all",
                        isToday && index === 0 && "ring-2 ring-primary/30"
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                {sale.pump?.name || "Unknown Pump"}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {getFuelTypeLabel(sale.pump?.fuel_type || '')}
                              </Badge>
                              {/* Cashier attribution */}
                              {sale.staff?.full_name && (
                                <Badge variant="secondary" className="text-xs shrink-0 bg-muted">
                                  <Users className="h-3 w-3 mr-1" />
                                  {sale.staff.full_name}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Meter readings */}
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                              <div className="text-muted-foreground">
                                Opening: <span className="font-medium text-foreground">{sale.opening_meter.toLocaleString()}</span>
                              </div>
                              <div className="text-muted-foreground">
                                Closing: <span className="font-medium text-foreground">{sale.closing_meter.toLocaleString()}</span>
                              </div>
                              <div className="text-muted-foreground">
                                Volume: <span className="font-medium text-foreground">
                                  {sale.liters_sold?.toLocaleString() || (sale.closing_meter - sale.opening_meter).toLocaleString()} {getUnitLabel(sale.pump)}
                                </span>
                              </div>
                              <div className="text-muted-foreground">
                                Revenue: <span className="font-medium text-primary">
                                  {formatCurrency(sale.expected_revenue || 0)}
                                </span>
                              </div>
                            </div>

                            {/* Payment breakdown */}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              {sale.cash_collected > 0 && (
                                <Badge variant="secondary" className="bg-success/10 text-success">
                                  Cash: {formatCurrency(sale.cash_collected)}
                                </Badge>
                              )}
                              {sale.transfer_collected > 0 && (
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                                  Transfer: {formatCurrency(sale.transfer_collected)}
                                </Badge>
                              )}
                              {sale.pos_collected > 0 && (
                                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
                                  Card: {formatCurrency(sale.pos_collected)}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge 
                              variant={sale.status === 'submitted' ? 'default' : 'secondary'}
                              className={cn(
                                "text-xs",
                                sale.status === 'submitted' && "bg-success"
                              )}
                            >
                              {sale.status === 'submitted' ? (
                                <><Check className="h-3 w-3 mr-1" /> Locked</>
                              ) : (
                                sale.status
                              )}
                            </Badge>
                            {sale.submitted_at && (
                              <span className="text-[10px] text-muted-foreground flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(parseISO(sale.submitted_at), "h:mm a")}
                              </span>
                            )}
                          </div>
                        </div>

                        {sale.notes && (
                          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                            Note: {sale.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );

  // Mobile: Use Sheet (drawer)
  if (isMobile) {
    return (
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full gap-2">
            <History className="h-4 w-4" />
            View Submission History
            {history.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {history.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Submission History
            </SheetTitle>
            <SheetDescription>
              Previous pump meter submissions. Closing meters become opening meters for the next entry.
            </SheetDescription>
          </SheetHeader>
          <HistoryContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Collapsible card
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Submission History</CardTitle>
                  <CardDescription className="text-xs">
                    Previous entries • Closing meters → Opening meters
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <Badge variant="secondary">{history.length} entries</Badge>
                )}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <HistoryContent />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
