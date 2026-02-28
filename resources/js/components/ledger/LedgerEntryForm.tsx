import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

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
      const validated = ledgerSchema.parse(formData);
      
      setLoading(true);
      const { error } = await supabase.from("ledger_entries" as any).insert([{
        user_id: user?.id,
        category: validated.category,
        company_name: validated.companyName,
        document_type: validated.documentType,
        document_date: validated.documentDate,
        document_number: validated.documentNumber,
        debit: validated.debit,
        credit: validated.credit,
      }]);

      if (error) throw error;

      toast.success("Ledger entry added successfully");
      setFormData({
        category: "",
        companyName: "",
        documentType: "",
        documentDate: "",
        documentNumber: "",
        debit: "",
        credit: "",
      });
      
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
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
