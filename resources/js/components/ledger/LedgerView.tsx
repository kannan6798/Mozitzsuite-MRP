import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";

interface LedgerEntry {
  id: string;
  category: string;
  company_name: string;
  document_type: string;
  document_date: string;
  document_number: string;
  debit: number;
  credit: number;
  created_at: string;
}

const LedgerView = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LedgerEntry[]>([]);
  const [filters, setFilters] = useState({
    category: "all",
    companyName: "all",
    documentType: "all",
  });
  const [loading, setLoading] = useState(true);

  const loadEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("ledger_entries" as any)
        .select("*")
        .order("document_date", { ascending: false });

      if (error) throw error;
      setEntries(data as any || []);
      setFilteredEntries(data as any || []);
    } catch (error) {
      toast.error("Failed to load ledger entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, entries]);

  const applyFilters = () => {
    let filtered = [...entries];

    if (filters.category !== "all") {
      filtered = filtered.filter((entry) => entry.category === filters.category);
    }

    if (filters.companyName !== "all") {
      filtered = filtered.filter((entry) => entry.company_name === filters.companyName);
    }

    if (filters.documentType !== "all") {
      filtered = filtered.filter((entry) => entry.document_type === filters.documentType);
    }

    setFilteredEntries(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("ledger_entries" as any).delete().eq("id", id);
      if (error) throw error;
      
      toast.success("Entry deleted successfully");
      loadEntries();
    } catch (error) {
      toast.error("Failed to delete entry");
    }
  };

  const totalDebit = filteredEntries.reduce((sum, entry) => sum + Number(entry.debit), 0);
  const totalCredit = filteredEntries.reduce((sum, entry) => sum + Number(entry.credit), 0);
  const netDebit = totalDebit - totalCredit;

  const uniqueCategories = Array.from(new Set(entries.map((e) => e.category)));
  const uniqueCompanies = Array.from(new Set(entries.map((e) => e.company_name)));

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Entries" value={filteredEntries.length.toString()} icon={FileText} />
        <StatCard title="Total Debit" value={`₹${totalDebit.toFixed(2)}`} icon={TrendingUp} />
        <StatCard title="Total Credit" value={`₹${totalCredit.toFixed(2)}`} icon={TrendingDown} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Select value={filters.category} onValueChange={(value) => setFilters({ ...filters, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filters.companyName} onValueChange={(value) => setFilters({ ...filters, companyName: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map((company) => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={filters.documentType} onValueChange={(value) => setFilters({ ...filters, documentType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Document Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Document Types</SelectItem>
                  <SelectItem value="Invoice">Invoice</SelectItem>
                  <SelectItem value="Receipt">Receipt</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="Journal">Journal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Document No.</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.category}</TableCell>
                      <TableCell>{entry.company_name}</TableCell>
                      <TableCell>{entry.document_type}</TableCell>
                      <TableCell>{new Date(entry.document_date).toLocaleDateString()}</TableCell>
                      <TableCell>{entry.document_number}</TableCell>
                      <TableCell className="text-right">
                        {entry.debit > 0 ? `₹${Number(entry.debit).toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit > 0 ? `₹${Number(entry.credit).toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LedgerView;
