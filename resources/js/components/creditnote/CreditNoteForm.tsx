import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
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
  items: InvoiceItem[];
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
    // Fetch active customers from Laravel API
    const response = await axios.get("/api/customers"); // adjust URL if needed

    // Assuming your API returns an array of customers
    const activeCustomers = (response.data || []).filter(
      (customer: any) => customer.status === "Active"
    );

    // Sort by customer_name
    activeCustomers.sort((a: any, b: any) =>
      a.customer_name.localeCompare(b.customer_name)
    );

    setCustomers(activeCustomers);
  } catch (error) {
    console.error("Error loading customers:", error);
  }
};

 const loadCustomerInvoices = async (customerId: string) => {
  setLoadingInvoices(true);
  console.log("Loading invoices for customer:", customerId);

  try {
    const response = await axios.get("/api/invoices");
    let invoices: any[] = Array.isArray(response.data) ? response.data : [];

    const cid = Number(customerId);
    invoices = invoices
      .filter(
        (inv: any) =>
          inv.customer_id === cid &&
          ["sent", "paid", "pending", "overdue"].includes(inv.status.toLowerCase())
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
      );

    console.log("Filtered invoices:", invoices);
    setInvoices(invoices);

    if (invoices.length === 0) {
      console.warn("No invoices found for this customer!");
    }
  } catch (error: any) {
    console.error("Error loading invoices:", error.response?.data || error.message || error);
    setInvoices([]);
  } finally {
    setLoadingInvoices(false);
  }
};


 const loadInvoiceItems = async (invoiceId: string) => {
  setLoadingItems(true);
  try {
    // Find selected invoice from existing invoices array
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    setSelectedInvoice(invoice || null);

    // Use the items already inside the invoice object
    const data = invoice?.items || [];

    if (data.length > 0) {
      const items: LineItem[] = data.map((item: any) => ({
        id: crypto.randomUUID(),
        invoice_item_id: item.id,
        item_code: item.item_code || "",
        item_name: item.description || item.item || "", // adjust based on your API
        quantity: parseFloat(item.quantity) || 0,
        max_quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.rate) || 0,
        total: parseFloat(item.total) || 0,
      }));

      setLineItems(items);
      toast.success(`Loaded ${items.length} items from invoice`);
    } else {
      // No items, initialize a blank line item
      setLineItems([
        {
          id: crypto.randomUUID(),
          item_code: "",
          item_name: "",
          quantity: 1,
          max_quantity: 0,
          unit_price: 0,
          total: 0,
        },
      ]);
    }
  } catch (error) {
    console.error("Error loading invoice items:", error);
    setLineItems([
      {
        id: crypto.randomUUID(),
        item_code: "",
        item_name: "",
        quantity: 1,
        max_quantity: 0,
        unit_price: 0,
        total: 0,
      },
    ]);
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
    const customer = customers.find((c) => c.id.toString() === formData.customer_id);

    // Prepare credit note payload
    const creditNoteData = {
      credit_note_number: generateCreditNoteNumber(),
      customer_id: formData.customer_id,
      customer_name: customer?.customer_name || "",
      invoice_id: formData.invoice_id || null,
      invoice_number: selectedInvoice?.invoice_number || null,
      credit_date: formData.credit_date,
      reason: formData.reason,
      notes: formData.notes || null,
      status: "Draft",
      total_amount: calculateTotal(),
      applied_amount: 0,
    };

    // Create credit note via Laravel API
    const creditNoteResponse = await axios.post("/api/credit-notes", creditNoteData);
    const creditNote = creditNoteResponse.data;

    // Prepare line items payload
    const itemsToInsert = validItems.map((item) => ({
      credit_note_id: creditNote.id,
      item_code: item.item_code?.trim() ? item.item_code : "NA", // fallback
      item_name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
    }));

    // Insert line items via Laravel API
    if (itemsToInsert.length > 0) {
      await axios.post("/api/credit-note-items", itemsToInsert);
    }

    toast.success("Credit note created successfully");
    onSuccess?.();
  } catch (error: any) {
    console.error("Error creating credit note:", error);
    toast.error(error.response?.data?.message || error.message || "Failed to create credit note");
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (formData.customer_id) {
    loadCustomerInvoices(formData.customer_id);
  } else {
    setInvoices([]);
  }
}, [formData.customer_id]);

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
  value={formData.customer_id?.toString() || ""}
  onValueChange={(value: string) =>
    setFormData((prev) => ({ ...prev, customer_id: value, invoice_id: "" }))
  }
>
  <SelectTrigger>
    <SelectValue placeholder="Select customer" />
  </SelectTrigger>
  <SelectContent>
    {customers.map((customer) => (
      <SelectItem key={customer.id} value={customer.id.toString()}>
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
  onValueChange={(value: string) =>
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
      <SelectValue
        placeholder={
          formData.customer_id ? "Select invoice (optional)" : "Select customer first"
        }
      />
    )}
  </SelectTrigger>

 <SelectContent>
  <SelectItem value="none">No invoice (manual entry)</SelectItem>

  {invoices.length > 0 ? (
    invoices.map((invoice) => (
      <SelectItem key={invoice.id} value={invoice.id.toString()}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {invoice.invoice_number} - ₹{invoice.total_amount.toLocaleString()}
        </div>
      </SelectItem>
    ))
  ) : (
    <SelectItem value="empty" disabled>
      No invoices available for this customer
    </SelectItem>
  )}
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
      {/* Item Code */}
      <TableCell>
        <Input
          value={item.item_code}
          onChange={(e) => handleItemChange(item.id, "item_code", e.target.value)}
          placeholder="Code"
          disabled={!!item.invoice_item_id} // prevent edit if linked to existing invoice
        />
      </TableCell>

      {/* Item Name */}
      <TableCell>
        <Input
          value={item.item_name}
          onChange={(e) => handleItemChange(item.id, "item_name", e.target.value)}
          placeholder="Item name"
          disabled={!!item.invoice_item_id}
        />
      </TableCell>

      {/* Quantity with max check */}
      <TableCell>
        <div className="space-y-1">
          <Input
            type="number"
            min={1}
            max={item.max_quantity || undefined}
            value={item.quantity}
            onChange={(e) => {
              let value = parseInt(e.target.value) || 0;
              if (item.max_quantity && value > item.max_quantity) value = item.max_quantity;
              handleItemChange(item.id, "quantity", value);
            }}
          />
          {item.max_quantity > 0 && (
            <p className="text-xs text-muted-foreground">Max: {item.max_quantity}</p>
          )}
        </div>
      </TableCell>

      {/* Unit Price */}
      <TableCell>
        <Input
          type="number"
          min={0}
          step={0.01}
          value={item.unit_price}
          onChange={(e) => handleItemChange(item.id, "unit_price", parseFloat(e.target.value) || 0)}
          disabled={!!item.invoice_item_id}
        />
      </TableCell>

      {/* Total */}
      <TableCell className="font-medium">
        ₹{(item.quantity * item.unit_price).toFixed(2)}
      </TableCell>

      {/* Remove Button */}
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeLineItem(item.id)}
          disabled={lineItems.length === 1} // prevent removing last line
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
