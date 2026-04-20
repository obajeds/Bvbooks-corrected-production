import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Fuel, Edit, Trash2, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { usePumps, useCreatePump, useUpdatePump, useDeletePump, Pump, FuelType, PumpUnit } from "@/hooks/usePumps";
import { useBranchContext } from "@/contexts/BranchContext";
import { useCurrency } from "@/hooks/useCurrency";

const schema = z.object({
  name: z.string().min(1, "Pump name is required"),
  fuel_type: z.enum(['pms', 'ago', 'dpk', 'lpg']),
  unit: z.enum(['L', 'Kg']),
  price_per_liter: z.coerce.number().min(0, "Price must be positive"),
  current_meter_reading: z.coerce.number().min(0, "Meter reading must be positive"),
});

type FormData = z.infer<typeof schema>;

export default function PumpManagement() {
  const { formatCurrency } = useCurrency();
  const { currentBranch } = useBranchContext();
  const { data: pumps = [], isLoading } = usePumps();
  const createPump = useCreatePump();
  const updatePump = useUpdatePump();
  const deletePump = useDeletePump();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPump, setEditingPump] = useState<Pump | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      fuel_type: "pms",
      unit: "L",
      price_per_liter: 0,
      current_meter_reading: 0,
    },
  });

  const openCreateDialog = () => {
    setEditingPump(null);
    form.reset({
      name: "",
      fuel_type: "pms",
      unit: "L",
      price_per_liter: 0,
      current_meter_reading: 0,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (pump: Pump) => {
    setEditingPump(pump);
    form.reset({
      name: pump.name,
      fuel_type: pump.fuel_type,
      unit: pump.unit || 'L',
      price_per_liter: pump.price_per_liter,
      current_meter_reading: pump.current_meter_reading,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: FormData) => {
    if (editingPump) {
      await updatePump.mutateAsync({ id: editingPump.id, ...data });
    } else {
      await createPump.mutateAsync({
        name: data.name,
        fuel_type: data.fuel_type,
        unit: data.unit,
        price_per_liter: data.price_per_liter,
        current_meter_reading: data.current_meter_reading,
        branch_id: currentBranch!.id,
        is_active: true,
      });
    }
    setDialogOpen(false);
    form.reset();
  };

  const handleDelete = async (id: string) => {
    await deletePump.mutateAsync(id);
  };

  const getFuelTypeLabel = (type: FuelType) => {
    const labels: Record<FuelType, string> = {
      pms: "PMS (Petrol)",
      ago: "AGO (Diesel)",
      dpk: "DPK (Kerosene)",
      lpg: "LPG (Gas)",
    };
    return labels[type];
  };

  const getFuelTypeColor = (type: FuelType) => {
    const colors: Record<FuelType, string> = {
      pms: "bg-amber-100 text-amber-800",
      ago: "bg-gray-100 text-gray-800",
      dpk: "bg-blue-100 text-blue-800",
      lpg: "bg-green-100 text-green-800",
    };
    return colors[type];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pump Management</h1>
          <p className="text-muted-foreground">Configure fuel pumps for {currentBranch?.name}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Pump
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPump ? "Edit Pump" : "Add New Pump"}</DialogTitle>
              <DialogDescription>
                {editingPump ? "Update pump configuration" : "Configure a new fuel pump"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pump Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Pump 1, Station A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fuel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pms">PMS (Petrol)</SelectItem>
                          <SelectItem value="ago">AGO (Diesel)</SelectItem>
                          <SelectItem value="dpk">DPK (Kerosene)</SelectItem>
                          <SelectItem value="lpg">LPG (Gas)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Measurement Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="L">Liters (L)</SelectItem>
                          <SelectItem value="Kg">Kilograms (Kg)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_per_liter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per {form.watch('unit') === 'Kg' ? 'Kg' : 'Liter'}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="current_meter_reading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Meter Reading</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPump.isPending || updatePump.isPending}>
                    {editingPump ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {pumps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Fuel className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pumps Configured</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add fuel pumps to start recording daily sales
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Pump
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Fuel Pumps</CardTitle>
            <CardDescription>{pumps.length} pumps configured</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Price/Unit</TableHead>
                  <TableHead className="text-right">Current Meter</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pumps.map((pump) => (
                  <TableRow key={pump.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        {pump.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getFuelTypeColor(pump.fuel_type)}>
                        {getFuelTypeLabel(pump.fuel_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {pump.unit || 'L'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(pump.price_per_liter)}/{pump.unit || 'L'}
                    </TableCell>
                    <TableCell className="text-right">
                      {pump.current_meter_reading.toLocaleString()} {pump.unit || 'L'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(pump)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Pump?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will deactivate "{pump.name}". Historical data will be preserved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(pump.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
