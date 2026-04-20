import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, LogIn, LogOut, Loader2, History, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useAttendance, useCheckIn, useCheckOut } from "@/hooks/useAttendance";
import { useAttendanceHistory } from "@/hooks/useAttendanceHistory";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "@/components/subscription/UpgradeRequired";
import { format, subDays } from "date-fns";

export default function Attendance() {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [historyStart, setHistoryStart] = useState(subDays(new Date(), 30).toISOString().split("T")[0]);
  const [historyEnd, setHistoryEnd] = useState(new Date().toISOString().split("T")[0]);
  const { data: staff = [], isLoading: staffLoading } = useStaffMembers();
  const { data: attendance = [], isLoading: attendanceLoading } = useAttendance(selectedDate);
  const { data: history = [], isLoading: historyLoading } = useAttendanceHistory(historyStart, historyEnd);
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const handleCheckIn = async (staffId: string) => {
    try {
      await checkIn.mutateAsync({ staff_id: staffId, date: selectedDate });
      toast.success("Check-in recorded");
    } catch (error: any) {
      toast.error(error.message || "Failed to record check-in");
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    try {
      await checkOut.mutateAsync(attendanceId);
      toast.success("Check-out recorded");
    } catch (error: any) {
      toast.error(error.message || "Failed to record check-out");
    }
  };

  const getStaffAttendance = (staffId: string) => {
    return attendance.find((a: any) => a.staff_id === staffId);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present": return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Present</Badge>;
      case "absent": return <Badge variant="outline" className="text-red-500 border-red-500/20">Absent</Badge>;
      case "late": return <Badge variant="outline" className="text-amber-500 border-amber-500/20">Late</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = staffLoading || attendanceLoading || planLoading;

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (planInfo?.effectivePlan === 'free') {
    return <UpgradeRequired featureKey="team.hrm" requiredPlan="professional" />;
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground text-sm">Track and review staff attendance</p>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today" className="gap-1.5">
            <Clock className="h-4 w-4" /> Today
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>

        {/* TODAY TAB */}
        <TabsContent value="today" className="space-y-4">
          <div className="flex justify-end">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5" />
                Attendance for {format(new Date(selectedDate + "T00:00:00"), "MMMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No staff members found. Add staff members first.</p>
                </div>
              ) : (
                <>
                  {/* Mobile */}
                  <div className="md:hidden space-y-3">
                    {staff.map((member) => {
                      const record = getStaffAttendance(member.id);
                      return (
                        <div key={member.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{member.full_name}</span>
                            </div>
                            {record ? (
                              <Badge className="bg-green-500/10 text-green-500">Present</Badge>
                            ) : (
                              <Badge variant="outline">Not Checked In</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Check In</p>
                              <p className="font-medium">{formatTime(record?.clock_in)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Check Out</p>
                              <p className="font-medium">{formatTime(record?.clock_out)}</p>
                            </div>
                          </div>
                          <div>
                            {!record ? (
                              <Button size="sm" onClick={() => handleCheckIn(member.id)} disabled={checkIn.isPending} className="w-full">
                                <LogIn className="h-4 w-4 mr-1" /> Check In
                              </Button>
                            ) : !record.clock_out ? (
                              <Button size="sm" variant="outline" onClick={() => handleCheckOut(record.id)} disabled={checkOut.isPending} className="w-full">
                                <LogOut className="h-4 w-4 mr-1" /> Check Out
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">Completed</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staff.map((member) => {
                          const record = getStaffAttendance(member.id);
                          return (
                            <TableRow key={member.id}>
                              <TableCell className="font-medium">{member.full_name}</TableCell>
                              <TableCell>
                                {record ? (
                                  <Badge className="bg-green-500/10 text-green-500">Present</Badge>
                                ) : (
                                  <Badge variant="outline">Not Checked In</Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatTime(record?.clock_in)}</TableCell>
                              <TableCell>{formatTime(record?.clock_out)}</TableCell>
                              <TableCell>
                                {!record ? (
                                  <Button size="sm" onClick={() => handleCheckIn(member.id)} disabled={checkIn.isPending}>
                                    <LogIn className="h-4 w-4 mr-1" /> Check In
                                  </Button>
                                ) : !record.clock_out ? (
                                  <Button size="sm" variant="outline" onClick={() => handleCheckOut(record.id)} disabled={checkOut.isPending}>
                                    <LogOut className="h-4 w-4 mr-1" /> Check Out
                                  </Button>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Completed</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={historyStart} onChange={(e) => setHistoryStart(e.target.value)} className="w-auto" />
            </div>
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={historyEnd} onChange={(e) => setHistoryEnd(e.target.value)} className="w-auto" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5" />
                Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No attendance records found for this period.</p>
                </div>
              ) : (
                <>
                  {/* Mobile */}
                  <div className="md:hidden space-y-3">
                    {history.map((record: any) => (
                      <div key={record.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{record.staff?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{record.staff?.role}</p>
                          </div>
                          {getStatusBadge(record.status)}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="font-medium">{format(new Date(record.date + "T00:00:00"), "MMM d, yyyy")}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">In</p>
                            <p>{formatTime(record.clock_in)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Out</p>
                            <p>{formatTime(record.clock_out)}</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Recorded: {format(new Date(record.created_at), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Recorded At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((record: any) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {record.staff?.full_name || "—"}
                              {record.staff?.role && <span className="text-xs text-muted-foreground ml-1">({record.staff.role})</span>}
                            </TableCell>
                            <TableCell>{format(new Date(record.date + "T00:00:00"), "MMM d, yyyy")}</TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell>{formatTime(record.clock_in)}</TableCell>
                            <TableCell>{formatTime(record.clock_out)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(record.created_at), "MMM d, yyyy HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
