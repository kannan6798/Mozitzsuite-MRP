import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import axios from "axios";

interface LedgerEntryFormProps {
  onSuccess?: () => void;
}

const ledgerSchema = z.object({
  category: z.string().min(1, "Category is required"),
  companyName: z.string().trim().min(1, "Company name is required").max(200),
  documentType: z.string().min(1, "Document type is required"),
  documentDate: z.string().min(1, "Document date is required"),
  documentNumber: z.string().trim().min(1, "Document number is required").max(100),
  debit: z.coerce.number().nonnegative("Debit cannot be negative").max(999999999.99),
  credit: z.coerce.number().nonnegative("Credit cannot be negative").max(999999999.99),
}).refine((data) => data.debit > 0 || data.credit > 0, {
  message: "Either debit or credit must be greater than 0",
});

const LedgerEntryForm = ({ onSuccess }: LedgerEntryFormProps) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    category: "",
    companyName: "",
    documentType: "",
    documentDate: "",
    documentNumber: "",
    debit: "",
    credit: "",
  });
  const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    // Validate form data with Zod
    const validated = ledgerSchema.parse(formData);

    setLoading(true);

    // Send POST request to Laravel API using Axios
    await axios.post("/api/ledger-entries", {
      category: validated.category,
      company_name: validated.companyName,
      document_type: validated.documentType,
      document_date: validated.documentDate,
      document_number: validated.documentNumber,
      debit: validated.debit,
      credit: validated.credit,
    });

    toast.success("Ledger entry added successfully");

    // Reset form
    setFormData({
      category: "",
      companyName: "",
      documentType: "",
      documentDate: "",
      documentNumber: "",
      debit: "0",
      credit: "0",
    });

    if (onSuccess) onSuccess();
  }catch (err: any) {
  if (err instanceof z.ZodError) {
    // Use err.issues instead of err.errors
    const messages = err.issues.map((issue) => issue.message).join(", ");
    toast.error(messages);
  } else if (err.response?.status === 422) {
    const errors = Object.values(err.response.data.errors)
      .flat()
      .join(", ");
    toast.error(errors);
  } else {
    toast.error("Failed to add ledger entry");
  }
} finally {
    setLoading(false);
  }
};

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Ledger Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Purchase">Purchase</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="Liability">Liability</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={formData.documentType} onValueChange={(value) => setFormData({ ...formData, documentType: value })}>
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Receipt">Receipt</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="Journal">Journal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentDate">Document Date</Label>
              <Input
                id="documentDate"
                type="date"
                value={formData.documentDate}
                onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNumber">Document Number</Label>
              <Input
                id="documentNumber"
                value={formData.documentNumber}
                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                placeholder="Enter document number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="debit">Debit Amount</Label>
              <Input
                id="debit"
                type="number"
                step="0.01"
                min="0"
                value={formData.debit}
                onChange={(e) => setFormData({ ...formData, debit: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credit">Credit Amount</Label>
              <Input
                id="credit"
                type="number"
                step="0.01"
                min="0"
                value={formData.credit}
                onChange={(e) => setFormData({ ...formData, credit: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Adding..." : "Add Entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LedgerEntryForm;
