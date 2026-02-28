import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ClipboardList, Package, CheckCircle, AlertTriangle, BarChart3, ScanLine, FileText, Trash2, Play, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import axios from "axios";

interface Stocktake {
  id: string;
  stocktakeNo: string;
  name: string;
  status: "Draft" | "In Progress" | "Completed" | "Cancelled";
  createdAt: string;
  completedAt?: string;
  location: string;
  countedItems: number;
  totalItems: number;
  varianceValue: number;
  notes?: string;
  items: StocktakeItem[];
}

interface StocktakeItem {
  id: string;
  itemCode: string;
  itemName: string;
  systemQty: number;
  countedQty: number | null;
  variance: number;
  varianceValue: number;
  unitCost: number;
  uom: string;
  counted: boolean;
  barcode?: string;
}

const StocktakesTab = () => {
  const { toast } = useToast();
  const [stocktakes, setStocktakes] = useState<Stocktake[]>(() => {
    const saved = localStorage.getItem("stocktakes");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCountDialogOpen, setIsCountDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedStocktake, setSelectedStocktake] = useState<Stocktake | null>(null);
  const [locations, setLocations] = useState<{ id: string; location_name: string }[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Form states for new stocktake
  const [newStocktakeName, setNewStocktakeName] = useState("");
  const [newStocktakeLocation, setNewStocktakeLocation] = useState("All Locations");
  const [newStocktakeNotes, setNewStocktakeNotes] = useState("");

  // Count dialog states
  const [countItems, setCountItems] = useState<StocktakeItem[]>([]);
  const [countSearchTerm, setCountSearchTerm] = useState("");
  const [scanMode, setScanMode] = useState(false);

 useEffect(() => {
  const fetchData = async () => {
    try {
      // Fetch locations and inventory items in parallel
      const [locsRes, itemsRes] = await Promise.all([
        axios.get("/api/locations"), // Backend should return [{ id, location_name }]
        axios.get("/api/inventory-stock"), // Backend should return full inventory items
      ]);

      const locs = locsRes.data || [];
      const items = itemsRes.data || [];

      if (locs.length > 0) setLocations(locs);
      if (items.length > 0) setInventoryItems(items);
    } catch (error: any) {
      console.error("Error fetching locations or inventory items:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive",
      });
    }
  };

  fetchData();
}, []);

  useEffect(() => {
    localStorage.setItem("stocktakes", JSON.stringify(stocktakes));
  }, [stocktakes]);

  const generateStocktakeNo = () => {
    const prefix = "STK";
    const existingNumbers = stocktakes.map((s) => {
      const match = s.stocktakeNo.match(/STK-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = Math.max(0, ...existingNumbers) + 1;
    return `${prefix}-${String(nextNumber).padStart(5, "0")}`;
  };

  const handleCreateStocktake = async () => {
    if (!newStocktakeName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a stocktake name",
        variant: "destructive",
      });
      return;
    }

    // Create stocktake items from inventory
    const items: StocktakeItem[] = inventoryItems
      .filter((item) => newStocktakeLocation === "All Locations" || item.location === newStocktakeLocation)
      .map((item, idx) => ({
        id: `item-${idx}`,
        itemCode: item.item_code,
        itemName: item.item_name,
        systemQty: item.quantity_on_hand || 0,
        countedQty: null,
        variance: 0,
        varianceValue: 0,
        unitCost: item.unit_cost || 0,
        uom: "EA",
        counted: false,
        barcode: item.barcode || "",
      }));

    const newStocktake: Stocktake = {
      id: crypto.randomUUID(),
      stocktakeNo: generateStocktakeNo(),
      name: newStocktakeName,
      status: "Draft",
      createdAt: new Date().toISOString(),
      location: newStocktakeLocation,
      countedItems: 0,
      totalItems: items.length,
      varianceValue: 0,
      notes: newStocktakeNotes,
      items,
    };

    setStocktakes((prev) => [...prev, newStocktake]);
    toast({
      title: "Stocktake Created",
      description: `${newStocktake.stocktakeNo} created with ${items.length} items`,
    });

    setNewStocktakeName("");
    setNewStocktakeLocation("All Locations");
    setNewStocktakeNotes("");
    setIsCreateDialogOpen(false);
  };

  const handleStartCount = (stocktake: Stocktake) => {
    setSelectedStocktake(stocktake);
    setCountItems([...stocktake.items]);
    setIsCountDialogOpen(true);

    // Update status to In Progress if Draft
    if (stocktake.status === "Draft") {
      setStocktakes((prev) =>
        prev.map((s) => (s.id === stocktake.id ? { ...s, status: "In Progress" } : s))
      );
    }
  };

  const handleViewStocktake = (stocktake: Stocktake) => {
    setSelectedStocktake(stocktake);
    setIsViewDialogOpen(true);
  };

  const handleCountQtyChange = (itemId: string, qty: number | null) => {
    setCountItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const countedQty = qty;
        const variance = countedQty !== null ? countedQty - item.systemQty : 0;
        const varianceValue = variance * item.unitCost;
        return {
          ...item,
          countedQty,
          variance,
          varianceValue,
          counted: countedQty !== null,
        };
      })
    );
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matchedItem = countItems.find(
      (item) =>
        item.barcode?.toLowerCase() === barcodeInput.toLowerCase() ||
        item.itemCode.toLowerCase() === barcodeInput.toLowerCase()
    );

    if (matchedItem) {
      // Increment count by 1 or set to 1 if not counted
      const newQty = (matchedItem.countedQty ?? 0) + 1;
      handleCountQtyChange(matchedItem.id, newQty);
      toast({
        title: "Item Scanned",
        description: `${matchedItem.itemCode} - Count: ${newQty}`,
      });
    } else {
      toast({
        title: "Item Not Found",
        description: `No item found with barcode/code: ${barcodeInput}`,
        variant: "destructive",
      });
    }

    setBarcodeInput("");
    barcodeInputRef.current?.focus();
  };

  const handleSaveCount = () => {
    if (!selectedStocktake) return;

    const countedCount = countItems.filter((i) => i.counted).length;
    const totalVariance = countItems.reduce((sum, i) => sum + i.varianceValue, 0);

    const updatedStocktake: Stocktake = {
      ...selectedStocktake,
      items: countItems,
      countedItems: countedCount,
      varianceValue: totalVariance,
    };

    setStocktakes((prev) => prev.map((s) => (s.id === selectedStocktake.id ? updatedStocktake : s)));
    setSelectedStocktake(updatedStocktake);

    toast({
      title: "Count Saved",
      description: `${countedCount}/${countItems.length} items counted`,
    });
  };

 const handleCompleteStocktake = async () => {
  if (!selectedStocktake) return;

  const uncountedItems = countItems.filter((i) => !i.counted);
  if (uncountedItems.length > 0) {
    toast({
      title: "Incomplete Count",
      description: `${uncountedItems.length} items have not been counted yet`,
      variant: "destructive",
    });
    return;
  }

  try {
    // Post adjustments to inventory
    for (const item of countItems) {
      if (item.variance !== 0) {
        // Fetch current stock item
        const stockItemRes = await axios.get(`/api/inventory-stock/${item.itemCode}`);
        const stockItem = stockItemRes.data;

        if (stockItem) {
          const newQty = item.countedQty ?? item.systemQty;
          const availableQty = Math.max(
            0,
            newQty - (stockItem.allocated_quantity || 0) - (stockItem.committed_quantity || 0)
          );

          // Update inventory stock
          await axios.put(`/api/inventory-stock/${item.itemCode}`, {
            quantity_on_hand: newQty,
            available_quantity: availableQty,
            updated_at: new Date().toISOString(),
          });

          // Create adjustment transaction
          await axios.post("/api/stock-transactions", {
            item_code: item.itemCode,
            transaction_type: "Adjustment",
            quantity: item.variance,
            reference_type: "Stocktake",
            reference_number: selectedStocktake.stocktakeNo,
            notes: `Stocktake adjustment: ${selectedStocktake.name}`,
            unit_cost: item.unitCost,
          });
        }
      }
    }

    const completedStocktake: Stocktake = {
      ...selectedStocktake,
      items: countItems,
      status: "Completed",
      completedAt: new Date().toISOString(),
      countedItems: countItems.length,
      varianceValue: countItems.reduce((sum, i) => sum + i.varianceValue, 0),
    };

    setStocktakes((prev) =>
      prev.map((s) => (s.id === selectedStocktake.id ? completedStocktake : s))
    );

    toast({
      title: "Stocktake Completed",
      description: `Inventory adjustments have been posted`,
    });

    setIsCountDialogOpen(false);
    setSelectedStocktake(null);
  } catch (error: any) {
    console.error("Error completing stocktake:", error);
    toast({
      title: "Error",
      description: error.message || "Failed to complete stocktake",
      variant: "destructive",
    });
  }
};

  const handleDeleteStocktake = (id: string) => {
    setStocktakes((prev) => prev.filter((s) => s.id !== id));
    toast({
      title: "Stocktake Deleted",
      description: "Stocktake has been removed",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Draft: "outline",
      "In Progress": "secondary",
      Completed: "default",
      Cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const filteredCountItems = countItems.filter(
    (item) =>
      item.itemCode.toLowerCase().includes(countSearchTerm.toLowerCase()) ||
      item.itemName.toLowerCase().includes(countSearchTerm.toLowerCase())
  );

  // Find inventory items that match search but aren't in count items yet (for adding)
  const matchingInventoryItems = countSearchTerm.trim()
    ? inventoryItems.filter(
        (inv) =>
          (inv.item_code.toLowerCase().includes(countSearchTerm.toLowerCase()) ||
            inv.item_name.toLowerCase().includes(countSearchTerm.toLowerCase())) &&
          !countItems.some((ci) => ci.itemCode === inv.item_code)
      )
    : [];

  // Add item from inventory to stocktake count
  const handleAddItemToCount = (inventoryItem: any) => {
    const newItem: StocktakeItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemCode: inventoryItem.item_code,
      itemName: inventoryItem.item_name,
      systemQty: inventoryItem.quantity_on_hand || 0,
      countedQty: null,
      variance: 0,
      varianceValue: 0,
      unitCost: inventoryItem.unit_cost || 0,
      uom: "EA",
      counted: false,
      barcode: inventoryItem.barcode || "",
    };
    setCountItems((prev) => [...prev, newItem]);
    setCountSearchTerm(""); // Clear search after adding
    toast({
      title: "Item Added",
      description: `${inventoryItem.item_code} added to stocktake`,
    });
  };

  const stats = {
    total: stocktakes.length,
    inProgress: stocktakes.filter((s) => s.status === "In Progress").length,
    completed: stocktakes.filter((s) => s.status === "Completed").length,
    totalVariance: stocktakes
      .filter((s) => s.status === "Completed")
      .reduce((sum, s) => sum + s.varianceValue, 0),
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Stocktakes</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Play className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className={`h-8 w-8 ${stats.totalVariance < 0 ? "text-destructive" : "text-green-500"}`} />
              <div>
                <p className="text-sm text-muted-foreground">Total Variance</p>
                <p className={`text-2xl font-bold ${stats.totalVariance < 0 ? "text-destructive" : ""}`}>
                  ${stats.totalVariance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Stocktakes</h3>
          <p className="text-sm text-muted-foreground">Physical inventory counts and adjustments</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Stocktake
        </Button>
      </div>

      {/* Stocktakes List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stocktake No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocktakes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No stocktakes found. Click "New Stocktake" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                stocktakes.map((stocktake) => (
                  <TableRow key={stocktake.id}>
                    <TableCell className="font-mono">{stocktake.stocktakeNo}</TableCell>
                    <TableCell>{stocktake.name}</TableCell>
                    <TableCell>{stocktake.location}</TableCell>
                    <TableCell>{getStatusBadge(stocktake.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${stocktake.totalItems > 0 ? (stocktake.countedItems / stocktake.totalItems) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stocktake.countedItems}/{stocktake.totalItems}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={stocktake.varianceValue < 0 ? "text-destructive" : ""}>
                      ${stocktake.varianceValue.toFixed(2)}
                    </TableCell>
                    <TableCell>{format(new Date(stocktake.createdAt), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {stocktake.status !== "Completed" && stocktake.status !== "Cancelled" && (
                          <Button variant="outline" size="sm" onClick={() => handleStartCount(stocktake)}>
                            <ScanLine className="h-4 w-4 mr-1" />
                            Count
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleViewStocktake(stocktake)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {stocktake.status === "Draft" && (
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteStocktake(stocktake.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Stocktake Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Stocktake</DialogTitle>
            <DialogDescription>Set up a new physical inventory count</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Stocktake Name *</Label>
              <Input
                value={newStocktakeName}
                onChange={(e) => setNewStocktakeName(e.target.value)}
                placeholder="e.g., Monthly Full Count - January 2026"
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={newStocktakeLocation} onValueChange={setNewStocktakeLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Locations">All Locations</SelectItem>
                 {locations.filter(loc => loc.location_name).map((loc) => (
                    <SelectItem key={loc.id} value={loc.location_name}>
                      {loc.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newStocktakeNotes}
                onChange={(e) => setNewStocktakeNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <Package className="h-4 w-4 inline mr-1" />
                {inventoryItems.filter(
                  (item) => newStocktakeLocation === "All Locations" || item.location === newStocktakeLocation
                ).length}{" "}
                items will be included in this stocktake
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStocktake}>Create Stocktake</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Count Dialog */}
      <Dialog open={isCountDialogOpen} onOpenChange={setIsCountDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {selectedStocktake?.stocktakeNo} - {selectedStocktake?.name}
            </DialogTitle>
            <DialogDescription>
              Count physical inventory and record quantities
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="count" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="count">
                <Package className="h-4 w-4 mr-2" />
                Item List
              </TabsTrigger>
              <TabsTrigger value="scan">
                <ScanLine className="h-4 w-4 mr-2" />
                Barcode Scan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="count" className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={countSearchTerm}
                    onChange={(e) => setCountSearchTerm(e.target.value)}
                    placeholder="Search or enter item code to add..."
                    className="pl-9"
                  />
                </div>
                <Badge variant="outline">
                  {countItems.filter((i) => i.counted).length}/{countItems.length} Counted
                </Badge>
              </div>

              {/* Show matching inventory items to add */}
              {matchingInventoryItems.length > 0 && (
                <Card className="mb-4 border-primary/50 bg-primary/5">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add items from inventory:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {matchingInventoryItems.slice(0, 5).map((inv) => (
                        <Button
                          key={inv.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddItemToCount(inv)}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {inv.item_code} - {inv.item_name}
                        </Button>
                      ))}
                      {matchingInventoryItems.length > 5 && (
                        <span className="text-xs text-muted-foreground self-center">
                          +{matchingInventoryItems.length - 5} more
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Show message when no items match */}
              {countSearchTerm.trim() && filteredCountItems.length === 0 && matchingInventoryItems.length === 0 && (
                <Card className="mb-4 border-amber-500/50 bg-amber-500/5">
                  <CardContent className="p-3">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 inline mr-2" />
                      No items found matching "{countSearchTerm}"
                    </p>
                  </CardContent>
                </Card>
              )}

              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Item Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">System Qty</TableHead>
                      <TableHead className="text-right">Counted Qty</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCountItems.length === 0 && !countSearchTerm.trim() && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No items in stocktake. Use the search field to add items.
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredCountItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className={
                          item.counted
                            ? item.variance !== 0
                              ? "bg-amber-50 dark:bg-amber-950/20"
                              : "bg-green-50 dark:bg-green-950/20"
                            : ""
                        }
                      >
                        <TableCell className="font-mono">{item.itemCode}</TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell className="text-right">{item.systemQty}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={item.countedQty ?? ""}
                            onChange={(e) =>
                              handleCountQtyChange(
                                item.id,
                                e.target.value === "" ? null : parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24 text-right"
                            placeholder="--"
                          />
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            item.variance < 0
                              ? "text-destructive"
                              : item.variance > 0
                              ? "text-green-600"
                              : ""
                          }`}
                        >
                          {item.counted ? (item.variance > 0 ? "+" : "") + item.variance : "--"}
                        </TableCell>
                        <TableCell
                          className={`text-right ${item.varianceValue < 0 ? "text-destructive" : ""}`}
                        >
                          {item.counted ? "$" + item.varianceValue.toFixed(2) : "--"}
                        </TableCell>
                        <TableCell>
                          {item.counted ? (
                            item.variance === 0 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            )
                          ) : (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="scan" className="flex-1 flex flex-col min-h-0 mt-4">
              <Card className="mb-4">
                <CardContent className="p-4">
                  <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-sm text-muted-foreground mb-1 block">
                        Scan barcode or enter item code
                      </Label>
                      <Input
                        ref={barcodeInputRef}
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan barcode..."
                        className="text-lg"
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="self-end">
                      <ScanLine className="h-4 w-4 mr-2" />
                      Add Count
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="flex-1">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Recently Scanned</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {countItems
                          .filter((i) => i.counted)
                          .map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono">{item.itemCode}</TableCell>
                              <TableCell>{item.itemName}</TableCell>
                              <TableCell className="text-right font-bold">{item.countedQty}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <div className="text-sm text-muted-foreground">
              Total Variance:{" "}
              <span className={countItems.reduce((sum, i) => sum + i.varianceValue, 0) < 0 ? "text-destructive" : "text-green-600"}>
                ${countItems.reduce((sum, i) => sum + i.varianceValue, 0).toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsCountDialogOpen(false)}>
                Close
              </Button>
              <Button variant="secondary" onClick={handleSaveCount}>
                <FileText className="h-4 w-4 mr-2" />
                Save Progress
              </Button>
              <Button onClick={handleCompleteStocktake}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete & Post Adjustments
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedStocktake?.stocktakeNo} - {selectedStocktake?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedStocktake?.status === "Completed"
                ? `Completed on ${selectedStocktake?.completedAt ? format(new Date(selectedStocktake.completedAt), "MMM dd, yyyy HH:mm") : "N/A"}`
                : `Status: ${selectedStocktake?.status}`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">System Qty</TableHead>
                  <TableHead className="text-right">Counted Qty</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Variance Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedStocktake?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.itemCode}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell className="text-right">{item.systemQty}</TableCell>
                    <TableCell className="text-right">{item.countedQty ?? "--"}</TableCell>
                    <TableCell
                      className={`text-right ${
                        item.variance < 0 ? "text-destructive" : item.variance > 0 ? "text-green-600" : ""
                      }`}
                    >
                      {item.counted ? (item.variance > 0 ? "+" : "") + item.variance : "--"}
                    </TableCell>
                    <TableCell className={`text-right ${item.varianceValue < 0 ? "text-destructive" : ""}`}>
                      {item.counted ? "$" + item.varianceValue.toFixed(2) : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StocktakesTab;
