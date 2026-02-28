import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Eye, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditNote, CreditNoteItem } from "@/pages/CreditNotes";
import { format } from "date-fns";

interface CreditNoteListProps {
  creditNotes: CreditNote[];
  loading: boolean;
  onRefresh: () => void;
}

const CreditNoteList = ({ creditNotes, loading, onRefresh }: CreditNoteListProps) => {
  const [viewDialog, setViewDialog] = useState(false);
  const [applyDialog, setApplyDialog] = useState(false);
  const [selectedNote, setSelectedNote] = useState<CreditNote | null>(null);
  const [noteItems, setNoteItems] = useState<CreditNoteItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [applyNotes, setApplyNotes] = useState("");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      approved: { variant: "default", label: "Approved" },
      applied: { variant: "outline", label: "Applied" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      return: "Product Return",
      discount: "Discount/Price Adjustment",
      defective: "Defective Goods",
      overcharge: "Overcharge Correction",
      cancellation: "Order Cancellation",
      other: "Other",
    };
    return reasons[reason] || reason;
  };

  const handleView = async (note: CreditNote) => {
    setSelectedNote(note);
    try {
      const { data, error } = await (supabase as any)
        .from("credit_note_items")
        .select("*")
        .eq("credit_note_id", note.id);

      if (error) throw error;
      setNoteItems(data || []);
    } catch (error) {
      console.error("Error loading credit note items:", error);
    }
    setViewDialog(true);
  };

  const handleStatusChange = async (note: CreditNote, newStatus: string) => {
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("credit_notes")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", note.id);

      if (error) throw error;
      toast.success(`Credit note ${newStatus === "approved" ? "approved" : "cancelled"}`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedNote) return;

    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("credit_notes")
        .update({
          status: "applied",
          applied_amount: selectedNote.total_amount,
          notes: applyNotes ? `${selectedNote.notes || ""}\n\nApplication Notes: ${applyNotes}` : selectedNote.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedNote.id);

      if (error) throw error;

      toast.success("Credit note applied successfully");
      setApplyDialog(false);
      setApplyNotes("");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to apply credit note");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading credit notes...</div>;
  }

  if (creditNotes.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No credit notes found</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Credit Note #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creditNotes.map((note) => (
            <TableRow key={note.id}>
              <TableCell className="font-medium">{note.credit_note_number}</TableCell>
              <TableCell>{note.customer_name}</TableCell>
              <TableCell>{format(new Date(note.credit_date), "dd/MM/yyyy")}</TableCell>
              <TableCell>{getReasonLabel(note.reason)}</TableCell>
              <TableCell className="text-right font-medium">₹{note.total_amount?.toFixed(2)}</TableCell>
              <TableCell>{getStatusBadge(note.status)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(note)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {note.status === "draft" && (
                      <>
                        <DropdownMenuItem onClick={() => handleStatusChange(note, "approved")}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(note, "cancelled")}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel
                        </DropdownMenuItem>
                      </>
                    )}
                    {note.status === "approved" && (
                      <DropdownMenuItem onClick={() => { setSelectedNote(note); setApplyDialog(true); }}>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Apply Credit
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Credit Note Details</DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Credit Note Number</p>
                  <p className="font-medium">{selectedNote.credit_note_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedNote.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(selectedNote.credit_date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedNote.status)}
                </div>
              </div>

              {noteItems.length > 0 && (
                <div>
                  <p className="font-medium mb-2">Line Items</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {noteItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_code}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">₹{item.unit_price?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">₹{item.total?.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Credit Amount</p>
                  <p className="text-2xl font-bold text-primary">₹{selectedNote.total_amount?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Dialog */}
      <Dialog open={applyDialog} onOpenChange={setApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Credit Note</DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-4">
              <p>Apply credit of <strong>₹{selectedNote.total_amount?.toFixed(2)}</strong> for <strong>{selectedNote.customer_name}</strong>?</p>
              <div className="space-y-2">
                <Label>Application Notes (Optional)</Label>
                <Textarea value={applyNotes} onChange={(e) => setApplyNotes(e.target.value)} placeholder="Add any notes..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialog(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={actionLoading}>{actionLoading ? "Applying..." : "Apply Credit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreditNoteList;
