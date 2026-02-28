import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw } from "lucide-react";

interface LineItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantityOrdered: number;
  rate: number;
  totalAmount: number;
}

interface Order {
  id: string;
  customer: string;
  items: LineItem[];
  status: string;
}

interface RefundItem {
  itemCode: string;
  itemName: string;
  quantityOrdered: number;
  quantityRefunded: number;
  unitPrice: number;
  refundAmount: number;
  restoreInventory: boolean;
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onRefundCreated: (refund: any) => void;
}

export const RefundDialog = ({ open, onOpenChange, order, onRefundCreated }: RefundDialogProps) => {
  const { toast } = useToast();
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [refundItems, setRefundItems] = useState<RefundItem[]>([]);

  // Initialize refund items when order changes
  useState(() => {
    if (order && order.items) {
      setRefundItems(
        order.items.map((item) => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantityOrdered: item.quantityOrdered,
          quantityRefunded: refundType === "full" ? item.quantityOrdered : 0,
          unitPrice: item.rate,
          refundAmount: refundType === "full" ? item.totalAmount : 0,
          restoreInventory: true,
        }))
      );
    }
  });

  // Recalculate when refund type changes
  const handleRefundTypeChange = (type: "full" | "partial") => {
    setRefundType(type);
    if (order && order.items) {
      setRefundItems(
        order.items.map((item) => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantityOrdered: item.quantityOrdered,
          quantityRefunded: type === "full" ? item.quantityOrdered : 0,
          unitPrice: item.rate,
          refundAmount: type === "full" ? item.totalAmount : 0,
          restoreInventory: true,
        }))
      );
    }
  };

  const updateRefundItem = (index: number, field: keyof RefundItem, value: any) => {
    setRefundItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Recalculate refund amount if quantity changed
      if (field === "quantityRefunded") {
        updated[index].refundAmount = updated[index].unitPrice * value;
      }
      
      return updated;
    });
  };

  const totalRefundAmount = refundItems.reduce((sum, item) => sum + item.refundAmount, 0);
  const originalAmount = order?.items?.reduce((sum, item) => sum + item.totalAmount, 0) || 0;

  const generateRefundNumber = () => {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `REF-${year}-${timestamp}`;
  };

  const handleSubmit = () => {
    if (!order) return;

    if (!reason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for the refund.",
        variant: "destructive",
      });
      return;
    }

    if (refundType === "partial" && totalRefundAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please specify at least one item to refund.",
        variant: "destructive",
      });
      return;
    }

    const refund = {
      id: crypto.randomUUID(),
      refundNumber: generateRefundNumber(),
      orderId: order.id,
      customerName: order.customer,
      refundType,
      status: "pending",
      reason,
      notes,
      originalAmount,
      refundAmount: totalRefundAmount,
      items: refundItems.filter((item) => item.quantityRefunded > 0),
      createdAt: new Date().toISOString(),
    };

    onRefundCreated(refund);
    
    // Reset form
    setRefundType("full");
    setReason("");
    setNotes("");
    setRefundItems([]);
    onOpenChange(false);

    toast({
      title: "Refund Request Created",
      description: `Refund ${refund.refundNumber} has been submitted for approval.`,
    });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-500" />
            Create Refund Request - {order.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-muted-foreground text-sm">Order ID</Label>
              <p className="font-medium">{order.id}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Customer</Label>
              <p className="font-medium">{order.customer}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Order Total</Label>
              <p className="font-medium">₹{originalAmount.toFixed(2)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Order Status</Label>
              <Badge variant="outline">{order.status}</Badge>
            </div>
          </div>

          {/* Refund Type */}
          <div className="space-y-2">
            <Label>Refund Type *</Label>
            <Select value={refundType} onValueChange={(v: "full" | "partial") => handleRefundTypeChange(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Refund</SelectItem>
                <SelectItem value="partial">Partial Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason for Refund *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer Request">Customer Request</SelectItem>
                <SelectItem value="Defective Product">Defective Product</SelectItem>
                <SelectItem value="Wrong Item Shipped">Wrong Item Shipped</SelectItem>
                <SelectItem value="Damaged in Transit">Damaged in Transit</SelectItem>
                <SelectItem value="Order Cancelled">Order Cancelled</SelectItem>
                <SelectItem value="Quality Issue">Quality Issue</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <Label>Refund Items</Label>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Refund Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Refund Amount</TableHead>
                    <TableHead className="text-center">Restore Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundItems.map((item, index) => (
                    <TableRow key={item.itemCode}>
                      <TableCell className="font-mono text-sm">{item.itemCode}</TableCell>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell className="text-right">{item.quantityOrdered}</TableCell>
                      <TableCell className="text-right">
                        {refundType === "partial" ? (
                          <Input
                            type="number"
                            min={0}
                            max={item.quantityOrdered}
                            value={item.quantityRefunded}
                            onChange={(e) => updateRefundItem(index, "quantityRefunded", Number(e.target.value))}
                            className="w-20 text-right"
                          />
                        ) : (
                          item.quantityRefunded
                        )}
                      </TableCell>
                      <TableCell className="text-right">₹{item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{item.refundAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={item.restoreInventory}
                          onCheckedChange={(checked) => updateRefundItem(index, "restoreInventory", checked)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end p-4 bg-muted/50 rounded-lg">
            <div className="text-right">
              <Label className="text-muted-foreground">Total Refund Amount</Label>
              <p className="text-2xl font-bold text-orange-600">₹{totalRefundAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes for this refund request..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700">
            Submit Refund Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
