import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, FileText, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
   import axios from "axios";

 interface Issue {
  id: string;
  issueNo: string;
  issueDate: string;
  issueType: "job" | "order";
  referenceNo: string;
  referenceName: string;
  warehouse: string;
  issuedBy: string;
  remarks: string;
  status: string;
  items: IssueItem[];
  createdAt: string;
}

interface IssueItem {
  id: string;
  itemCode: string;
  itemName: string;
  requiredQty: number;
  issuedQty: number;
  uom: string;
  availableStock?: number;
  balanceQty?: number;
  error?: string;
}

interface Job {
  id: string;
  jobNumber: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  status: string;
  bomComponents?: any[];
}

interface Order {
  id: string;
  // Support both legacy shape (orderNumber/customerName) and Orders page shape (id/customer)
  orderNumber?: string;
  orderNo?: string;
  customerName?: string;
  customer?: string;
  items: any[];
}

const getJobNumber = (job: any): string =>
  (job?.jobNumber || job?.job_no || job?.job_number || job?.id || "").toString();

const getJobItemCode = (job: any): string =>
  (job?.itemCode || job?.item_code || "").toString();

const getJobItemName = (job: any): string =>
  (job?.itemName || job?.productName || job?.item_name || job?.product_name || "").toString();

const getJobQty = (job: any): number => {
  const raw = job?.quantity ?? job?.qty ?? job?.jobQty ?? 0;
  const n = typeof raw === "number" ? raw : parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

const getJobStatus = (job: any): string => (job?.status || "").toString();

const normalizeJob = (job: any): Job => {
  const jobNumber = getJobNumber(job);
  return {
    id: jobNumber || job?.id || crypto.randomUUID(),
    jobNumber,
    itemCode: getJobItemCode(job),
    itemName: getJobItemName(job),
    quantity: getJobQty(job),
    status: getJobStatus(job),
    bomComponents: job?.bomComponents || job?.bomItems || job?.bom_components || [],
  };
};

const getOrderNumber = (order: any): string =>
  (order?.orderNumber || order?.orderNo || order?.id || "").toString();

const getOrderCustomerName = (order: any): string =>
  (order?.customerName || order?.customer || order?.customer_name || "").toString();

const IssuesTab = () => {
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>(() => {
    const saved = localStorage.getItem("material_issues");
    return saved ? JSON.parse(saved) : [];
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchType, setSearchType] = useState<"job" | "order">("job");
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [issueType, setIssueType] = useState<"job" | "order">("job");
  const [selectedReference, setSelectedReference] = useState<Job | Order | null>(null);
  const [warehouse, setWarehouse] = useState("Main Warehouse");
  const [remarks, setRemarks] = useState("");
  const [issueItems, setIssueItems] = useState<IssueItem[]>([]);
  const [jobNoInput, setJobNoInput] = useState("");
  const [orderNoInput, setOrderNoInput] = useState("");
  const [referenceError, setReferenceError] = useState("");

  // Search results
  const [jobs, setJobs] = useState<Job[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchResults, setSearchResults] = useState<(Job | Order)[]>([]);
  const [locations, setLocations] = useState<{ id: string; location_name: string }[]>([]);

  // Load jobs and orders
 useEffect(() => {
  const savedJobs = localStorage.getItem("jobs");

  if (savedJobs) {
    try {
      const parsed = JSON.parse(savedJobs);
      if (Array.isArray(parsed)) {
        setJobs(parsed.map(normalizeJob));
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error("Failed to parse jobs from localStorage:", error);
      setJobs([]);
    }
  } else {
    setJobs([]);
  }
}, []);

    const savedOrders = localStorage.getItem("orders");
    if (savedOrders) {
      try {
        const parsed = JSON.parse(savedOrders);
        setOrders(Array.isArray(parsed) ? parsed : []);
      } catch {
        setOrders([]);
      }
    }

    // Load locations

useEffect(() => {
  const fetchLocations = async () => {
    try {
      const response = await axios.get("/api/locations"); // Replace with your API endpoint
      if (response.data) {
        setLocations(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load locations",
        variant: "destructive",
      });
    }
  };

  fetchLocations();
}, []);

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const savedJobs = localStorage.getItem("jobs");
      if (savedJobs) {
        try {
          const parsed = JSON.parse(savedJobs);
          setJobs(Array.isArray(parsed) ? parsed.map(normalizeJob) : []);
        } catch {
          setJobs([]);
        }
      }

      const savedOrders = localStorage.getItem("orders");
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          setOrders(Array.isArray(parsed) ? parsed : []);
        } catch {
          setOrders([]);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const generateIssueNo = () => {
    const prefix = "ISS";
    const existingNumbers = issues.map((i) => {
      const match = i.issueNo.match(/ISS-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    const nextNumber = Math.max(0, ...existingNumbers) + 1;
    return `${prefix}-${String(nextNumber).padStart(5, "0")}`;
  };

  const handleSearch = () => {
    const term = searchTerm.toLowerCase();

    if (searchType === "job") {
      const filtered = jobs.filter((job) =>
        getJobNumber(job).toLowerCase().includes(term) ||
        (job.itemCode || "").toLowerCase().includes(term) ||
        (job.itemName || "").toLowerCase().includes(term)
      );
      setSearchResults(filtered);
    } else {
      const filtered = orders.filter((order) => {
        const orderNo = getOrderNumber(order).toLowerCase();
        const customer = getOrderCustomerName(order).toLowerCase();
        return orderNo.includes(term) || customer.includes(term);
      });
      setSearchResults(filtered);
    }
  };

  // Fetch available stock for items

const fetchAvailableStock = async (items: IssueItem[]): Promise<IssueItem[]> => {
  try {
    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        // Call your backend API to get stock for this item
        const response = await axios.get(`/api/inventory_stock`, {
          params: { item_code: item.itemCode },
        });

        const stockItem = response.data; // Expected: { available_quantity, quantity_on_hand }

        return {
          ...item,
          availableStock: stockItem?.available_quantity ?? stockItem?.quantity_on_hand ?? 0,
          balanceQty: item.requiredQty,
        };
      })
    );

    return itemsWithStock;
  } catch (error) {
    console.error("Error fetching available stock:", error);
    // Return items with zero stock in case of error
    return items.map((item) => ({
      ...item,
      availableStock: 0,
      balanceQty: item.requiredQty,
    }));
  }
};

  // Lookup Job by Job No (text input)
  const handleLookupJob = async () => {
    if (!jobNoInput.trim()) {
      setReferenceError("Please enter a Job No");
      return;
    }
    setReferenceError("");

    const jobNumberInput = jobNoInput.trim();

    // Always read latest jobs from localStorage (state can be stale within the same tab)
    let latestJobs: Job[] = jobs;
    const savedJobs = localStorage.getItem("jobs");
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        latestJobs = Array.isArray(parsed) ? parsed.map(normalizeJob) : [];
        setJobs(latestJobs);
      } catch {
        // ignore parse errors; fall back to current state
      }
    }

    // First try to find in localStorage (supports both {jobNumber} and {id} shapes)
   const handleJobReference = async () => {
  // First, try to find job in latestJobs
  const job = latestJobs.find(
    (j) => getJobNumber(j).toLowerCase() === jobNumberInput.toLowerCase()
  );

  if (job) {
    const status = (job.status || "").toLowerCase();
    if (status === "completed" || status === "cancelled" || status === "canceled") {
      setReferenceError(`Cannot issue to ${job.status} job`);
      return;
    }

    setSelectedReference(job);
    await loadJobMaterials(job);
    return;
  }

  // Fallback: fetch job allocations from backend API
  try {
    const response = await axios.get("/api/job_allocations", {
      params: { job_number: jobNumberInput },
    });

    const allocations = response.data; // Expected: [{ status: "allocated" | "consumed" | ... }, ...]

    if (allocations && allocations.length > 0) {
      const allConsumed = allocations.every((a: any) => a.status === "consumed");
      if (allConsumed) {
        setReferenceError("Cannot issue to Completed job");
        return;
      }

      // Minimal job object for db-only jobs
      const dbJob: Job = {
        id: jobNumberInput,
        jobNumber: jobNumberInput,
        itemCode: "",
        itemName: "",
        quantity: 1,
        status: "Pending",
        bomComponents: [],
      };

      setSelectedReference(dbJob);
      await loadJobMaterials(dbJob);
      return;
    }

    setReferenceError("Job not found");
  } catch (error: any) {
    console.error("Error fetching job allocations:", error);
    setReferenceError("Failed to verify job allocations");
  }
};

  // Lookup Order by Order No (text input)
  const handleLookupOrder = async () => {
    if (!orderNoInput.trim()) {
      setReferenceError("Please enter an Order No");
      return;
    }
    setReferenceError("");

    const orderNumberInput = orderNoInput.trim();

    const order = orders.find(
      (o) => getOrderNumber(o).toLowerCase() === orderNumberInput.toLowerCase()
    );

    if (!order) {
      setReferenceError("Order not found");
      return;
    }

    setSelectedReference(order);
    await loadOrderItems(order);
  };

  // Load job materials from job_allocations table (primary source for job required quantities)
 const loadJobMaterials = async (job: Job) => {
  let items: IssueItem[] = [];
  const jobNumber = job.jobNumber || job.id;
  console.log("loadJobMaterials - jobNumber:", jobNumber, "job:", job);

  try {
    // 1️⃣ Fetch job allocations first
    const allocRes = await axios.get("/api/job_allocations", {
      params: { job_number: jobNumber, status: ["allocated", "released"] },
    });
    const jobAllocations = allocRes.data; // [{ item_code, allocated_quantity, status }, ...]

    console.log("loadJobMaterials - jobAllocations:", jobAllocations);

    if (jobAllocations && jobAllocations.length > 0) {
      // Aggregate allocations by item_code
      const aggregated: Record<string, number> = {};
      jobAllocations.forEach((alloc: any) => {
        aggregated[alloc.item_code] = (aggregated[alloc.item_code] || 0) + (alloc.allocated_quantity || 0);
      });

      const itemCodes = Object.keys(aggregated);

      // Fetch inventory item details
      const invRes = await axios.get("/api/inventory_items", {
        params: { item_codes: itemCodes },
      });
      const inventoryItems = invRes.data; // [{ item_code, item_name }, ...]

      const itemNameMap = new Map(inventoryItems.map((i: any) => [i.item_code, i.item_name]));

      items = itemCodes.map((itemCode, index) => ({
        id: `item-${index}`,
        itemCode,
        itemName: itemNameMap.get(itemCode) || itemCode,
        requiredQty: aggregated[itemCode],
        issuedQty: 0,
        uom: "EA",
      }));
    } else {
      // 2️⃣ Fallback to BOM components if no allocations
      const bomComponents = job.bomComponents || [];
      console.log("loadJobMaterials - fallback to bomComponents:", bomComponents);

      if (bomComponents.length > 0) {
        items = bomComponents.map((comp: any, index: number) => ({
          id: `item-${index}`,
          itemCode: comp.component || comp.itemCode || comp.item_code || "",
          itemName: comp.description || comp.itemName || comp.item_name || "",
          requiredQty: (parseFloat(comp.quantity) || 1) * (job.quantity || 1),
          issuedQty: 0,
          uom: comp.uom || "EA",
        }));
      } else if (job.itemCode) {
        // 3️⃣ Fetch BOM from database if BOM components are empty
        const bomHeaderRes = await axios.get("/api/bom_headers", {
          params: { item_code: job.itemCode, status: "Active", limit: 1, order: "desc" },
        });
        const bomData = bomHeaderRes.data;

        console.log("loadJobMaterials - bomData from DB:", bomData);

        if (bomData && bomData.length > 0) {
          const bomId = bomData[0].id;
          const compRes = await axios.get("/api/bom_components", { params: { bom_id: bomId } });
          const components = compRes.data;

          console.log("loadJobMaterials - components from DB:", components);

          if (components && components.length > 0) {
            items = components.map((comp: any, index: number) => ({
              id: `item-${index}`,
              itemCode: comp.component,
              itemName: comp.description,
              requiredQty: comp.quantity * (job.quantity || 1),
              issuedQty: 0,
              uom: comp.uom,
            }));
          }
        }
      }
    }

    // 4️⃣ Fetch available stock for all items
    const itemsWithStock = await fetchAvailableStock(items); // This should also be Axios-based
    console.log("loadJobMaterials - final items:", itemsWithStock);
    setIssueItems(itemsWithStock);
  } catch (error: any) {
    console.error("Error loading job materials:", error);
    setReferenceError("Failed to load job materials");
    setIssueItems([]);
  }
};

  const loadOrderItems = async (order: Order) => {
    let items: IssueItem[] = [];
    
    const orderItems = Array.isArray((order as any).items) ? (order as any).items : [];

    if (orderItems.length > 0) {
      items = orderItems.map((item: any, index: number) => {
        const qtyRaw = item.quantityOrdered ?? item.quantity ?? item.qty ?? 0;
        const requiredQty = typeof qtyRaw === "number" ? qtyRaw : parseFloat(qtyRaw) || 0;

        return {
          id: `item-${index}`,
          itemCode: item.itemCode || item.item_code || item.code || "",
          itemName: item.itemName || item.item_name || item.name || "",
          requiredQty,
          issuedQty: 0,
          uom: item.uom || item.unit || "EA",
        };
      });
    }

    // Fetch available stock for all items
    const itemsWithStock = await fetchAvailableStock(items);
    setIssueItems(itemsWithStock);
  };

  const handleSelectReference = async (ref: Job | Order) => {
    setIsSearchDialogOpen(false);
    setReferenceError("");

    if (issueType === "job") {
      const job = normalizeJob(ref);

      const status = (job.status || "").toLowerCase();
      if (status === "completed" || status === "cancelled" || status === "canceled") {
        setReferenceError(`Cannot issue to ${job.status} job`);
        setSelectedReference(null);
        return;
      }

      setSelectedReference(job);
      setJobNoInput(job.jobNumber);
      await loadJobMaterials(job);
    } else {
      const order = ref as Order;
      setSelectedReference(order);
      setOrderNoInput(getOrderNumber(order));
      await loadOrderItems(order);
    }
  };

  const handleIssueQtyChange = (itemId: string, qty: number) => {
    setIssueItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        
        const availableStock = item.availableStock ?? 0;
        const balanceQty = item.balanceQty ?? item.requiredQty;
        let error = "";
        
        // Validation: Issue Qty cannot exceed available stock
        if (qty > availableStock) {
          error = `Exceeds available stock (${availableStock})`;
        }
        // Validation: Issue Qty cannot exceed balance/required qty
        else if (qty > balanceQty) {
          error = `Exceeds balance qty (${balanceQty})`;
        }
        // Validation: Cannot result in negative stock
        else if (availableStock - qty < 0) {
          error = "Would result in negative stock";
        }
        
        return { 
          ...item, 
          issuedQty: qty,
          error 
        };
      })
    );
  };

  const handleCreateIssue = async () => {
    if (!selectedReference) {
      const hasRefInput = issueType === "job" ? jobNoInput.trim() : orderNoInput.trim();
      toast({
        title: "Error",
        description: hasRefInput
          ? `Please click the search icon to load the ${issueType === "job" ? "Job" : "Order"} details`
          : "Please select a Job or Order",
        variant: "destructive",
      });
      return;
    }

    // Validate job status again before creating
    if (issueType === "job") {
      const job = selectedReference as Job;
      if (job.status === "Completed" || job.status === "Cancelled") {
        toast({
          title: "Error",
          description: `Cannot issue to ${job.status} job`,
          variant: "destructive",
        });
        return;
      }
    }

    const itemsToIssue = issueItems.filter((item) => item.issuedQty > 0);
    if (itemsToIssue.length === 0) {
      toast({
        title: "Error",
        description: "Please enter issue quantities for at least one item",
        variant: "destructive",
      });
      return;
    }

    // Check for validation errors
  // Step 1: Check for items with validation errors
const itemsWithErrors = itemsToIssue.filter((item) => item.error);
if (itemsWithErrors.length > 0) {
  toast({
    title: "Validation Error",
    description: "Please fix the quantity errors before proceeding",
    variant: "destructive",
  });
  return;
}

// Step 2: Re-validate stock availability via Axios
for (const item of itemsToIssue) {
  try {
    const { data: stockItem } = await axios.get(`/inventory_stock/${item.itemCode}`);

    const availableStock = stockItem?.available_quantity ?? stockItem?.quantity_on_hand ?? 0;

    if (item.issuedQty > availableStock) {
      toast({
        title: "Stock Error",
        description: `Insufficient stock for ${item.itemCode}. Available: ${availableStock}`,
        variant: "destructive",
      });
      return;
    }
  } catch (error: any) {
    toast({
      title: "Stock Fetch Error",
      description: `Failed to fetch stock for ${item.itemCode}: ${error.message}`,
      variant: "destructive",
    });
    return;
  }
}

// Step 3: Prepare new Issue record
const newIssue: Issue = {
  id: crypto.randomUUID(),
  issueNo: generateIssueNo(),
  issueDate: format(new Date(), "yyyy-MM-dd"),
  issueType,
  referenceNo:
    issueType === "job"
      ? (selectedReference as Job).jobNumber
      : getOrderNumber(selectedReference as Order),
  referenceName:
    issueType === "job"
      ? (selectedReference as Job).itemName
      : getOrderCustomerName(selectedReference as Order),
  issuedBy: "Current User",
  warehouse: "Main Warehouse",
  remarks,
  status: "Issued",
  items: itemsToIssue,
  createdAt: new Date().toISOString(),
};

// Step 4: Update inventory stock and create transactions
for (const item of itemsToIssue) {
  try {
    // Get stock
    const { data: stockItem } = await axios.get(`/inventory_stock/${item.itemCode}`);
    if (!stockItem) continue;

    const newOnHand = Math.max(0, (stockItem.quantity_on_hand || 0) - item.issuedQty);
    const newAvailable = Math.max(
      0,
      newOnHand - (stockItem.allocated_quantity || 0) - (stockItem.committed_quantity || 0)
    );

    // Update stock via PUT/PATCH
    await axios.patch(`/inventory_stock/${item.itemCode}`, {
      quantity_on_hand: newOnHand,
      available_quantity: newAvailable,
      last_transaction_date: new Date().toISOString(),
    });

    // Create stock transaction
    await axios.post("/stock_transactions", {
      item_code: item.itemCode,
      transaction_type: "Issue",
      quantity: -item.issuedQty,
      reference_type: issueType === "job" ? "Job Issue" : "Order Issue",
      reference_number: newIssue.referenceNo,
      notes: `Issued to ${issueType}: ${newIssue.referenceNo}`,
      unit_cost: stockItem.unit_cost ?? 0,
    });
  } catch (error: any) {
    toast({
      title: "Stock Update Error",
      description: `Failed to update stock for ${item.itemCode}: ${error.message}`,
      variant: "destructive",
    });
    return;
  }
}

    // Save issue to localStorage
    const updatedIssues = [...issues, newIssue];
    localStorage.setItem("material_issues", JSON.stringify(updatedIssues));
    setIssues(updatedIssues);

    toast({
      title: "Issue Created",
      description: `Material issue ${newIssue.issueNo} created successfully`,
    });

    // Reset form
    resetForm();
    setIsCreateDialogOpen(false);
  };

  const resetForm = () => {
    setIssueType("job");
    setSelectedReference(null);
    setWarehouse("Main Warehouse");
    setRemarks("");
    setIssueItems([]);
    setSearchTerm("");
    setSearchResults([]);
    setJobNoInput("");
    setOrderNoInput("");
    setReferenceError("");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Issued: "default",
      Partial: "secondary",
      Cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Material Issues</h3>
          <p className="text-sm text-muted-foreground">Issue materials against Jobs or Orders</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Issue
        </Button>
      </div>

      {/* Issues List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Issued By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No material issues found. Click "New Issue" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="font-mono">{issue.issueNo}</TableCell>
                    <TableCell>{issue.issueDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{issue.issueType === "job" ? "Job Issue" : "Order Issue"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{issue.referenceNo}</span>
                        <p className="text-sm text-muted-foreground">{issue.referenceName}</p>
                      </div>
                    </TableCell>
                    <TableCell>{issue.warehouse}</TableCell>
                    <TableCell>{issue.issuedBy}</TableCell>
                    <TableCell>{getStatusBadge(issue.status)}</TableCell>
                    <TableCell>{issue.items.length} items</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Issue Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">Create Material Issue</DialogTitle>
            <DialogDescription className="text-muted-foreground">Issue materials from inventory against a Job or Order</DialogDescription>
          </DialogHeader>

          <ScrollArea type="always" className="flex-1 min-h-0">
            <div className="py-6 space-y-6 pr-4">
              {/* Issue Details Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">Issue Details</h3>
                <div className="border rounded-lg p-4 bg-card">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Issue No</Label>
                      <Input 
                        value={generateIssueNo()} 
                        disabled 
                        className="bg-muted/50 border-muted text-muted-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Issue Date</Label>
                      <Input 
                        type="text" 
                        value={format(new Date(), "MM/dd/yyyy")} 
                        disabled 
                        className="bg-muted/50 border-muted text-muted-foreground" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Issue Type</Label>
                      <Select
                        value={issueType}
                        onValueChange={(value: "job" | "order") => {
                          setIssueType(value);
                          setSelectedReference(null);
                          setIssueItems([]);
                        }}
                      >
                        <SelectTrigger className="bg-primary text-primary-foreground border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="job">Job Issue</SelectItem>
                          <SelectItem value="order">Order Issue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Warehouse / Store</Label>
                      <Select value={warehouse} onValueChange={setWarehouse}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Main Warehouse">Main Warehouse</SelectItem>
                          {locations.filter(loc => loc.location_name).map((loc) => (
                            <SelectItem key={loc.id} value={loc.location_name}>
                              {loc.location_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{issueType === "job" ? "Job No" : "Order No"}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={issueType === "job" ? jobNoInput : orderNoInput}
                          onChange={(e) => {
                            if (issueType === "job") {
                              setJobNoInput(e.target.value);
                              setSelectedReference(null);
                              setIssueItems([]);
                            } else {
                              setOrderNoInput(e.target.value);
                              setSelectedReference(null);
                              setIssueItems([]);
                            }
                            setReferenceError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (issueType === "job") handleLookupJob();
                              else handleLookupOrder();
                            }
                          }}
                          placeholder={`Enter ${issueType === "job" ? "Job" : "Order"} No...`}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (issueType === "job") handleLookupJob();
                            else handleLookupOrder();
                          }}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                      {referenceError && (
                        <p className="text-sm text-destructive">{referenceError}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Issued By</Label>
                      <Input 
                        value="Current User" 
                        disabled 
                        className="bg-muted/50 border-muted text-muted-foreground" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Auto-fetched Info */}
              {selectedReference && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-foreground">
                    {issueType === "job" ? "Job Details" : "Order Details"}
                  </h3>
                  <div className="border rounded-lg p-4 bg-card">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      {issueType === "job" ? (
                        <>
                          <div>
                            <Label className="text-muted-foreground text-xs">Job Item</Label>
                            <p className="font-medium">{(selectedReference as Job).itemName}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Item Code</Label>
                            <p className="font-mono">{(selectedReference as Job).itemCode}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Job Qty</Label>
                            <p className="font-medium">{(selectedReference as Job).quantity}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label className="text-muted-foreground text-xs">Customer</Label>
                            <p className="font-medium">{getOrderCustomerName(selectedReference as Order)}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Order No</Label>
                            <p className="font-mono">{getOrderNumber(selectedReference as Order)}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground text-xs">Items</Label>
                            <p className="font-medium">{(selectedReference as any)?.items?.length || 0} items</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Items to Issue */}
              {issueItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-foreground">
                    {issueType === "job" ? "BOM Components" : "Order Items"}
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <ScrollArea className="max-h-[250px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Item Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead className="text-right">Available</TableHead>
                            <TableHead className="text-right">Required</TableHead>
                            <TableHead className="text-right">Issue Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {issueItems.map((item) => (
                            <TableRow key={item.id} className={item.error ? "bg-destructive/10" : ""}>
                              <TableCell className="font-mono">{item.itemCode}</TableCell>
                              <TableCell>{item.itemName}</TableCell>
                              <TableCell>{item.uom}</TableCell>
                              <TableCell className="text-right">
                                <span className={item.availableStock === 0 ? "text-destructive font-medium" : ""}>
                                  {item.availableStock ?? 0}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">{item.requiredQty}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.issuedQty}
                                    onChange={(e) => handleIssueQtyChange(item.id, parseFloat(e.target.value) || 0)}
                                    className={`w-24 text-right ${item.error ? "border-destructive" : ""}`}
                                  />
                                  {item.error && (
                                    <span className="text-xs text-destructive">{item.error}</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-foreground">Remarks / Reference</h3>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter any additional notes..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIssue} className="bg-primary">
              <FileText className="h-4 w-4 mr-2" />
              Create Issue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {searchType === "job" ? "Find Job" : "Find Order"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={searchType === "job" ? "Search by Job No, Item Code..." : "Search by Order No, Customer..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {searchType === "job" ? (
                      <>
                        <TableHead>Job No</TableHead>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Order No</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={searchType === "job" ? 5 : 3} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "No results found" : "Enter search term and click Search"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults.map((result) => (
                      <TableRow
                        key={result.id}
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSelectReference(result)}
                      >
                        {searchType === "job" ? (
                          <>
                            <TableCell className="font-mono">{getJobNumber(result as Job)}</TableCell>
                            <TableCell className="font-mono">{(result as Job).itemCode}</TableCell>
                            <TableCell>{(result as Job).itemName}</TableCell>
                            <TableCell>{(result as Job).quantity}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{(result as Job).status}</Badge>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-mono">{getOrderNumber(result as Order)}</TableCell>
                            <TableCell>{getOrderCustomerName(result as Order)}</TableCell>
                            <TableCell>{(result as any)?.items?.length || 0} items</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; }

export default IssuesTab;
