import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, Save } from "lucide-react";
import { toast } from "sonner";
import { useBusinessHours, useSetBusinessHours } from "@/hooks/useAfterHoursAlerts";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function BusinessHoursSettings() {
  const { data: businessHours, isLoading } = useBusinessHours();
  const setBusinessHours = useSetBusinessHours();

  const [hours, setHours] = useState<
    Record<number, { open_time: string; close_time: string; is_closed: boolean }>
  >({});

  useEffect(() => {
    if (businessHours) {
      const hoursMap: typeof hours = {};
      DAYS.forEach((day) => {
        const dayHours = businessHours.find(
          (h) => h.day_of_week === day.value && h.branch_id === null
        );
        hoursMap[day.value] = dayHours
          ? {
              open_time: dayHours.open_time.slice(0, 5),
              close_time: dayHours.close_time.slice(0, 5),
              is_closed: dayHours.is_closed,
            }
          : {
              open_time: "09:00",
              close_time: "18:00",
              is_closed: false,
            };
      });
      setHours(hoursMap);
    }
  }, [businessHours]);

  const handleSave = async (dayOfWeek: number) => {
    const dayHours = hours[dayOfWeek];
    if (!dayHours) return;

    try {
      await setBusinessHours.mutateAsync({
        day_of_week: dayOfWeek,
        open_time: dayHours.open_time + ":00",
        close_time: dayHours.close_time + ":00",
        is_closed: dayHours.is_closed,
      });
      toast.success("Business hours updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update business hours");
    }
  };

  const handleSaveAll = async () => {
    try {
      for (const day of DAYS) {
        const dayHours = hours[day.value];
        if (dayHours) {
          await setBusinessHours.mutateAsync({
            day_of_week: day.value,
            open_time: dayHours.open_time + ":00",
            close_time: dayHours.close_time + ":00",
            is_closed: dayHours.is_closed,
          });
        }
      }
      toast.success("All business hours saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save business hours");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Business Hours
        </CardTitle>
        <CardDescription>
          Set your business operating hours. Activity outside these hours will trigger alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS.map((day) => (
          <div
            key={day.value}
            className="flex items-center gap-4 p-3 rounded-lg border bg-card"
          >
            <div className="w-24 font-medium">{day.label}</div>
            <div className="flex items-center gap-2">
              <Switch
                checked={!hours[day.value]?.is_closed}
                onCheckedChange={(checked) =>
                  setHours((prev) => ({
                    ...prev,
                    [day.value]: {
                      ...prev[day.value],
                      is_closed: !checked,
                    },
                  }))
                }
              />
              <Label className="text-sm text-muted-foreground">
                {hours[day.value]?.is_closed ? "Closed" : "Open"}
              </Label>
            </div>
            {!hours[day.value]?.is_closed && (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={hours[day.value]?.open_time || "09:00"}
                    onChange={(e) =>
                      setHours((prev) => ({
                        ...prev,
                        [day.value]: {
                          ...prev[day.value],
                          open_time: e.target.value,
                        },
                      }))
                    }
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={hours[day.value]?.close_time || "18:00"}
                    onChange={(e) =>
                      setHours((prev) => ({
                        ...prev,
                        [day.value]: {
                          ...prev[day.value],
                          close_time: e.target.value,
                        },
                      }))
                    }
                    className="w-32"
                  />
                </div>
              </>
            )}
          </div>
        ))}

        <Button onClick={handleSaveAll} disabled={setBusinessHours.isPending} className="w-full">
          {setBusinessHours.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save All Hours
        </Button>
      </CardContent>
    </Card>
  );
}
