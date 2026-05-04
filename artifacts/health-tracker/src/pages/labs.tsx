import { useState } from "react";
import { useGetLabs, useAddLabResult, useDeleteLabResult, getGetLabsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Trash2, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COMMON_MARKERS = [
  { value: "ferritin", label: "Ferritin" },
  { value: "hemoglobin", label: "Hemoglobin" },
  { value: "serum_iron", label: "Serum Iron" },
  { value: "vitamin_d", label: "Vitamin D (25-OH)" },
  { value: "vitamin_b12", label: "Vitamin B12" },
  { value: "folate", label: "Folate" },
  { value: "glucose_fasting", label: "Glucose (Fasting)" },
  { value: "hba1c", label: "HbA1c" },
  { value: "total_cholesterol", label: "Total Cholesterol" },
  { value: "ldl", label: "LDL Cholesterol" },
  { value: "hdl", label: "HDL Cholesterol" },
  { value: "triglycerides", label: "Triglycerides" },
  { value: "tsh", label: "TSH" },
  { value: "free_t4", label: "Free T4" },
  { value: "creatinine", label: "Creatinine" },
  { value: "alt", label: "ALT" },
  { value: "ast", label: "AST" },
  { value: "crp", label: "CRP" },
  { value: "uric_acid", label: "Uric Acid" },
  { value: "sodium", label: "Sodium" },
  { value: "potassium", label: "Potassium" },
  { value: "magnesium", label: "Magnesium" },
];

const STATUS_STYLE: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2; label: string }> = {
  normal: { variant: "default", icon: CheckCircle2, label: "Normal" },
  low: { variant: "outline", icon: AlertTriangle, label: "Low" },
  high: { variant: "outline", icon: AlertTriangle, label: "High" },
  critical_low: { variant: "destructive", icon: AlertCircle, label: "Critical Low" },
  critical_high: { variant: "destructive", icon: AlertCircle, label: "Critical High" },
  unknown: { variant: "secondary", icon: AlertCircle, label: "Unknown" },
};

export default function LabsPage() {
  const qc = useQueryClient();
  const { data: labs, isLoading } = useGetLabs();
  const addLab = useAddLabResult();
  const deleteLab = useDeleteLabResult();

  const [open, setOpen] = useState(false);
  const [marker, setMarker] = useState("");
  const [customMarker, setCustomMarker] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [refMin, setRefMin] = useState("");
  const [refMax, setRefMax] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [lab, setLab] = useState("");
  const [notes, setNotes] = useState("");

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetLabsQueryKey() });
  }

  async function handleAdd() {
    const finalMarker = marker === "__custom__" ? customMarker : marker;
    if (!finalMarker || !value || !unit) return;
    await addLab.mutateAsync([{
      date,
      marker: finalMarker,
      value: parseFloat(value),
      unit,
      refMin: refMin ? parseFloat(refMin) : null,
      refMax: refMax ? parseFloat(refMax) : null,
      laboratory: lab || null,
      notes: notes || null,
    }]);
    setOpen(false);
    setMarker(""); setCustomMarker(""); setValue(""); setUnit(""); setRefMin(""); setRefMax(""); setLab(""); setNotes("");
    invalidate();
  }

  async function handleDelete(id: number) {
    await deleteLab.mutateAsync([id]);
    invalidate();
  }

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  }

  const grouped: Record<string, typeof labs> = {};
  for (const l of labs ?? []) {
    grouped[l.marker] = grouped[l.marker] ?? [];
    grouped[l.marker]!.push(l);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lab Results</h1>
          <p className="text-muted-foreground text-sm">Track and interpret your biomarkers over time</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Result</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Lab Result</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Marker</label>
                <Select value={marker} onValueChange={setMarker}>
                  <SelectTrigger><SelectValue placeholder="Select marker" /></SelectTrigger>
                  <SelectContent>
                    {COMMON_MARKERS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">Other (custom)</SelectItem>
                  </SelectContent>
                </Select>
                {marker === "__custom__" && (
                  <Input placeholder="Custom marker name" value={customMarker} onChange={(e) => setCustomMarker(e.target.value)} className="mt-1" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Value</label>
                  <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Unit</label>
                  <Input placeholder="e.g. ng/mL, g/L" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Ref min</label>
                  <Input type="number" value={refMin} onChange={(e) => setRefMin(e.target.value)} placeholder="optional" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Ref max</label>
                  <Input type="number" value={refMax} onChange={(e) => setRefMax(e.target.value)} placeholder="optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Laboratory</label>
                  <Input placeholder="optional" value={lab} onChange={(e) => setLab(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Notes</label>
                <Input placeholder="optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button onClick={handleAdd} disabled={addLab.isPending} className="w-full">Save Result</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!labs || labs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No lab results yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first lab result to start tracking biomarkers.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(grouped).map(([markerKey, entries]) => {
            if (!entries) return null;
            const latest = entries[0]!;
            const statusConfig = STATUS_STYLE[latest.status] ?? STATUS_STYLE.unknown;
            const Icon = statusConfig.icon;
            const isAbnormal = latest.status !== "normal" && latest.status !== "unknown";
            return (
              <Card key={markerKey} className={isAbnormal ? "border-amber-500/30" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${isAbnormal ? "text-amber-500" : "text-emerald-500"}`} />
                      {markerKey.replace(/_/g, " ")}
                    </CardTitle>
                    <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {entries.map((e) => {
                      const sc = STATUS_STYLE[e.status] ?? STATUS_STYLE.unknown;
                      return (
                        <div key={e.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-base">{e.value}</span>
                            <span className="text-muted-foreground">{e.unit}</span>
                            {e.refMin != null && e.refMax != null && (
                              <span className="text-xs text-muted-foreground">[{e.refMin}–{e.refMax}]</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{new Date(e.date + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <Button
                              variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(e.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {latest.laboratory && (
                    <p className="text-xs text-muted-foreground mt-2">{latest.laboratory}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
