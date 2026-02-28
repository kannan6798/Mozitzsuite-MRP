import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Plus, Minus, Equal } from "lucide-react";
import axios from "axios";

interface RevisionCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: any[];
  itemCode: string;
}

const RevisionCompareDialog = ({ open, onOpenChange, revisions, itemCode }: RevisionCompareDialogProps) => {
  const [leftRevisionId, setLeftRevisionId] = useState<string>("");
  const [rightRevisionId, setRightRevisionId] = useState<string>("");
  const [leftBOM, setLeftBOM] = useState<any>(null);
  const [rightBOM, setRightBOM] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Auto-select the two most recent revisions when dialog opens
  useEffect(() => {
    if (open && revisions.length >= 2) {
      setLeftRevisionId(revisions[1]?.id || "");
      setRightRevisionId(revisions[0]?.id || "");
    }
  }, [open, revisions]);

  // Fetch BOM data when revisions are selected
 useEffect(() => {
  const fetchBOMData = async (id: string, setter: (data: any) => void) => {
    if (!id) return;

    try {
      const response = await axios.get(`/api/bom-headers/${id}?include=components,operations`);
      const data = response.data;
      if (data) {
        setter(data);
      }
    } catch (error: any) {
      console.error("Failed to fetch BOM data:", error?.response?.data?.message || error.message);
    }
  };

  if (leftRevisionId) {
    fetchBOMData(leftRevisionId, setLeftBOM);
  }
  if (rightRevisionId) {
    fetchBOMData(rightRevisionId, setRightBOM);
  }
}, [leftRevisionId, rightRevisionId]);


  // Compare components and find differences
  const compareComponents = () => {
    if (!leftBOM?.bom_components || !rightBOM?.bom_components) return { added: [], removed: [], changed: [], unchanged: [] };

    const leftComps = leftBOM.bom_components || [];
    const rightComps = rightBOM.bom_components || [];

    const leftMap = new Map(leftComps.map((c: any) => [c.component, c]));
    const rightMap = new Map(rightComps.map((c: any) => [c.component, c]));

    const added: any[] = [];
    const removed: any[] = [];
    const changed: any[] = [];
    const unchanged: any[] = [];

    // Check for removed and changed items
    leftComps.forEach((leftComp: any) => {
      const rightComp = rightMap.get(leftComp.component) as any;
      if (!rightComp) {
        removed.push(leftComp);
      } else if (
        leftComp.quantity !== rightComp.quantity ||
        leftComp.unit_cost !== rightComp.unit_cost ||
        leftComp.uom !== rightComp.uom
      ) {
        changed.push({ left: leftComp, right: rightComp });
      } else {
        unchanged.push(leftComp);
      }
    });

    // Check for added items
    rightComps.forEach((rightComp: any) => {
      if (!leftMap.has(rightComp.component)) {
        added.push(rightComp);
      }
    });

    return { added, removed, changed, unchanged };
  };

  // Compare operations and find differences
  const compareOperations = () => {
    if (!leftBOM?.bom_operations || !rightBOM?.bom_operations) return { added: [], removed: [], changed: [], unchanged: [] };

    const leftOps = leftBOM.bom_operations || [];
    const rightOps = rightBOM.bom_operations || [];

    const leftMap = new Map(leftOps.map((o: any) => [o.operation_code, o]));
    const rightMap = new Map(rightOps.map((o: any) => [o.operation_code, o]));

    const added: any[] = [];
    const removed: any[] = [];
    const changed: any[] = [];
    const unchanged: any[] = [];

    leftOps.forEach((leftOp: any) => {
      const rightOp = rightMap.get(leftOp.operation_code) as any;
      if (!rightOp) {
        removed.push(leftOp);
      } else if (
        leftOp.labor_cost !== rightOp.labor_cost ||
        leftOp.machine_cost !== rightOp.machine_cost ||
        leftOp.overhead_cost !== rightOp.overhead_cost
      ) {
        changed.push({ left: leftOp, right: rightOp });
      } else {
        unchanged.push(leftOp);
      }
    });

    rightOps.forEach((rightOp: any) => {
      if (!leftMap.has(rightOp.operation_code)) {
        added.push(rightOp);
      }
    });

    return { added, removed, changed, unchanged };
  };

  const componentDiff = compareComponents();
  const operationDiff = compareOperations();

  const getRevisionLabel = (rev: any) => `Rev ${rev.revision} (${rev.status})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare BOM Revisions</DialogTitle>
          <DialogDescription>
            Compare two revisions of {itemCode} side-by-side to see what changed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Revision Selectors */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm font-medium">Left Revision (Older)</label>
              <Select value={leftRevisionId} onValueChange={setLeftRevisionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select revision" />
                </SelectTrigger>
                <SelectContent>
                  {revisions.map((rev) => (
                    <SelectItem key={rev.id} value={rev.id} disabled={rev.id === rightRevisionId}>
                      Rev {rev.revision} - {rev.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Right Revision (Newer)</label>
              <Select value={rightRevisionId} onValueChange={setRightRevisionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select revision" />
                </SelectTrigger>
                <SelectContent>
                  {revisions.map((rev) => (
                    <SelectItem key={rev.id} value={rev.id} disabled={rev.id === leftRevisionId}>
                      Rev {rev.revision} - {rev.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          {leftBOM && rightBOM && (
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Added</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">
                    {componentDiff.added.length + operationDiff.added.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-muted-foreground">Removed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {componentDiff.removed.length + operationDiff.removed.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-muted-foreground">Changed</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {componentDiff.changed.length + operationDiff.changed.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Equal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Unchanged</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {componentDiff.unchanged.length + operationDiff.unchanged.length}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Comparison Tabs */}
          {leftBOM && rightBOM && (
            <Tabs defaultValue="components" className="w-full">
              <TabsList>
                <TabsTrigger value="components">
                  Components
                  {(componentDiff.added.length + componentDiff.removed.length + componentDiff.changed.length) > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {componentDiff.added.length + componentDiff.removed.length + componentDiff.changed.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="operations">
                  Operations
                  {(operationDiff.added.length + operationDiff.removed.length + operationDiff.changed.length) > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {operationDiff.added.length + operationDiff.removed.length + operationDiff.changed.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="components" className="mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Component</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>
                          Qty (Rev {leftBOM?.revision})
                        </TableHead>
                        <TableHead>
                          Qty (Rev {rightBOM?.revision})
                        </TableHead>
                        <TableHead>
                          Cost (Rev {leftBOM?.revision})
                        </TableHead>
                        <TableHead>
                          Cost (Rev {rightBOM?.revision})
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Added */}
                      {componentDiff.added.map((comp: any) => (
                        <TableRow key={`added-${comp.component}`} className="bg-green-50 dark:bg-green-950/20">
                          <TableCell>
                            <Badge className="bg-green-600">Added</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{comp.component}</TableCell>
                          <TableCell>{comp.description}</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="font-semibold text-green-600">{comp.quantity}</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="font-semibold text-green-600">${(comp.unit_cost || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Removed */}
                      {componentDiff.removed.map((comp: any) => (
                        <TableRow key={`removed-${comp.component}`} className="bg-red-50 dark:bg-red-950/20">
                          <TableCell>
                            <Badge variant="destructive">Removed</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{comp.component}</TableCell>
                          <TableCell>{comp.description}</TableCell>
                          <TableCell className="line-through text-red-600">{comp.quantity}</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="line-through text-red-600">${(comp.unit_cost || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                        </TableRow>
                      ))}
                      {/* Changed */}
                      {componentDiff.changed.map(({ left, right }: any) => (
                        <TableRow key={`changed-${left.component}`} className="bg-amber-50 dark:bg-amber-950/20">
                          <TableCell>
                            <Badge className="bg-amber-600">Changed</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{left.component}</TableCell>
                          <TableCell>{left.description}</TableCell>
                          <TableCell className={left.quantity !== right.quantity ? "text-amber-600" : ""}>
                            {left.quantity}
                          </TableCell>
                          <TableCell className={left.quantity !== right.quantity ? "font-semibold text-amber-600" : ""}>
                            {right.quantity}
                            {left.quantity !== right.quantity && (
                              <span className="ml-1 text-xs">
                                ({right.quantity > left.quantity ? "+" : ""}{right.quantity - left.quantity})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={left.unit_cost !== right.unit_cost ? "text-amber-600" : ""}>
                            ${(left.unit_cost || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className={left.unit_cost !== right.unit_cost ? "font-semibold text-amber-600" : ""}>
                            ${(right.unit_cost || 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Unchanged */}
                      {componentDiff.unchanged.map((comp: any) => (
                        <TableRow key={`unchanged-${comp.component}`} className="opacity-60">
                          <TableCell>
                            <Badge variant="outline">Unchanged</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{comp.component}</TableCell>
                          <TableCell>{comp.description}</TableCell>
                          <TableCell>{comp.quantity}</TableCell>
                          <TableCell>{comp.quantity}</TableCell>
                          <TableCell>${(comp.unit_cost || 0).toFixed(2)}</TableCell>
                          <TableCell>${(comp.unit_cost || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {componentDiff.added.length + componentDiff.removed.length + componentDiff.changed.length + componentDiff.unchanged.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No components to compare
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="operations" className="mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Operation</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>
                          Labor (Rev {leftBOM?.revision})
                        </TableHead>
                        <TableHead>
                          Labor (Rev {rightBOM?.revision})
                        </TableHead>
                        <TableHead>
                          Total (Rev {leftBOM?.revision})
                        </TableHead>
                        <TableHead>
                          Total (Rev {rightBOM?.revision})
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Added */}
                      {operationDiff.added.map((op: any) => (
                        <TableRow key={`added-${op.operation_code}`} className="bg-green-50 dark:bg-green-950/20">
                          <TableCell>
                            <Badge className="bg-green-600">Added</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{op.operation_code}</TableCell>
                          <TableCell>{op.description}</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="font-semibold text-green-600">${(op.labor_cost || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ${((op.labor_cost || 0) + (op.machine_cost || 0) + (op.overhead_cost || 0)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Removed */}
                      {operationDiff.removed.map((op: any) => (
                        <TableRow key={`removed-${op.operation_code}`} className="bg-red-50 dark:bg-red-950/20">
                          <TableCell>
                            <Badge variant="destructive">Removed</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{op.operation_code}</TableCell>
                          <TableCell>{op.description}</TableCell>
                          <TableCell className="line-through text-red-600">${(op.labor_cost || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                          <TableCell className="line-through text-red-600">
                            ${((op.labor_cost || 0) + (op.machine_cost || 0) + (op.overhead_cost || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">-</TableCell>
                        </TableRow>
                      ))}
                      {/* Changed */}
                      {operationDiff.changed.map(({ left, right }: any) => {
                        const leftTotal = (left.labor_cost || 0) + (left.machine_cost || 0) + (left.overhead_cost || 0);
                        const rightTotal = (right.labor_cost || 0) + (right.machine_cost || 0) + (right.overhead_cost || 0);
                        return (
                          <TableRow key={`changed-${left.operation_code}`} className="bg-amber-50 dark:bg-amber-950/20">
                            <TableCell>
                              <Badge className="bg-amber-600">Changed</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{left.operation_code}</TableCell>
                            <TableCell>{left.description}</TableCell>
                            <TableCell className={left.labor_cost !== right.labor_cost ? "text-amber-600" : ""}>
                              ${(left.labor_cost || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className={left.labor_cost !== right.labor_cost ? "font-semibold text-amber-600" : ""}>
                              ${(right.labor_cost || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className={leftTotal !== rightTotal ? "text-amber-600" : ""}>
                              ${leftTotal.toFixed(2)}
                            </TableCell>
                            <TableCell className={leftTotal !== rightTotal ? "font-semibold text-amber-600" : ""}>
                              ${rightTotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Unchanged */}
                      {operationDiff.unchanged.map((op: any) => {
                        const total = (op.labor_cost || 0) + (op.machine_cost || 0) + (op.overhead_cost || 0);
                        return (
                          <TableRow key={`unchanged-${op.operation_code}`} className="opacity-60">
                            <TableCell>
                              <Badge variant="outline">Unchanged</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{op.operation_code}</TableCell>
                            <TableCell>{op.description}</TableCell>
                            <TableCell>${(op.labor_cost || 0).toFixed(2)}</TableCell>
                            <TableCell>${(op.labor_cost || 0).toFixed(2)}</TableCell>
                            <TableCell>${total.toFixed(2)}</TableCell>
                            <TableCell>${total.toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {operationDiff.added.length + operationDiff.removed.length + operationDiff.changed.length + operationDiff.unchanged.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No operations to compare
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RevisionCompareDialog;
