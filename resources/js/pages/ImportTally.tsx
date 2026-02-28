import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Database, CheckCircle2, AlertCircle, Download, RefreshCw, FileText, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ImportItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  rate: number;
  amount: number;
  group: string;
  status: "pending" | "imported" | "error";
  errorMessage?: string;
}

const ImportTally = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [importType, setImportType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      parseExcelFile(file);
    }
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const items: ImportItem[] = jsonData.map((row: any, index: number) => ({
        id: `item-${index}`,
        itemCode: row["Item Code"] || row["Code"] || row["SKU"] || `ITEM-${index + 1}`,
        itemName: row["Item Name"] || row["Name"] || row["Description"] || "",
        quantity: parseFloat(row["Quantity"] || row["Qty"] || row["Stock"] || 0),
        rate: parseFloat(row["Rate"] || row["Price"] || row["Unit Price"] || 0),
        amount: parseFloat(row["Amount"] || row["Value"] || 0),
        group: row["Group"] || row["Category"] || "General",
        status: "pending" as const,
      }));

      setImportItems(items);
      setSelectedItems(new Set(items.map(item => item.id)));
      setActiveTab("preview");

      toast({
        title: "File Parsed Successfully",
        description: `Found ${items.length} items to import`,
      });
    } catch (error: any) {
      toast({
        title: "Error Parsing File",
        description: error.message || "Failed to parse the Excel file",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(importItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleImport = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one item to import",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate import process
    const updatedItems = importItems.map(item => {
      if (selectedItems.has(item.id)) {
        return { ...item, status: "imported" as const };
      }
      return item;
    });

    setImportItems(updatedItems);
    setIsProcessing(false);
    setActiveTab("results");

    toast({
      title: "Import Complete",
      description: `Successfully imported ${selectedItems.size} items`,
    });
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { "Item Code": "ITEM-001", "Item Name": "Sample Product 1", "Quantity": 100, "Rate": 50, "Amount": 5000, "Group": "Products" },
      { "Item Code": "ITEM-002", "Item Name": "Sample Product 2", "Quantity": 200, "Rate": 75, "Amount": 15000, "Group": "Components" },
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "tally_import_template.xlsx");

    toast({
      title: "Template Downloaded",
      description: "Use this template to format your Tally data",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "imported":
        return <Badge className="bg-green-600 text-white">Imported</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Layout>
      <div className="p-6">
        {/* Header Section */}
        <div className="bg-[hsl(var(--erp-header))] text-[hsl(var(--erp-header-foreground))] px-4 py-3 rounded-t-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Import from Tally</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-[hsl(var(--erp-input))] text-[hsl(var(--erp-input-foreground))] border-[hsl(var(--erp-border))] hover:bg-[hsl(var(--erp-tab))]"
              onClick={handleDownloadTemplate}
            >
              <Download className="h-4 w-4 mr-1" />
              Download Template
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="border border-t-0 border-[hsl(var(--erp-border))] rounded-b-md bg-[hsl(var(--erp-fieldset))]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-[hsl(var(--erp-border))] bg-transparent h-auto p-0">
              <TabsTrigger 
                value="upload" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--erp-header))] data-[state=active]:bg-[hsl(var(--erp-tab-active))] px-6 py-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--erp-header))] data-[state=active]:bg-[hsl(var(--erp-tab-active))] px-6 py-2"
                disabled={importItems.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Preview Data
              </TabsTrigger>
              <TabsTrigger 
                value="mapping" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--erp-header))] data-[state=active]:bg-[hsl(var(--erp-tab-active))] px-6 py-2"
                disabled={importItems.length === 0}
              >
                <Settings className="h-4 w-4 mr-2" />
                Field Mapping
              </TabsTrigger>
              <TabsTrigger 
                value="results" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--erp-header))] data-[state=active]:bg-[hsl(var(--erp-tab-active))] px-6 py-2"
                disabled={importItems.filter(i => i.status === "imported").length === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Results
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="p-6 mt-0">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Panel - Upload Options */}
                <Card className="border-[hsl(var(--erp-border))]">
                  <CardHeader className="bg-[hsl(var(--erp-tab))] border-b border-[hsl(var(--erp-border))]">
                    <CardTitle className="text-base">Import Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[hsl(var(--erp-label))]">Import Type</Label>
                      <Select value={importType} onValueChange={setImportType}>
                        <SelectTrigger className="bg-[hsl(var(--erp-input))] border-[hsl(var(--erp-border))]">
                          <SelectValue placeholder="Select import type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stock">Stock Items</SelectItem>
                          <SelectItem value="ledger">Ledger Accounts</SelectItem>
                          <SelectItem value="voucher">Vouchers</SelectItem>
                          <SelectItem value="masters">Masters</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[hsl(var(--erp-label))]">File Format</Label>
                      <Select defaultValue="excel">
                        <SelectTrigger className="bg-[hsl(var(--erp-input))] border-[hsl(var(--erp-border))]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excel">Excel (.xlsx, .xls)</SelectItem>
                          <SelectItem value="csv">CSV (.csv)</SelectItem>
                          <SelectItem value="xml">XML (.xml)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[hsl(var(--erp-label))]">Duplicate Handling</Label>
                      <Select defaultValue="skip">
                        <SelectTrigger className="bg-[hsl(var(--erp-input))] border-[hsl(var(--erp-border))]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip Duplicates</SelectItem>
                          <SelectItem value="update">Update Existing</SelectItem>
                          <SelectItem value="create">Create New</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Panel - File Upload */}
                <Card className="border-[hsl(var(--erp-border))]">
                  <CardHeader className="bg-[hsl(var(--erp-tab))] border-b border-[hsl(var(--erp-border))]">
                    <CardTitle className="text-base">Upload File</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div 
                      className="border-2 border-dashed border-[hsl(var(--erp-border))] rounded-lg p-8 text-center hover:border-[hsl(var(--erp-header))] transition-colors cursor-pointer bg-background"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv,.xml"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">
                        {selectedFile ? selectedFile.name : "Drop your file here or click to browse"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supported formats: Excel, CSV, XML
                      </p>
                    </div>

                    {selectedFile && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-800">{selectedFile.name}</span>
                        <Badge className="ml-auto bg-green-600">Ready</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="p-0 mt-0">
              <div className="p-4 border-b border-[hsl(var(--erp-border))] bg-background flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {selectedItems.size} of {importItems.length} items selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab("upload")}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Re-upload
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleImport}
                    disabled={isProcessing || selectedItems.size === 0}
                    className="bg-[hsl(var(--erp-header))] hover:bg-[hsl(var(--erp-header))]/90"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-1" />
                        Import Selected
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[hsl(var(--erp-tab))]">
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={selectedItems.size === importItems.length && importItems.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="font-semibold">Item Code</TableHead>
                      <TableHead className="font-semibold">Item Name</TableHead>
                      <TableHead className="font-semibold text-right">Quantity</TableHead>
                      <TableHead className="font-semibold text-right">Rate</TableHead>
                      <TableHead className="font-semibold text-right">Amount</TableHead>
                      <TableHead className="font-semibold">Group</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importItems.map((item) => (
                      <TableRow key={item.id} className="bg-background hover:bg-muted/50">
                        <TableCell>
                          <Checkbox 
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.itemCode}</TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell className="text-right">{item.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{item.amount.toLocaleString()}</TableCell>
                        <TableCell>{item.group}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Field Mapping Tab */}
            <TabsContent value="mapping" className="p-6 mt-0">
              <Card className="border-[hsl(var(--erp-border))]">
                <CardHeader className="bg-[hsl(var(--erp-tab))] border-b border-[hsl(var(--erp-border))]">
                  <CardTitle className="text-base">Field Mapping Configuration</CardTitle>
                  <CardDescription>Map your Tally export columns to system fields</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {["Item Code", "Item Name", "Quantity", "Rate", "Amount", "Group"].map((field) => (
                      <div key={field} className="flex items-center gap-4">
                        <Label className="w-32 text-[hsl(var(--erp-label))]">{field}</Label>
                        <Select defaultValue={field.toLowerCase().replace(" ", "_")}>
                          <SelectTrigger className="bg-[hsl(var(--erp-input))] border-[hsl(var(--erp-border))]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="item_code">Item Code</SelectItem>
                            <SelectItem value="item_name">Item Name</SelectItem>
                            <SelectItem value="quantity">Quantity</SelectItem>
                            <SelectItem value="rate">Rate</SelectItem>
                            <SelectItem value="amount">Amount</SelectItem>
                            <SelectItem value="group">Group/Category</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="p-6 mt-0">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="border-[hsl(var(--erp-border))]">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {importItems.filter(i => i.status === "imported").length}
                      </p>
                      <p className="text-sm text-muted-foreground">Items Imported</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[hsl(var(--erp-border))]">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {importItems.filter(i => i.status === "error").length}
                      </p>
                      <p className="text-sm text-muted-foreground">Errors</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[hsl(var(--erp-border))]">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <FileSpreadsheet className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{importItems.length}</p>
                      <p className="text-sm text-muted-foreground">Total Records</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-[hsl(var(--erp-border))]">
                <CardHeader className="bg-[hsl(var(--erp-tab))] border-b border-[hsl(var(--erp-border))]">
                  <CardTitle className="text-base">Import Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Item Code</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.itemCode}</TableCell>
                            <TableCell>{item.itemName}</TableCell>
                            <TableCell>{getStatusBadge(item.status)}</TableCell>
                            <TableCell>
                              {item.status === "imported" ? "Successfully imported" : item.errorMessage || "Pending"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default ImportTally;
