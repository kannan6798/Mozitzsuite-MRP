import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Check, X, Plus, Trash2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface JobCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingOrders: any[];
  orders: any[];
  onCreateJob: (jobData: any, operations: any[], bomItems: any[], jobSplits: any[]) => void;
  generateJobNumber: () => string;
  calculateInProgressJobQty: (orderId: string) => number;
  calculatePendingJobQty: (order: any) => number;
}

export const JobCardDialog = ({
  open,
  onOpenChange,
  pendingOrders,
  orders,
  onCreateJob,
  generateJobNumber,
  calculateInProgressJobQty,
  calculatePendingJobQty,
}: JobCardDialogProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("components");
  const [jobData, setJobData] = useState({
    orderId: "",
    jobNumber: "",
    salesOrderNum: "",
    productName: "",
    itemCode: "",
    itemDescription: "",
    uom: "EA",
    quantity: "",
    dueDate: "",
    priority: "Medium",
    notes: "",
    routingAvailable: false,
    jobType: "Standard",
    jobClass: "STANDARD",
    status: "Released",
    firm: false,
    startDate: new Date().toISOString().slice(0, 16),
    completionDate: "",
    mrpNet: "0",
    lotNum: "",
  });
  
  const [operations, setOperations] = useState<any[]>([]);
  const [bomItems, setBomItems] = useState<any[]>([]);
  
  const [moveQuantities, setMoveQuantities] = useState<{
    [seq: number]: {
      inQueue: number;
      running: number;
      toMove: number;
      rejected: number;
      scrapped: number;
      completed: number;
    };
  }>({});
  
  useEffect(() => {
    const qty = parseInt(jobData.quantity) || 0;
    const sequences = operations.length > 0 
      ? operations.map((op, idx) => op.sequence || (idx + 1) * 10)
      : [10, 20, 30];
    
    const initialQuantities: typeof moveQuantities = {};
    sequences.forEach((seq, idx) => {
      initialQuantities[seq] = {
        inQueue: idx === 0 ? qty : 0,
        running: 0,
        toMove: 0,
        rejected: 0,
        scrapped: 0,
        completed: 0,
      };
    });
    setMoveQuantities(initialQuantities);
  }, [jobData.quantity, operations]);

  const handleMoveTransaction = () => {
    const sequences = Object.keys(moveQuantities).map(Number).sort((a, b) => a - b);
    let hasChanges = false;
    
    const newQuantities = { ...moveQuantities };
    
    sequences.forEach((seq, idx) => {
      const current = newQuantities[seq];
      
      if (current.toMove > 0) {
        hasChanges = true;
        if (idx < sequences.length - 1) {
          const nextSeq = sequences[idx + 1];
          newQuantities[nextSeq] = {
            ...newQuantities[nextSeq],
            inQueue: (newQuantities[nextSeq]?.inQueue || 0) + current.toMove,
          };
        } else {
          newQuantities[seq] = {
            ...current,
            completed: (current.completed || 0) + current.toMove,
            toMove: 0,
          };
          return;
        }
        newQuantities[seq] = { ...current, toMove: 0 };
      }
    });
    
    if (hasChanges) {
      setMoveQuantities(newQuantities);
      
      if (jobData.status === "Released") {
        setJobData(prev => ({ ...prev, status: "In Progress" }));
      }
      
      toast({
        title: "Move Transaction Completed",
        description: "Quantities moved successfully.",
      });
    } else {
      toast({
        title: "No Quantities to Move",
        description: "Enter quantities in 'To Move' column first.",
        variant: "destructive",
      });
    }
  };

  const updateMoveQuantity = (seq: number, field: keyof typeof moveQuantities[number], value: number) => {
    setMoveQuantities(prev => ({
      ...prev,
      [seq]: {
        ...prev[seq],
        [field]: value,
      },
    }));
  };

  const [bomQuantities, setBomQuantities] = useState<any[]>([]);
  const [jobSplits, setJobSplits] = useState<any[]>([]);

  // Auto-recalculate Required Quantities when Job Quantity changes
  useEffect(() => {
    if (bomQuantities.length > 0) {
      const jobQty = parseFloat(jobData.quantity) || 0;
      const updatedQuantities = bomQuantities.map((item) => {
        const required = item.perAssembly * jobQty;
        const open = required - item.issued;
        return {
          ...item,
          required: required,
          open: open,
        };
      });
      setBomQuantities(updatedQuantities);
    }
  }, [jobData.quantity]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  
  const [itemCodeOpen, setItemCodeOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState<Array<{
    item_code: string;
    item_name: string;
    description: string | null;
  }>>([]);
  const [isSearchingItems, setIsSearchingItems] = useState(false);

  useEffect(() => {
    if (open) {
      const newJobNumber = generateJobNumber();
      setJobData({
        orderId: "",
        jobNumber: newJobNumber,
        salesOrderNum: "",
        productName: "",
        itemCode: "",
        itemDescription: "",
        uom: "EA",
        quantity: "",
        dueDate: "",
        priority: "Medium",
        notes: "",
        routingAvailable: false,
        jobType: "Standard",
        jobClass: "STANDARD",
        status: "Released",
        firm: false,
        startDate: new Date().toISOString().slice(0, 16),
        completionDate: "",
        mrpNet: "0",
        lotNum: "",
      });
      setOperations([]);
      setBomItems([]);
      setBomQuantities([]);
      setJobSplits([]);
      setFilteredOrders([]);
      setActiveTab("components");
    }
  }, [open, generateJobNumber]);

  useEffect(() => {
    const searchItems = async () => {
      if (itemSearchQuery.length < 2) {
        setItemSuggestions([]);
        return;
      }
      
      setIsSearchingItems(true);
      try {
        const { data: bomItems } = await (supabase as any)
          .from("bom_headers")
          .select("item_code, item_name")
          .or(`item_code.ilike.%${itemSearchQuery}%,item_name.ilike.%${itemSearchQuery}%`)
          .eq("status", "Active")
          .limit(10);

        const { data: inventoryItems } = await (supabase as any)
          .from("inventory_stock")
          .select("item_code, item_name, description")
          .or(`item_code.ilike.%${itemSearchQuery}%,item_name.ilike.%${itemSearchQuery}%`)
          .limit(10);

        const combined: Array<{ item_code: string; item_name: string; description: string | null }> = [];
        const seenCodes = new Set<string>();

        if (bomItems) {
          bomItems.forEach((item: any) => {
            if (!seenCodes.has(item.item_code)) {
              seenCodes.add(item.item_code);
              combined.push({ 
                item_code: item.item_code, 
                item_name: item.item_name,
                description: null 
              });
            }
          });
        }

        if (inventoryItems) {
          inventoryItems.forEach((item: any) => {
            if (!seenCodes.has(item.item_code)) {
              seenCodes.add(item.item_code);
              combined.push({
                item_code: item.item_code,
                item_name: item.item_name,
                description: item.description
              });
            }
          });
        }

        setItemSuggestions(combined);
      } catch (error) {
        console.error("Error searching items:", error);
      } finally {
        setIsSearchingItems(false);
      }
    };

    const debounceTimer = setTimeout(searchItems, 300);
    return () => clearTimeout(debounceTimer);
  }, [itemSearchQuery]);

  const loadItemData = async (itemCode: string, quantity: number) => {
    try {
      const openOrders = orders.filter((order: any) => {
        if (!order.items || !Array.isArray(order.items)) return false;
        const hasMatchingItem = order.items.some((item: any) => 
          item.itemCode === itemCode && item.itemType === "Product"
        );
        return hasMatchingItem;
      });
      setFilteredOrders(openOrders);

      const { data: bomHeaders } = await (supabase as any)
        .from("bom_headers")
        .select("*")
        .eq("item_code", itemCode)
        .eq("status", "Active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (bomHeaders && bomHeaders.length > 0) {
        const bomHeader = bomHeaders[0];
        setJobData(prev => ({
          ...prev,
          productName: bomHeader.item_name,
          itemDescription: `${bomHeader.item_name} ${bomHeader.item_code}`,
          uom: bomHeader.uom || "EA",
          routingAvailable: true,
        }));

        const { data: components } = await (supabase as any)
          .from("bom_components")
          .select("*")
          .eq("bom_id", bomHeader.id);

        if (components) {
          const mappedComponents = components.map((comp: any, index: number) => ({
            id: comp.id,
            itemSeq: comp.item_seq || index + 1,
            operationSeq: comp.operation_seq || 10,
            component: comp.component,
            description: comp.description,
            quantity: (comp.quantity || 1) * quantity,
            uom: comp.uom || "EA",
            status: "Available",
          }));
          setBomItems(mappedComponents);

          const componentCodes = components.map((c: any) => c.component);
          const { data: inventoryData } = await (supabase as any)
            .from("inventory_stock")
            .select("item_code, quantity_on_hand")
            .in("item_code", componentCodes);

          const quantitiesData = components.map((comp: any) => {
            const inventory = inventoryData?.find((inv: any) => inv.item_code === comp.component);
            const perAssembly = comp.quantity || 1;
            const required = perAssembly * quantity;
            const issued = 0;
            const open = required - issued;
            
            return {
              component: comp.component,
              uom: comp.uom || "EA",
              basisType: comp.basis || "Item",
              perAssembly: perAssembly,
              inverseUsage: perAssembly > 0 ? (1 / perAssembly).toFixed(4) : "0",
              yield: comp.yield || 100,
              required: required,
              issued: issued,
              open: open,
              onHand: inventory?.quantity_on_hand || 0,
            };
          });
          setBomQuantities(quantitiesData);
        }

        const { data: ops } = await (supabase as any)
          .from("bom_operations")
          .select("*")
          .eq("bom_id", bomHeader.id);

        if (ops) {
          const mappedOps = ops.map((op: any) => ({
            id: op.id,
            sequence: op.operation_seq,
            operationCode: op.operation_code,
            name: op.description,
            description: op.description,
            duration: op.run_time || 0,
            runTime: op.run_time,
            workCenter: op.work_center,
            department: op.department,
            status: "Pending",
          }));
          setOperations(mappedOps);
        }
      }
    } catch (error) {
      console.error("Error loading item data:", error);
    }
  };

  const handleSelectOrder = (order: any) => {
    const productItems = Array.isArray(order.items) 
      ? order.items.filter((item: any) => item.itemType === "Product")
      : [];
    
    if (productItems.length > 0) {
      const firstProduct = productItems[0];
      setJobData(prev => ({
        ...prev,
        itemCode: firstProduct.itemCode || "",
        productName: firstProduct.itemName || firstProduct.productName || "",
        quantity: firstProduct.quantityOrdered || "",
        dueDate: order.deliveryDate || "",
        completionDate: order.deliveryDate || "",
      }));
      
      if (firstProduct.itemCode) {
        loadItemData(firstProduct.itemCode, parseFloat(firstProduct.quantityOrdered) || 1);
      }
    }
  };

  const handleCreateJob = () => {
    onCreateJob(jobData, operations, bomItems, jobSplits);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-background rounded-lg shadow-xl border">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-primary text-primary-foreground">
          <DialogTitle className="text-lg font-semibold">Create Discrete Job</DialogTitle>
        </DialogHeader>

        {/* Main Form Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Job Details Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 items-center gap-3">
                <Label className="text-sm font-medium text-right">Job Number</Label>
                <Input 
                  value={jobData.jobNumber}
                  onChange={(e) => setJobData({ ...jobData, jobNumber: e.target.value })}
                  className="col-span-2"
                />
              </div>
              
              <div className="grid grid-cols-3 items-center gap-3">
                <Label className="text-sm font-medium text-right">Assembly</Label>
                <div className="col-span-2 flex gap-2">
                  {jobData.jobType === "Non-standard" ? (
                    <>
                      <Input 
                        value={jobData.itemCode}
                        onChange={(e) => setJobData({ ...jobData, itemCode: e.target.value })}
                        placeholder="Item Code"
                        className="flex-1"
                      />
                      <Input 
                        value={jobData.itemDescription}
                        onChange={(e) => setJobData({ ...jobData, itemDescription: e.target.value })}
                        placeholder="Description"
                        className="flex-1"
                      />
                    </>
                  ) : (
                    <>
                      <Popover open={itemCodeOpen} onOpenChange={setItemCodeOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="flex-1 justify-between font-normal"
                          >
                            <span className="truncate">{jobData.itemCode || "Search items..."}</span>
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput 
                              placeholder="Type 2+ characters..."
                              value={itemSearchQuery}
                              onValueChange={setItemSearchQuery}
                            />
                            <CommandList>
                              {isSearchingItems && (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                  Searching...
                                </div>
                              )}
                              {!isSearchingItems && itemSearchQuery.length < 2 && (
                                <CommandEmpty>Type at least 2 characters</CommandEmpty>
                              )}
                              {!isSearchingItems && itemSearchQuery.length >= 2 && itemSuggestions.length === 0 && (
                                <CommandEmpty>No items found</CommandEmpty>
                              )}
                              {itemSuggestions.length > 0 && (
                                <CommandGroup heading="Items">
                                  {itemSuggestions.map((item) => (
                                    <CommandItem
                                      key={item.item_code}
                                      value={item.item_code}
                                      onSelect={() => {
                                        setJobData({ ...jobData, itemCode: item.item_code, productName: item.item_name });
                                        setItemCodeOpen(false);
                                        setItemSearchQuery("");
                                        loadItemData(item.item_code, parseFloat(jobData.quantity) || 1);
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          jobData.itemCode === item.item_code ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{item.item_code}</span>
                                        <span className="text-xs text-muted-foreground">{item.item_name}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Input 
                        value={jobData.itemDescription}
                        readOnly
                        placeholder="Description"
                        className="flex-1 bg-muted"
                      />
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-3">
                <Label className="text-sm font-medium text-right">Sales Order</Label>
                <Input 
                  value={jobData.salesOrderNum}
                  onChange={(e) => setJobData({ ...jobData, salesOrderNum: e.target.value })}
                  placeholder="Sales Order Number"
                  className="col-span-2"
                />
              </div>
              
              <div className="grid grid-cols-3 items-center gap-3">
                <Label className="text-sm font-medium text-right">Class</Label>
                <Select value={jobData.jobClass} onValueChange={(v) => setJobData({ ...jobData, jobClass: v })}>
                  <SelectTrigger className="col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="REWORK">Rework</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-3">
                <Label className="text-sm font-medium text-right">Status</Label>
                <Select value={jobData.status} onValueChange={(v) => setJobData({ ...jobData, status: v })}>
                  <SelectTrigger className="col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Released">Released</SelectItem>
                    <SelectItem value="Unreleased">Unreleased</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 items-center gap-3">
                <Label className="text-sm font-medium text-right">Type</Label>
                <Select value={jobData.jobType} onValueChange={(v) => setJobData({ ...jobData, jobType: v })}>
                  <SelectTrigger className="col-span-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Non-standard">Non-standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-3 items-center gap-3">
                <Label className="text-sm font-medium text-right">UOM</Label>
                <Input 
                  value={jobData.uom}
                  onChange={(e) => setJobData({ ...jobData, uom: e.target.value })}
                  className="col-span-2"
                />
              </div>
              
              <div className="grid grid-cols-3 items-center gap-3">
                <div></div>
                <div className="col-span-2 flex items-center gap-2">
                  <Checkbox 
                    id="firm" 
                    checked={jobData.firm}
                    onCheckedChange={(checked) => setJobData({ ...jobData, firm: !!checked })}
                  />
                  <label htmlFor="firm" className="text-sm cursor-pointer">Mark as Firm</label>
                </div>
              </div>
            </div>
          </div>

          {/* Quantities and Dates */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Quantities</h4>
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label className="text-sm text-right">Start</Label>
                  <Input 
                    type="number"
                    value={jobData.quantity}
                    onChange={(e) => setJobData({ ...jobData, quantity: e.target.value })}
                    className="col-span-2"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label className="text-sm text-right">MRP Net</Label>
                  <Input 
                    type="number"
                    value={jobData.mrpNet}
                    onChange={(e) => setJobData({ ...jobData, mrpNet: e.target.value })}
                    className="col-span-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Dates</h4>
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label className="text-sm text-right">Start</Label>
                  <Input 
                    type="datetime-local"
                    value={jobData.startDate}
                    onChange={(e) => setJobData({ ...jobData, startDate: e.target.value })}
                    className="col-span-2"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-3">
                  <Label className="text-sm text-right">Completion</Label>
                  <Input 
                    type="datetime-local"
                    value={jobData.completionDate}
                    onChange={(e) => setJobData({ ...jobData, completionDate: e.target.value })}
                    className="col-span-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs Section */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-muted rounded-lg p-1">
              {["Components", "Quantities", "Routing", "Job Move", "LOT", "Scheduling", "More"].map((tab) => (
                <TabsTrigger 
                  key={tab}
                  value={tab.toLowerCase().replace(" ", "-")}
                  className="px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-4 min-h-[200px]">
              <TabsContent value="components" className="m-0">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Label className="text-sm w-24">Alternate</Label>
                        <Input className="flex-1" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-sm w-24">Revision</Label>
                        <Input className="flex-1" />
                      </div>
                    </div>
                    
                    {jobData.jobType === "Non-standard" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newSeq = bomItems.length > 0 ? Math.max(...bomItems.map((b: any) => b.itemSeq || 0)) + 10 : 10;
                          setBomItems([...bomItems, {
                            id: Date.now(),
                            itemSeq: newSeq,
                            operationSeq: 10,
                            component: "",
                            description: "",
                            quantity: 1,
                            uom: "EA",
                            status: "Available"
                          }]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Component
                      </Button>
                    )}
                    
                    {(bomItems.length > 0 || jobData.jobType === "Non-standard") && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted">
                              <TableHead className="text-xs">Seq</TableHead>
                              <TableHead className="text-xs">Component</TableHead>
                              <TableHead className="text-xs">Description</TableHead>
                              <TableHead className="text-xs">Qty</TableHead>
                              <TableHead className="text-xs">UOM</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              {jobData.jobType === "Non-standard" && (
                                <TableHead className="text-xs w-10"></TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bomItems.length === 0 && jobData.jobType === "Non-standard" ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                  Click "Add Component" to add components manually.
                                </TableCell>
                              </TableRow>
                            ) : (
                              bomItems.map((item: any, index: number) => (
                                <TableRow key={item.id}>
                                  {jobData.jobType === "Non-standard" ? (
                                    <>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          value={item.itemSeq}
                                          onChange={(e) => {
                                            const updated = [...bomItems];
                                            updated[index] = { ...updated[index], itemSeq: parseInt(e.target.value) || 0 };
                                            setBomItems(updated);
                                          }}
                                          className="w-16 h-8"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={item.component}
                                          onChange={(e) => {
                                            const updated = [...bomItems];
                                            updated[index] = { ...updated[index], component: e.target.value };
                                            setBomItems(updated);
                                          }}
                                          className="h-8"
                                          placeholder="Component Code"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={item.description}
                                          onChange={(e) => {
                                            const updated = [...bomItems];
                                            updated[index] = { ...updated[index], description: e.target.value };
                                            setBomItems(updated);
                                          }}
                                          className="h-8"
                                          placeholder="Description"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) => {
                                            const updated = [...bomItems];
                                            updated[index] = { ...updated[index], quantity: parseFloat(e.target.value) || 0 };
                                            setBomItems(updated);
                                          }}
                                          className="w-20 h-8"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={item.uom}
                                          onChange={(e) => {
                                            const updated = [...bomItems];
                                            updated[index] = { ...updated[index], uom: e.target.value };
                                            setBomItems(updated);
                                          }}
                                          className="w-16 h-8"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:text-destructive"
                                          onClick={() => setBomItems(bomItems.filter((_: any, i: number) => i !== index))}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </>
                                  ) : (
                                    <>
                                      <TableCell className="text-sm">{item.itemSeq}</TableCell>
                                      <TableCell className="text-sm font-medium">{item.component}</TableCell>
                                      <TableCell className="text-sm">{item.description}</TableCell>
                                      <TableCell className="text-sm">{item.quantity}</TableCell>
                                      <TableCell className="text-sm">{item.uom}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">{item.status}</Badge>
                                      </TableCell>
                                    </>
                                  )}
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="quantities" className="m-0">
                <Card>
                  <CardContent className="p-4">
                    <div className="border rounded-lg overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="text-xs">Component</TableHead>
                            <TableHead className="text-xs">UOM</TableHead>
                            <TableHead className="text-xs">Basis</TableHead>
                            <TableHead className="text-xs text-right">Per Assembly</TableHead>
                            <TableHead className="text-xs text-right">Inverse</TableHead>
                            <TableHead className="text-xs text-right">Yield</TableHead>
                            <TableHead className="text-xs text-right bg-warning/10">Required</TableHead>
                            <TableHead className="text-xs text-right">Issued</TableHead>
                            <TableHead className="text-xs text-right">Open</TableHead>
                            <TableHead className="text-xs text-right">On Hand</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bomQuantities.length > 0 ? (
                            bomQuantities.map((item: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell className="text-sm font-medium">{item.component}</TableCell>
                                <TableCell className="text-sm">{item.uom}</TableCell>
                                <TableCell className="text-sm">{item.basisType}</TableCell>
                                <TableCell className="text-sm text-right">{item.perAssembly}</TableCell>
                                <TableCell className="text-sm text-right">{item.inverseUsage}</TableCell>
                                <TableCell className="text-sm text-right">{item.yield}</TableCell>
                                <TableCell className="text-sm text-right font-medium bg-warning/10">{item.required}</TableCell>
                                <TableCell className="text-sm text-right">{item.issued}</TableCell>
                                <TableCell className="text-sm text-right">{item.open}</TableCell>
                                <TableCell className={`text-sm text-right font-medium ${item.onHand < item.required ? 'text-destructive' : ''}`}>
                                  {item.onHand}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                                Select an item to view component quantities.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="routing" className="m-0">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {jobData.jobType === "Non-standard" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newSeq = operations.length > 0 ? Math.max(...operations.map((o: any) => o.sequence || 0)) + 10 : 10;
                          setOperations([...operations, {
                            id: Date.now(),
                            sequence: newSeq,
                            operationCode: "",
                            name: "",
                            description: "",
                            duration: 0,
                            runTime: 0,
                            workCenter: "",
                            department: "",
                            status: "Pending"
                          }]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Operation
                      </Button>
                    )}
                    
                    {(operations.length > 0 || jobData.jobType === "Non-standard") && (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted">
                              <TableHead className="text-xs">Seq</TableHead>
                              <TableHead className="text-xs">Operation</TableHead>
                              <TableHead className="text-xs">Description</TableHead>
                              <TableHead className="text-xs">Duration</TableHead>
                              <TableHead className="text-xs">Work Center</TableHead>
                              <TableHead className="text-xs">Department</TableHead>
                              {jobData.jobType === "Non-standard" && (
                                <TableHead className="text-xs w-10"></TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {operations.length === 0 && jobData.jobType === "Non-standard" ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                  Click "Add Operation" to add routing operations.
                                </TableCell>
                              </TableRow>
                            ) : (
                              operations.map((op: any, index: number) => (
                                <TableRow key={op.id}>
                                  {jobData.jobType === "Non-standard" ? (
                                    <>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          value={op.sequence}
                                          onChange={(e) => {
                                            const updated = [...operations];
                                            updated[index] = { ...updated[index], sequence: parseInt(e.target.value) || 0 };
                                            setOperations(updated);
                                          }}
                                          className="w-16 h-8"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={op.operationCode || op.name}
                                          onChange={(e) => {
                                            const updated = [...operations];
                                            updated[index] = { ...updated[index], operationCode: e.target.value, name: e.target.value };
                                            setOperations(updated);
                                          }}
                                          className="h-8"
                                          placeholder="Operation Code"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={op.description}
                                          onChange={(e) => {
                                            const updated = [...operations];
                                            updated[index] = { ...updated[index], description: e.target.value };
                                            setOperations(updated);
                                          }}
                                          className="h-8"
                                          placeholder="Description"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          value={op.duration || op.runTime || 0}
                                          onChange={(e) => {
                                            const updated = [...operations];
                                            updated[index] = { ...updated[index], duration: parseFloat(e.target.value) || 0, runTime: parseFloat(e.target.value) || 0 };
                                            setOperations(updated);
                                          }}
                                          className="w-20 h-8"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={op.workCenter || ""}
                                          onChange={(e) => {
                                            const updated = [...operations];
                                            updated[index] = { ...updated[index], workCenter: e.target.value };
                                            setOperations(updated);
                                          }}
                                          className="h-8"
                                          placeholder="Work Center"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={op.department || ""}
                                          onChange={(e) => {
                                            const updated = [...operations];
                                            updated[index] = { ...updated[index], department: e.target.value };
                                            setOperations(updated);
                                          }}
                                          className="h-8"
                                          placeholder="Department"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:text-destructive"
                                          onClick={() => setOperations(operations.filter((_: any, i: number) => i !== index))}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </>
                                  ) : (
                                    <>
                                      <TableCell className="text-sm">{op.sequence}</TableCell>
                                      <TableCell className="text-sm font-medium">{op.operationCode || op.name}</TableCell>
                                      <TableCell className="text-sm">{op.description}</TableCell>
                                      <TableCell className="text-sm">{op.duration || op.runTime || "-"}</TableCell>
                                      <TableCell className="text-sm">{op.workCenter || "-"}</TableCell>
                                      <TableCell className="text-sm">{op.department || "-"}</TableCell>
                                    </>
                                  )}
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    {operations.length === 0 && jobData.jobType !== "Non-standard" && (
                      <p className="text-sm text-muted-foreground">Select an item to load routing operations.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="job-move" className="m-0">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={handleMoveTransaction}
                        >
                          Move Transaction
                        </Button>
                        <Button variant="outline" size="sm">
                          View History
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge 
                          variant={jobData.status === "In Progress" ? "default" : "secondary"}
                        >
                          {jobData.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted">
                            <TableHead className="text-xs w-16">Seq</TableHead>
                            <TableHead className="text-xs">In Queue</TableHead>
                            <TableHead className="text-xs">Running</TableHead>
                            <TableHead className="text-xs bg-accent/10">To Move</TableHead>
                            <TableHead className="text-xs">Rejected</TableHead>
                            <TableHead className="text-xs">Scrapped</TableHead>
                            <TableHead className="text-xs">Completed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const sequences = operations.length > 0 
                              ? operations.map((op, idx) => ({ seq: op.sequence || (idx + 1) * 10, op }))
                              : [10, 20, 30].map(seq => ({ seq, op: null }));
                            
                            return sequences.map(({ seq }) => (
                              <TableRow key={seq}>
                                <TableCell className="text-sm font-medium">{seq}</TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    value={moveQuantities[seq]?.inQueue || 0}
                                    onChange={(e) => updateMoveQuantity(seq, 'inQueue', parseInt(e.target.value) || 0)}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    value={moveQuantities[seq]?.running || 0}
                                    onChange={(e) => updateMoveQuantity(seq, 'running', parseInt(e.target.value) || 0)}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell className="bg-accent/5">
                                  <Input 
                                    type="number" 
                                    value={moveQuantities[seq]?.toMove || 0}
                                    onChange={(e) => updateMoveQuantity(seq, 'toMove', parseInt(e.target.value) || 0)}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    value={moveQuantities[seq]?.rejected || 0}
                                    onChange={(e) => updateMoveQuantity(seq, 'rejected', parseInt(e.target.value) || 0)}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    value={moveQuantities[seq]?.scrapped || 0}
                                    onChange={(e) => updateMoveQuantity(seq, 'scrapped', parseInt(e.target.value) || 0)}
                                    className="h-8"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="number" 
                                    value={moveQuantities[seq]?.completed || 0}
                                    readOnly
                                    className="h-8 bg-muted"
                                  />
                                </TableCell>
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="lot" className="m-0">
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Label className="text-sm w-24">LOT Number</Label>
                        <Input 
                          value={jobData.lotNum}
                          onChange={(e) => setJobData({ ...jobData, lotNum: e.target.value })}
                          className="flex-1" 
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-sm w-24">Build Seq</Label>
                        <Input className="flex-1" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Label className="text-sm w-24">Task</Label>
                        <Input className="flex-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scheduling" className="m-0">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Configure scheduling parameters.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="more" className="m-0">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <Label className="text-sm w-24">Priority</Label>
                      <Select value={jobData.priority} onValueChange={(v) => setJobData({ ...jobData, priority: v })}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-start gap-3">
                      <Label className="text-sm w-24 pt-2">Notes</Label>
                      <textarea
                        value={jobData.notes}
                        onChange={(e) => setJobData({ ...jobData, notes: e.target.value })}
                        className="flex-1 h-24 px-3 py-2 text-sm border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Enter additional notes..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateJob}>
            Create Job
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobCardDialog;
