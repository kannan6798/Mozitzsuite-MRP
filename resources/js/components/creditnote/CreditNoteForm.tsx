import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface CreditNoteFormProps {
  onSuccess?: () => void;
}

interface Customer {
  id: string;
  customer_name: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: number;
  customer_id: string;
  status: string;
  credit_applied: number;
}

interface InvoiceItem {
  id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface LineItem {
  id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  max_quantity: number;
  unit_price: number;
  total: number;
  invoice_item_id?: string;
}

const CreditNoteForm = ({ onSuccess }: CreditNoteFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    invoice_id: "",
    credit_date: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), item_code: "", item_name: "", quantity: 1, max_quantity: 0, unit_price: 0, total: 0 },
  ]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (formData.customer_id) {
      loadCustomerInvoices(formData.customer_id);
    } else {
      setInvoices([]);
      setFormData((prev) => ({ ...prev, invoice_id: "" }));
    }
  }, [formData.customer_id]);

  useEffect(() => {
    if (formData.invoice_id) {
      loadInvoiceItems(formData.invoice_id);
    } else {
      setSelectedInvoice(null);
      setLineItems([
        { id: crypto.randomUUID(), item_code: "", item_name: "", quantity: 1, max_quantity: 0, unit_price: 0, total: 0 },
      ]);
    }
  }, [formData.invoice_id]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, customer_name")
        .eq("status", "Active")
        .order("customer_name");

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const loadCustomerInvoices = async (customerId: string) => {
    setLoadingInvoices(true);
    try {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .select("id, invoice_number, invoice_date, total_amount, customer_id, status, credit_applied")
        .eq("customer_id", customerId)
        .in("status", ["sent", "paid", "pending", "overdue"])
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error loading invoices:", error);
      setInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadInvoiceItems = async (invoiceId: string) => {
    setLoadingItems(true);
    try {
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      setSelectedInvoice(invoice || null);

      const { data, error } = await (supabase as any)
        .from("invoice_items")
        .select("id, item_code, item_name, quantity, unit_price, total")
        .eq("invoice_id", invoiceId);

      if (error) throw error;

      if (data && data.length > 0) {
        const items: LineItem[] = data.map((item: InvoiceItem) => ({
          id: crypto.randomUUID(),
          invoice_item_id: item.id,
          item_code: item.item_code || "",
          item_name: item.item_name,
          quantity: item.quantity,
          max_quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
        }));
        setLineItems(items);
        toast.success(`Loaded ${items.length} items from invoice`);
      } else {
        setLineItems([
          { id: crypto.randomUUID(), item_code: "", item_name: "", quantity: 1, max_quantity: 0, unit_price: 0, total: 0 },
        ]);
      }
    } catch (error) {
      console.error("Error loading invoice items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity") {
            // Enforce max quantity if from invoice
            if (item.max_quantity > 0 && Number(value) > item.max_quantity) {
              updated.quantity = item.max_quantity;
              toast.warning(`Maximum quantity is ${item.max_quantity}`);
            }
          }
          if (field === "quantity" || field === "unit_price") {
            updated.total = updated.quantity * updated.unit_price;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), item_code: "", item_name: "", quantity: 1, max_quantity: 0, unit_price: 0, total: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const generateCreditNoteNumber = () => {
    const prefix = "CN";
    const timestamp = Date.now().toString().slice(-8);
    return `${prefix}-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id) {
      toast.error("Please select a customer");
      return;
    }

    if (!formData.reason) {
      toast.error("Please enter a reason for the credit note");
      return;
    }

    const validItems = lineItems.filter((item) => item.item_name && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    setLoading(true);

    try {
      const customer = customers.find((c) => c.id === formData.customer_id);

      const creditNoteData = {
        credit_note_number: generateCreditNoteNumber(),
        customer_id: formData.customer_id,
        customer_name: customer?.customer_name || "",
        invoice_id: formData.invoice_id || null,
        invoice_number: selectedInvoice?.invoice_number || null,
        credit_date: formData.credit_date,
        reason: formData.reason,
        notes: formData.notes || null,
        status: "draft",
        total_amount: calculateTotal(),
        applied_amount: 0,
      };

      const { data: creditNote, error: creditNoteError } = await (supabase as any)
        .from("credit_notes")
        .insert(creditNoteData)
        .select()
        .single();

      if (creditNoteError) throw creditNoteError;

      // Insert line items
      const itemsToInsert = validItems.map((item) => ({
        credit_note_id: creditNote.id,
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("credit_note_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast.success("Credit note created successfully");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating credit note:", error);
      toast.error(error.message || "Failed to create credit note");
    } finally {
      setLoading(false);
    }
  };

  const getRemainingCredit = () => {
    if (!selectedInvoice) return 0;
    return selectedInvoice.total_amount - (selectedInvoice.credit_applied || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Credit Note</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, customer_id: value, invoice_id: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice">Link to Invoice</Label>
            <Select
                value={formData.invoice_id || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, invoice_id: value === "none" ? "" : value }))
                }
                disabled={!formData.customer_id || loadingInvoices}
              >
                <SelectTrigger>
                  {loadingInvoices ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <SelectValue placeholder={formData.customer_id ? "Select invoice (optional)" : "Select customer first"} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No invoice (manual entry)</SelectItem>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {invoice.invoice_number} - ₹{invoice.total_amount.toLocaleString()}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit_date">Credit Date *</Label>
              <Input
                id="credit_date"
                type="date"
                value={formData.credit_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, credit_date: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Select
                value={formData.reason}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, reason: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="return">Product Return</SelectItem>
                  <SelectItem value="discount">Discount/Price Adjustment</SelectItem>
                  <SelectItem value="defective">Defective Goods</SelectItem>
                  <SelectItem value="overcharge">Overcharge Correction</SelectItem>
                  <SelectItem value="cancellation">Order Cancellation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoice Info Banner */}
          {selectedInvoice && (
            <div className="bg-muted/50 p-4 rounded-lg border flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Linked to Invoice: {selectedInvoice.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">
                    Invoice Total: ₹{selectedInvoice.total_amount.toLocaleString()} | 
                    Already Credited: ₹{(selectedInvoice.credit_applied || 0).toLocaleString()} |
                    Remaining: ₹{getRemainingCredit().toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="capitalize">
                {selectedInvoice.status}
              </Badge>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Line Items {selectedInvoice && <span className="text-muted-foreground">(auto-populated from invoice)</span>}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading invoice items...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="w-24">Quantity</TableHead>
                    <TableHead className="w-32">Unit Price</TableHead>
                    <TableHead className="w-32">Total</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.item_code}
                          onChange={(e) => handleItemChange(item.id, "item_code", e.target.value)}
                          placeholder="Code"
                          disabled={!!item.invoice_item_id}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.item_name}
                          onChange={(e) => handleItemChange(item.id, "item_name", e.target.value)}
                          placeholder="Item name"
                          disabled={!!item.invoice_item_id}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            type="number"
                            min="1"
                            max={item.max_quantity || undefined}
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, "quantity", parseInt(e.target.value) || 0)}
                          />
                          {item.max_quantity > 0 && (
                            <p className="text-xs text-muted-foreground">Max: {item.max_quantity}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(item.id, "unit_price", parseFloat(e.target.value) || 0)}
                          disabled={!!item.invoice_item_id}
                        />
                      </TableCell>
                      <TableCell className="font-medium">₹{item.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Credit Amount</p>
                <p className="text-2xl font-bold text-primary">₹{calculateTotal().toFixed(2)}</p>
                {selectedInvoice && calculateTotal() > getRemainingCredit() && (
                  <p className="text-sm text-destructive">
                    Warning: Credit exceeds remaining invoice amount
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Credit Note"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreditNoteForm;
