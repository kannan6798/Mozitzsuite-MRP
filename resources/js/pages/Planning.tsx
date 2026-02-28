import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Calendar,
  TrendingUp,
  Clock,
  AlertTriangle,
  Eye,
  Trash2,
  Info,
  Package,
  Settings,
  History,
  FolderKanban,
  Calendar as CalendarIcon,
  Search,
  Check,
} from "lucide-react";
import { FindJobsDialog, JobFilters } from "@/components/planning/FindJobsDialog";
import { JobSearchResultsDialog } from "@/components/planning/JobSearchResultsDialog";
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
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JobCardDialog } from "@/components/planning/JobCardDialog";
import { ViewJobDialog } from "@/components/planning/ViewJobDialog";
const generateJobNumber = () => {
  const savedJobs = JSON.parse(localStorage.getItem("jobs") || "[]");

  // Find last created job number
  const lastJob = savedJobs
    .map((j: any) => j.id || j.jobNumber)
    .filter((id: string) => /^JOB-\d{6}$/.test(id))
    .sort()
    .pop();

  // If none exists → start at 1
  const nextNumber = lastJob ? parseInt(lastJob.replace("JOB-", ""), 10) + 1 : 1;

  return `JOB-${String(nextNumber).padStart(6, "0")}`;
};
const Planning = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isFindJobsDialogOpen, setIsFindJobsDialogOpen] = useState(false);
  const [isSearchResultsOpen, setIsSearchResultsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isItemKnown, setIsItemKnown] = useState(false);
  const [filteredJobs, setFilteredJobs] = useState<any[]>([]);

  // Item Code autocomplete state
  const [itemCodeOpen, setItemCodeOpen] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState<Array<{
    item_code: string;
    item_name: string;
    description: string | null;
  }>>([]);
  const [isSearchingItems, setIsSearchingItems] = useState(false);

  // Search items when query changes (min 2 characters)
  useEffect(() => {
    const searchItems = async () => {
      if (itemSearchQuery.length < 2) {
        setItemSuggestions([]);
        return;
      }
      
      setIsSearchingItems(true);
      try {
        // Search in BOM headers for products
        const { data: bomItems, error: bomError } = await (supabase as any)
          .from("bom_headers")
          .select("item_code, item_name")
          .or(`item_code.ilike.%${itemSearchQuery}%,item_name.ilike.%${itemSearchQuery}%`)
          .eq("status", "Active")
          .limit(10);

        // Also search in inventory for items without BOM
        const { data: inventoryItems, error: invError } = await (supabase as any)
          .from("inventory_stock")
          .select("item_code, item_name, description")
          .or(`item_code.ilike.%${itemSearchQuery}%,item_name.ilike.%${itemSearchQuery}%`)
          .limit(10);

        // Combine and dedupe results
        const combined: Array<{ item_code: string; item_name: string; description: string | null }> = [];
        const seenCodes = new Set<string>();

        // Prioritize BOM items (products)
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

        // Add inventory items that don't have BOM
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

  // Load orders, jobs, and item master from localStorage
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem("orders");
    return saved ? JSON.parse(saved) : [];
  });

  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem("jobs");
    return saved ? JSON.parse(saved) : [];
  });

  // Item Master: stores operations and components for each item
  const [itemMaster, setItemMaster] = useState(() => {
    const saved = localStorage.getItem("itemMaster");
    return saved ? JSON.parse(saved) : {};
  });
  // Helper function to calculate in-progress job quantity for an order
  const calculateInProgressJobQty = (orderId: string) => {
    // Get fresh jobs data from localStorage to ensure we have the latest state
    const currentJobs = JSON.parse(localStorage.getItem("jobs") || "[]");
    return currentJobs
      .filter((job: any) => 
        job.orderId === orderId && 
        job.status !== "Cancelled" && 
        job.status !== "Completed"
      )
      .reduce((sum: number, job: any) => sum + (parseFloat(job.quantity) || 0), 0);
  };

  // Helper function to calculate pending job quantity for an order
  const calculatePendingJobQty = (order: any) => {
    const productItems = Array.isArray(order.items) 
      ? order.items.filter((item: any) => item.itemType === "Product")
      : [];
    const orderQty = productItems.reduce((sum: number, item: any) => 
      sum + (parseFloat(item.quantityOrdered) || 0), 0
    );
    const inProgressQty = calculateInProgressJobQty(order.id);
    return Math.max(0, orderQty - inProgressQty);
  };

  // Filter for Product Orders only (Manufacturing type) with pending status
  const pendingOrders = orders.filter(
    (order: any) => 
      (order.status === "Pending" || order.status === "Awaiting Confirmation") &&
      order.orderType === "Manufacturing"
  );

  const [jobData, setJobData] = useState({
    orderId: "",
    jobNumber: "",
    productName: "",
    itemCode: "",
    salesOrderNum: "",
    itemDescription: "",
    uom: "Ea",
    quantity: "",
    dueDate: "",
    priority: "Medium",
    notes: "",
    routingAvailable: false,
  });

  // State for multiple job splits
  const [jobSplits, setJobSplits] = useState<Array<{
    id: string;
    jobNumber: string;
    quantity: string;
    dueDate: string;
    priority: string;
    notes: string;
  }>>([]);

  // State for order line items selection (multi-line job creation)
  const [orderLineItems, setOrderLineItems] = useState<Array<{
    id: string;
    itemCode: string;
    itemName: string;
    itemType: string;
    quantityOrdered: number;
    inProgressQty: number;
    pendingQty: number;
    selected: boolean;
    jobQuantity: string;
  }>>([]);

  // Get selected order details
  const selectedOrder = orders.find((o: any) => o.id === jobData.orderId);

  const [operations, setOperations] = useState([
    { id: 1, sequence: 10, name: "Cut Material", duration: "30", status: "pending", machine: "" },
    { id: 2, sequence: 20, name: "Weld Parts", duration: "45", status: "pending", machine: "" },
    { id: 3, sequence: 30, name: "Quality Check", duration: "15", status: "pending", machine: "" },
  ]);

  const [bomItems, setBomItems] = useState([
    {
      id: 1,
      itemSeq: 10,
      operationSeq: 10,
      component: "Steel Plate",
      description: "Raw material",
      quantity: 5,
      uom: "pcs",
      status: "available",
    },
    {
      id: 2,
      itemSeq: 20,
      operationSeq: 10,
      component: "Welding Wire",
      description: "Consumable",
      quantity: 2,
      uom: "kg",
      status: "available",
    },
    {
      id: 3,
      itemSeq: 30,
      operationSeq: 20,
      component: "Bolts M8",
      description: "Fasteners",
      quantity: 20,
      uom: "pcs",
      status: "low",
    },
  ]);

  // Reload orders from localStorage when component mounts or becomes visible
  useEffect(() => {
    const loadOrders = () => {
      const savedOrders = localStorage.getItem("orders");
      const savedJobs = localStorage.getItem("jobs");
      if (savedOrders) {
        try {
          setOrders(JSON.parse(savedOrders));
        } catch (e) {
          console.error("Failed to parse orders:", e);
        }
      }
      if (savedJobs) {
        try {
          setJobs(JSON.parse(savedJobs));
        } catch (e) {
          console.error("Failed to parse jobs:", e);
        }
      }
    };

    // Load on mount
    loadOrders();

    // Also handle storage events from other tabs
    const handleStorageChange = () => {
      loadOrders();
    };

    window.addEventListener("storage", handleStorageChange);

    // Listen for focus to reload when user returns to tab
    window.addEventListener("focus", loadOrders);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", loadOrders);
    };
  }, []);

  // Check if item exists in BOM and load its data from database
  const loadItemData = async (itemCode: string, requiredQuantity: number = 1) => {
    try {
      console.log(`Loading BOM data for item: ${itemCode}, quantity: ${requiredQuantity}`);

      // Fetch BOM header - get most recent active BOM
      const { data: bomHeaders, error: bomError } = await (supabase as any)
        .from("bom_headers")
        .select("*")
        .eq("item_code", itemCode)
        .eq("status", "Active")
        .order("created_at", { ascending: false })
        .limit(1);

      const bomHeader = bomHeaders && bomHeaders.length > 0 ? bomHeaders[0] : null;

      if (bomError) {
        console.error("Error fetching BOM header:", bomError);
        throw bomError;
      }

      if (!bomHeader) {
        console.log("No BOM found for item:", itemCode);
        setIsItemKnown(false);
        // Still try to get item info from inventory
        const { data: inventoryItem } = await (supabase as any)
          .from("inventory_stock")
          .select("*")
          .eq("item_code", itemCode)
          .maybeSingle();
        
        if (inventoryItem) {
          setJobData(prev => ({
            ...prev,
            itemDescription: inventoryItem.description || "",
            productName: inventoryItem.item_name || prev.productName,
            uom: "Ea",
            routingAvailable: false,
          }));
        }
        
        setOperations([]);
        setBomItems([]);
        toast({
          title: "New Item Detected",
          description: "No BOM found. Please add operations and components for this item",
        });
        return;
      }

      console.log("BOM header found:", bomHeader);

      // Auto-populate job data from BOM header
      setJobData(prev => ({
        ...prev,
        itemDescription: bomHeader.item_name || "",
        productName: bomHeader.item_name || prev.productName,
        uom: bomHeader.uom || "Ea",
      }));

      // Fetch BOM operations
      const { data: bomOperations, error: opsError } = await (supabase as any)
        .from("bom_operations")
        .select("*")
        .eq("bom_id", bomHeader.id)
        .order("operation_seq", { ascending: true });

      if (opsError) {
        console.error("Error fetching BOM operations:", opsError);
      } else {
        console.log("BOM operations loaded:", bomOperations);
      }

      // Fetch BOM components
      const { data: bomComponents, error: compsError } = await (supabase as any)
        .from("bom_components")
        .select("*")
        .eq("bom_id", bomHeader.id)
        .order("item_seq", { ascending: true });

      if (compsError) {
        console.error("Error fetching BOM components:", compsError);
      } else {
        console.log("BOM components loaded:", bomComponents);
      }

      // Update routing available flag
      const hasRouting = !opsError && bomOperations && bomOperations.length > 0;
      setJobData(prev => ({
        ...prev,
        routingAvailable: hasRouting,
      }));

      if (hasRouting) {
        const mappedOperations = bomOperations.map((op: any, idx: number) => {
          const bomRunTime = parseFloat(op.run_time) || 30;
          const calculatedDuration = bomRunTime * requiredQuantity;
          return {
            id: idx + 1,
            sequence: op.operation_seq,
            name: op.description,
            duration: calculatedDuration.toString(),
            status: "pending",
            machine: op.work_center || "",
          };
        });
        setOperations(mappedOperations);
        console.log("Operations set:", mappedOperations);
      } else {
        setOperations([]);
        console.log("No operations found or error occurred");
      }

      if (!compsError && bomComponents && bomComponents.length > 0) {
        const mappedComponents = bomComponents.map((comp: any, idx: number) => {
          const bomQuantity = parseFloat(comp.quantity) || 1;
          const calculatedQuantity = bomQuantity * requiredQuantity;
          return {
            id: idx + 1,
            itemSeq: comp.item_seq,
            operationSeq: comp.operation_seq,
            component: comp.component,
            description: comp.description,
            quantity: calculatedQuantity,
            uom: comp.uom,
            status: "available",
          };
        });
        setBomItems(mappedComponents);
        console.log("BOM items set:", mappedComponents);
      } else {
        setBomItems([]);
        console.log("No BOM components found or error occurred");
      }

      setIsItemKnown(true);
      toast({
        title: "BOM Data Loaded",
        description: `${bomOperations?.length || 0} operations and ${bomComponents?.length || 0} components loaded for ${itemCode} (Qty: ${requiredQuantity})`,
      });
    } catch (error) {
      console.error("Error loading BOM data:", error);
      setIsItemKnown(false);
      toast({
        title: "Error Loading BOM",
        description: "Failed to load BOM data from database",
        variant: "destructive",
      });
    }
  };

  const handleSelectOrder = (order: any) => {
    // Filter for product items only (not materials or components)
    const productItems = Array.isArray(order.items) 
      ? order.items.filter((item: any) => item.itemType === "Product")
      : [];
    
    if (productItems.length === 0) {
      toast({
        title: "No Product Items",
        description: "This order does not contain any product items suitable for job creation.",
        variant: "destructive",
      });
      return;
    }

    // Get fresh jobs data from localStorage to ensure we have the latest state
    const currentJobs = JSON.parse(localStorage.getItem("jobs") || "[]");

    // Calculate in-progress quantities per item using fresh data
    const lineItemsWithQty = productItems.map((item: any, index: number) => {
      const itemOrderQty = parseFloat(item.quantityOrdered) || 0;
      // Calculate in-progress jobs for this specific item
      const inProgressQty = currentJobs
        .filter((job: any) => 
          job.orderId === order.id && 
          job.itemCode === item.itemCode &&
          job.status !== "Cancelled" && 
          job.status !== "Completed"
        )
        .reduce((sum: number, job: any) => sum + (parseFloat(job.quantity) || 0), 0);
      const pendingQty = Math.max(0, itemOrderQty - inProgressQty);

      return {
        id: `${order.id}-${item.itemCode}-${index}`,
        itemCode: item.itemCode || "",
        itemName: item.itemName || "",
        itemType: item.itemType || "Product",
        quantityOrdered: itemOrderQty,
        inProgressQty,
        pendingQty,
        selected: false,
        jobQuantity: pendingQty.toString(),
      };
    });

    setOrderLineItems(lineItemsWithQty);

    setJobData((prev) => ({
      ...prev,
      orderId: order.id,
      productName: "",
      itemCode: "",
      quantity: "",
      salesOrderNum: "",
      dueDate: order.expectedDispatchDate || "",
      priority: order.priority || "Medium",
      notes: `Job for order ${order.id}`,
    }));

    // Reset job splits when order changes
    setJobSplits([]);
    setBomItems([]);
    setOperations([]);
    setIsItemKnown(false);
  };

  // Toggle selection of a line item
  const toggleLineItemSelection = (itemId: string) => {
    setOrderLineItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, selected: !item.selected } : item
    ));
  };

  // Select all line items
  const selectAllLineItems = (selected: boolean) => {
    setOrderLineItems(prev => prev.map(item => ({
      ...item,
      selected: item.pendingQty > 0 ? selected : false
    })));
  };

  // Update job quantity for a line item
  const updateLineItemJobQty = (itemId: string, quantity: string) => {
    setOrderLineItems(prev => prev.map(item => 
      item.id === itemId? { ...item, jobQuantity: quantity } : item
    ));
  };

  // Get selected line items count
  const selectedLineItemsCount = orderLineItems.filter(item => item.selected).length;
  const allSelectableSelected = orderLineItems.filter(item => item.pendingQty > 0).every(item => item.selected);

  // Add a new job split
  const addJobSplit = () => {
    const order = orders.find((o: any) => o.id === jobData.orderId);
    if (!order) {
      toast({
        title: "Error",
        description: "Please select an order first",
        variant: "destructive",
      });
      return;
    }

    const pendingQty = calculatePendingJobQty(order);
    const currentTotal = jobSplits.reduce((sum, split) => sum + (parseFloat(split.quantity) || 0), 0);
    const remainingQty = pendingQty - currentTotal;

    if (remainingQty <= 0) {
      toast({
        title: "No Remaining Quantity",
        description: "All pending quantity has been allocated to job splits",
        variant: "destructive",
      });
      return;
    }

    const newJobNumber = generateJobNumber();
    setJobSplits([
      ...jobSplits,
      {
        id: Date.now().toString(),
        jobNumber: newJobNumber,
        quantity: "",
        dueDate: jobData.dueDate,
        priority: jobData.priority,
        notes: "",
      },
    ]);
  };

  // Update a job split
  const updateJobSplit = (id: string, field: string, value: string) => {
    setJobSplits(jobSplits.map((split) => (split.id === id ? { ...split, [field]: value } : split)));
  };

  // Remove a job split
  const removeJobSplit = (id: string) => {
    setJobSplits(jobSplits.filter((split) => split.id !== id));
  };

  // Calculate total quantity of job splits
  const calculateTotalSplitQuantity = () => {
    return jobSplits.reduce((sum, split) => sum + (parseFloat(split.quantity) || 0), 0);
  };

  // Add/Update operation
  const addOperation = () => {
    const lastSeq = operations.length > 0 ? Math.max(...operations.map((o) => o.sequence)) : 0;
    setOperations([
      ...operations,
      {
        id: operations.length + 1,
        sequence: lastSeq + 10,
        name: "",
        duration: "30",
        status: "pending",
        machine: "",
      },
    ]);
  };

  const updateOperation = (id: number, field: string, value: any) => {
    setOperations(operations.map((op) => (op.id === id ? { ...op, [field]: value } : op)));
  };

  const removeOperation = (id: number) => {
    if (operations.length > 1) {
      setOperations(operations.filter((op) => op.id !== id));
    }
  };

  // Add/Update BOM component
  const addBomItem = () => {
    const lastItemSeq = bomItems.length > 0 ? Math.max(...bomItems.map((b) => b.itemSeq)) : 0;
    setBomItems([
      ...bomItems,
      {
        id: bomItems.length + 1,
        itemSeq: lastItemSeq + 10,
        operationSeq: 10,
        component: "",
        description: "",
        quantity: 1,
        uom: "pcs",
        status: "available",
      },
    ]);
  };

  const updateBomItem = (id: number, field: string, value: any) => {
    setBomItems(bomItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeBomItem = (id: number) => {
    if (bomItems.length > 1) {
      setBomItems(bomItems.filter((item) => item.id !== id));
    }
  };

  // Create jobs for multiple selected line items
  const handleCreateMultipleJobs = async () => {
    const selectedItems = orderLineItems.filter(item => item.selected && item.pendingQty > 0);
    
    if (selectedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one line item to create job cards.",
        variant: "destructive",
      });
      return;
    }

    // Validate job quantities
    const invalidItems = selectedItems.filter(item => {
      const qty = parseFloat(item.jobQuantity);
      return isNaN(qty) || qty <= 0 || qty > item.pendingQty;
    });

    if (invalidItems.length > 0) {
      toast({
        title: "Invalid Quantities",
        description: "Please ensure all job quantities are valid and do not exceed pending quantities.",
        variant: "destructive",
      });
      return;
    }

    try {
      const createdJobs: any[] = [];
      
      for (const lineItem of selectedItems) {
        const jobNumber = generateJobNumber();
        const jobQty = parseFloat(lineItem.jobQuantity);

        // Load BOM data for this item
        const { data: bomHeaders } = await (supabase as any)
          .from("bom_headers")
          .select("*")
          .eq("item_code", lineItem.itemCode)
          .eq("status", "Active")
          .order("created_at", { ascending: false })
          .limit(1);

        const bomHeader = bomHeaders && bomHeaders.length > 0 ? bomHeaders[0] : null;
        let itemBomItems: any[] = [];
        let itemOperations: any[] = [];

        if (bomHeader) {
          // Fetch BOM components
          const { data: bomComponents } = await (supabase as any)
            .from("bom_components")
            .select("*")
            .eq("bom_id", bomHeader.id)
            .order("item_seq", { ascending: true });

          // Fetch BOM operations
          const { data: bomOps } = await (supabase as any)
            .from("bom_operations")
            .select("*")
            .eq("bom_id", bomHeader.id)
            .order("operation_seq", { ascending: true });

          if (bomComponents) {
            itemBomItems = bomComponents.map((comp: any, idx: number) => ({
              id: idx + 1,
              itemSeq: comp.item_seq,
              operationSeq: comp.operation_seq,
              component: comp.component,
              description: comp.description,
              quantity: (parseFloat(comp.quantity) || 1) * jobQty,
              uom: comp.uom,
              status: "available",
            }));
          }

          if (bomOps) {
            itemOperations = bomOps.map((op: any, idx: number) => ({
              id: idx + 1,
              sequence: op.operation_seq,
              name: op.description,
              duration: ((parseFloat(op.run_time) || 30) * jobQty).toString(),
              status: "pending",
              machine: op.work_center || "",
            }));
          }

          // Commit materials for this job
          for (const bomItem of itemBomItems) {
            const requiredQty = parseFloat(bomItem.quantity.toString());

            const { data: currentStock } = await supabase
              .from("inventory_stock")
              .select("*")
              .eq("item_code", bomItem.component)
              .maybeSingle();

            if (currentStock) {
              const currentQtyOnHand = currentStock.quantity_on_hand || 0;
              
              if (currentQtyOnHand >= requiredQty) {
                const newCommittedQty = ((currentStock as any).committed_quantity || 0) + requiredQty;
                
                await supabase
                  .from("inventory_stock")
                  .update({
                    committed_quantity: newCommittedQty,
                    updated_at: new Date().toISOString(),
                  } as any)
                  .eq("item_code", bomItem.component);

                await (supabase as any).from("job_allocations").insert({
                  job_number: jobNumber,
                  item_code: bomItem.component,
                  allocated_quantity: requiredQty,
                  status: "allocated",
                });

                await supabase.from("stock_transactions").insert({
                  item_code: bomItem.component,
                  transaction_type: "Commit",
                  quantity: requiredQty,
                  reference_type: "Job",
                  reference_number: jobNumber,
                  notes: `Material committed for job ${jobNumber}`,
                });
              }
            }
          }
        }

        const newJob = {
          id: jobNumber,
          orderId: jobData.orderId,
          productName: lineItem.itemName,
          itemCode: lineItem.itemCode,
          quantity: jobQty.toString(),
          dueDate: jobData.dueDate,
          priority: jobData.priority,
          status: "Pending",
          notes: `Job for order ${jobData.orderId} - ${lineItem.itemName}`,
          operations: itemOperations,
          bomItems: itemBomItems,
          createdAt: new Date().toISOString(),
        };

        createdJobs.push(newJob);
      }

      // Save all created jobs
      const updatedJobs = [...jobs, ...createdJobs];
      localStorage.setItem("jobs", JSON.stringify(updatedJobs));
      setJobs(updatedJobs);

      // Update order status
      const updatedOrders = orders.map((order: any) =>
        order.id === jobData.orderId ? { ...order, status: "Processing" } : order
      );
      localStorage.setItem("orders", JSON.stringify(updatedOrders));
      setOrders(updatedOrders);

      toast({
        title: "Job Cards Created",
        description: `${createdJobs.length} job card(s) created successfully for selected items.`,
      });

      // Reset form
      setOrderLineItems([]);
      setJobData({
        orderId: "",
        jobNumber: "",
        productName: "",
        itemCode: "",
        salesOrderNum: "",
        itemDescription: "",
        uom: "Ea",
        quantity: "",
        dueDate: "",
        priority: "Medium",
        notes: "",
        routingAvailable: false,
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error Creating Jobs",
        description: error.message || "Failed to create job cards",
        variant: "destructive",
      });
    }
  };

  const handleCreateJob = async () => {
    if (!jobData.orderId || !jobData.productName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Check if using split jobs or single job
    const isUsingSplits = jobSplits.length > 0;

    // Validate pending quantity
    const order = orders.find((o: any) => o.id === jobData.orderId);
    if (!order) {
      toast({
        title: "Error",
        description: "Order not found",
        variant: "destructive",
      });
      return;
    }

    const pendingQty = calculatePendingJobQty(order);
    
    if (pendingQty <= 0) {
      toast({
        title: "No Pending Quantity",
        description: "No pending quantity available for new jobs.",
        variant: "destructive",
      });
      return;
    }

    // Validate quantities based on whether splits are used
    if (isUsingSplits) {
      // Validate all splits have quantities
      const invalidSplits = jobSplits.filter((split) => !split.quantity || parseFloat(split.quantity) <= 0);
      if (invalidSplits.length > 0) {
        toast({
          title: "Invalid Quantities",
          description: "All job splits must have a valid quantity greater than 0",
          variant: "destructive",
        });
        return;
      }

      const totalSplitQty = calculateTotalSplitQuantity();
      if (totalSplitQty > pendingQty) {
        toast({
          title: "Insufficient Pending Quantity",
          description: `Total split quantity (${totalSplitQty}) exceeds pending quantity (${pendingQty}). Please adjust quantities.`,
          variant: "destructive",
        });
        return;
      }
    } else {
      // Single job validation
      if (!jobData.jobNumber) {
        toast({
          title: "Validation Error",
          description: "Job number is required",
          variant: "destructive",
        });
        return;
      }

      const jobQty = parseFloat(jobData.quantity);
      if (jobQty > pendingQty) {
        toast({
          title: "Insufficient Pending Quantity",
          description: `Job quantity (${jobQty}) exceeds pending quantity (${pendingQty}). Please reduce job quantity.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Determine jobs to create
      const jobsToCreate = isUsingSplits
        ? jobSplits.map((split) => ({
            jobNumber: split.jobNumber,
            quantity: split.quantity,
            dueDate: split.dueDate,
            priority: split.priority,
            notes: split.notes,
          }))
        : [
            {
              jobNumber: jobData.jobNumber,
              quantity: jobData.quantity,
              dueDate: jobData.dueDate,
              priority: jobData.priority,
              notes: jobData.notes,
            },
          ];

      const createdJobs = [];

      // Create each job
      for (const jobInfo of jobsToCreate) {
        const insufficientItems = [];
        const warnings = [];

        for (const bomItem of bomItems) {
          const requiredQty = parseFloat(bomItem.quantity.toString()) * parseFloat(jobInfo.quantity);

          // Get current stock
          const { data: currentStock, error: stockError } = await supabase
            .from("inventory_stock")
            .select("*")
            .eq("item_code", bomItem.component)
            .maybeSingle();

          if (stockError || !currentStock) {
            insufficientItems.push({
              item_code: bomItem.component,
              required: requiredQty,
              available: 0,
            });
            continue;
          }

          const currentQtyOnHand = currentStock.quantity_on_hand || 0;

          // Check if sufficient stock on-hand for commitment
          if (currentQtyOnHand < requiredQty) {
            insufficientItems.push({
              item_code: bomItem.component,
              required: requiredQty,
              available: currentQtyOnHand,
            });
            continue;
          }

          // ONLY add to committed (do NOT deduct from on-hand at job creation)
          const newCommittedQty = ((currentStock as any).committed_quantity || 0) + requiredQty;

          const { error: updateError } = await supabase
            .from("inventory_stock")
            .update({
              committed_quantity: newCommittedQty,
              updated_at: new Date().toISOString(),
            } as any)
            .eq("item_code", bomItem.component);

          if (updateError) {
            throw new Error(`Failed to commit ${bomItem.component}: ${updateError.message}`);
          }

          // Create job allocation record
          await (supabase as any).from("job_allocations").insert({
            job_number: jobInfo.jobNumber,
            item_code: bomItem.component,
            allocated_quantity: requiredQty,
            status: "allocated",
          });

          // Create stock transaction for committed material
          await supabase.from("stock_transactions").insert({
            item_code: bomItem.component,
            transaction_type: "Commit",
            quantity: requiredQty,
            reference_type: "Job",
            reference_number: jobInfo.jobNumber,
            notes: `Material committed for job ${jobInfo.jobNumber} (not yet consumed)`,
          });

          // Check reorder point
          const reorderPoint = currentStock.reorder_point || 0;
          if (currentQtyOnHand < reorderPoint && reorderPoint > 0) {
            warnings.push({
              message: `${bomItem.component} is below reorder point. On-hand: ${currentQtyOnHand}, Reorder: ${reorderPoint}`,
            });
          }
        }

        // Show warnings for insufficient stock
        if (insufficientItems.length > 0) {
          toast({
            title: "Insufficient Stock",
            description: `Cannot create job ${jobInfo.jobNumber}. ${insufficientItems.length} component(s) have insufficient stock.`,
            variant: "destructive",
          });
          return;
        }

        // Show warnings for items below reorder point
        if (warnings.length > 0) {
          warnings.forEach((warning: any) => {
            toast({
              title: "Low Stock Warning",
              description: warning.message,
              variant: "destructive",
            });
          });
        }

        // Save item to master if new (only once)
        if (jobData.itemCode && !itemMaster[jobData.itemCode] && createdJobs.length === 0) {
          const updatedMaster = {
            ...itemMaster,
            [jobData.itemCode]: {
              itemName: jobData.productName,
              operations: operations,
              components: bomItems,
              lastUpdated: new Date().toISOString(),
            },
          };
          localStorage.setItem("itemMaster", JSON.stringify(updatedMaster));
          setItemMaster(updatedMaster);
        }

        const newJob = {
          id: jobInfo.jobNumber,
          orderId: jobData.orderId,
          productName: jobData.productName,
          itemCode: jobData.itemCode,
          quantity: jobInfo.quantity,
          dueDate: jobInfo.dueDate,
          priority: jobInfo.priority,
          status: "Pending",
          notes: jobInfo.notes,
          operations: operations,
          bomItems: bomItems,
          consumptionStatus: {
            consumed: bomItems.map((item) => ({
              item_code: item.component,
              quantity: parseFloat(item.quantity.toString()) * parseFloat(jobInfo.quantity),
            })),
            insufficient: insufficientItems,
            warnings: warnings,
          },
          createdAt: new Date().toISOString(),
        };

        createdJobs.push(newJob);
      }

      const updatedJobs = [...jobs, ...createdJobs];
      localStorage.setItem("jobs", JSON.stringify(updatedJobs));
      setJobs(updatedJobs);

      // Update order status to Processing
      const updatedOrders = orders.map((order: any) =>
        order.id === jobData.orderId ? { ...order, status: "Processing" } : order,
      );
      localStorage.setItem("orders", JSON.stringify(updatedOrders));
      setOrders(updatedOrders);

      toast({
        title: isUsingSplits ? "Jobs Created" : "Job Created",
        description: isUsingSplits 
          ? `${createdJobs.length} jobs created successfully. Materials committed (on-hand will be consumed on completion).`
          : `Job ${createdJobs[0].id} created successfully. Materials committed (on-hand will be consumed on completion).`,
      });

      // Reset form
      setJobData({
        orderId: "",
        jobNumber: "",
        productName: "",
        itemCode: "",
        salesOrderNum: "",
        itemDescription: "",
        uom: "Ea",
        quantity: "",
        dueDate: "",
        priority: "Medium",
        notes: "",
        routingAvailable: false,
      });
      setJobSplits([]);
      setOperations([
        { id: 1, sequence: 10, name: "Cut Material", duration: "30", status: "pending", machine: "" },
        { id: 2, sequence: 20, name: "Weld Parts", duration: "45", status: "pending", machine: "" },
        { id: 3, sequence: 30, name: "Quality Check", duration: "15", status: "pending", machine: "" },
      ]);
      setBomItems([
        {
          id: 1,
          itemSeq: 10,
          operationSeq: 10,
          component: "Steel Plate",
          description: "Raw material",
          quantity: 5,
          uom: "pcs",
          status: "available",
        },
        {
          id: 2,
          itemSeq: 20,
          operationSeq: 10,
          component: "Welding Wire",
          description: "Consumable",
          quantity: 2,
          uom: "kg",
          status: "available",
        },
        {
          id: 3,
          itemSeq: 30,
          operationSeq: 20,
          component: "Bolts M8",
          description: "Fasteners",
          quantity: 20,
          uom: "pcs",
          status: "low",
        },
      ]);
      setIsItemKnown(false);
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error Creating Job",
        description: error.message || "Failed to create job and allocate inventory",
        variant: "destructive",
      });
    }
  };

  const handleJobStatusChange = async (jobId: string, newStatus: string) => {
    const job = jobs.find((j: any) => j.id === jobId);
    if (!job) return;

    const previousStatus = job.status;

    // Only trigger inventory update when status changes to Completed or Ready for Dispatch
    if (
      (newStatus === "Completed" || newStatus === "Ready for Dispatch") &&
      previousStatus !== "Completed" &&
      previousStatus !== "Ready for Dispatch"
    ) {
      try {
        const quantity = parseFloat(job.quantity) || 1;
        const itemCode = job.itemCode;
        const itemName = job.productName;

        if (!itemCode) {
          toast({
            title: "Error",
            description: "Job does not have an item code. Cannot add to inventory.",
            variant: "destructive",
          });
          return;
        }

        // First, release committed quantities for all BOM materials
        const { data: jobAllocations, error: allocError } = await (supabase as any)
          .from("job_allocations")
          .select("item_code, allocated_quantity")
          .eq("job_number", jobId)
          .eq("status", "allocated");

        if (allocError) {
          console.error("Error fetching job allocations:", allocError);
          throw new Error("Failed to fetch job allocations");
        }

        // Consume materials: reduce committed AND on-hand quantities
        if (jobAllocations && jobAllocations.length > 0) {
          for (const allocation of jobAllocations) {
            const { data: currentStock, error: fetchError } = await supabase
              .from("inventory_stock")
              .select("*")
              .eq("item_code", allocation.item_code)
              .maybeSingle();

            if (fetchError) {
              throw new Error(`Failed to fetch stock for ${allocation.item_code}`);
            }

            if (currentStock) {
              const currentCommitted = (currentStock as any).committed_quantity || 0;
              const currentOnHand = currentStock.quantity_on_hand || 0;

              // Verify committed quantity is sufficient
              if (currentCommitted < allocation.allocated_quantity) {
                throw new Error(
                  `Insufficient committed quantity for ${allocation.item_code}. Committed: ${currentCommitted}, Required: ${allocation.allocated_quantity}`,
                );
              }

              // Reduce both committed AND on-hand (actual consumption happens now)
              const newCommittedQty = Math.max(0, currentCommitted - allocation.allocated_quantity);
              const newOnHandQty = Math.max(0, currentOnHand - allocation.allocated_quantity);

              await supabase
                .from("inventory_stock")
                .update({
                  committed_quantity: newCommittedQty,
                  quantity_on_hand: newOnHandQty,
                  updated_at: new Date().toISOString(),
                } as any)
                .eq("item_code", allocation.item_code);

              // Create consumption transaction
              await supabase.from("stock_transactions").insert({
                item_code: allocation.item_code,
                transaction_type: "Consumption",
                quantity: -allocation.allocated_quantity,
                reference_type: "Job",
                reference_number: jobId,
                notes: `Material consumed for completed job ${jobId}`,
              });
            }

            // Update allocation status to consumed
            await (supabase as any)
              .from("job_allocations")
              .update({ status: "consumed" })
              .eq("job_number", jobId)
              .eq("item_code", allocation.item_code);
          }
        }

        // Check if item exists in inventory
        const { data: existingStock, error: checkError } = await supabase
          .from("inventory_stock")
          .select("*")
          .eq("item_code", itemCode)
          .maybeSingle();

        if (checkError) {
          console.error("Error checking inventory:", checkError);
          throw new Error("Failed to check inventory");
        }

        if (existingStock) {
          // Update existing stock - add finished product quantity
          const { error: updateError } = await supabase
            .from("inventory_stock")
            .update({
              quantity_on_hand: (existingStock.quantity_on_hand || 0) + quantity,
              updated_at: new Date().toISOString(),
            })
            .eq("item_code", itemCode);

          if (updateError) {
            console.error("Error updating inventory:", updateError);
            throw new Error("Failed to update inventory");
          }
        } else {
          // Create new stock entry for finished product
          const { error: insertError } = await supabase.from("inventory_stock").insert({
            item_code: itemCode,
            item_name: itemName,
            item_type: "Product",
            quantity_on_hand: quantity,
            unit_cost: 0,
          });

          if (insertError) {
            console.error("Error creating inventory entry:", insertError);
            throw new Error("Failed to create inventory entry");
          }
        }

        // Create stock transaction record
        await supabase.from("stock_transactions").insert({
          item_code: itemCode,
          transaction_type: "Production",
          quantity: quantity,
          reference_type: "Job",
          reference_number: jobId,
          notes: `Finished product added from ${newStatus.toLowerCase()} job ${jobId}. Committed materials released.`,
        });

        toast({
          title: "Job Completed",
          description: `Job ${jobId} marked as ${newStatus}. Materials consumed from on-hand and ${quantity} units of ${itemName} added to inventory.`,
        });
      } catch (error: any) {
        toast({
          title: "Error Updating Inventory",
          description: error.message,
          variant: "destructive",
        });
        return; // Don't update job status if inventory update failed
      }
    }

    // Update job status
    const updatedJobs = jobs.map((j: any) => (j.id === jobId ? { ...j, status: newStatus } : j));
    localStorage.setItem("jobs", JSON.stringify(updatedJobs));
    setJobs(updatedJobs);
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      // Deallocate inventory for this job
      const { error: deallocationError } = await (supabase as any).rpc("deallocate_inventory_for_job", {
        p_job_number: jobId,
      });

      if (deallocationError) {
        toast({
          title: "Warning",
          description: `Job deleted but failed to deallocate inventory: ${deallocationError.message}`,
          variant: "destructive",
        });
      }

      const updatedJobs = jobs.filter((job: any) => job.id !== jobId);
      localStorage.setItem("jobs", JSON.stringify(updatedJobs));
      setJobs(updatedJobs);

      toast({
        title: "Job Deleted",
        description: `Job ${jobId} deleted and inventory deallocated.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  // Handler for creating job from new JobCardDialog
  const handleCreateJobFromDialog = useCallback(async (newJobData: any, newOperations: any[], newBomItems: any[], newJobSplits: any[]) => {
    try {
      const order = orders.find((o: any) => o.id === newJobData.orderId);
      const quantity = parseFloat(newJobData.quantity) || 1;
      
      // Create the job
      const newJob = {
        id: newJobData.jobNumber,
        orderId: newJobData.orderId,
        productName: newJobData.productName,
        itemCode: newJobData.itemCode,
        quantity: quantity.toString(),
        salesOrderNum: newJobData.salesOrderNum || "",
        dueDate: newJobData.completionDate || newJobData.dueDate,
        priority: newJobData.priority,
        status: "Pending",
        notes: newJobData.notes,
        operations: newOperations,
        bomItems: newBomItems,
        createdAt: new Date().toISOString(),
      };

      // Commit materials if BOM items exist
      for (const bomItem of newBomItems) {
        const requiredQty = parseFloat(bomItem.quantity?.toString() || "0");
        if (requiredQty > 0) {
          const { data: currentStock } = await supabase
            .from("inventory_stock")
            .select("*")
            .eq("item_code", bomItem.component)
            .maybeSingle();

          if (currentStock) {
            const newCommittedQty = ((currentStock as any).committed_quantity || 0) + requiredQty;
            await supabase
              .from("inventory_stock")
              .update({
                committed_quantity: newCommittedQty,
                updated_at: new Date().toISOString(),
              } as any)
              .eq("item_code", bomItem.component);

            await (supabase as any).from("job_allocations").insert({
              job_number: newJobData.jobNumber,
              item_code: bomItem.component,
              allocated_quantity: requiredQty,
              status: "allocated",
            });

            await supabase.from("stock_transactions").insert({
              item_code: bomItem.component,
              transaction_type: "Commit",
              quantity: requiredQty,
              reference_type: "Job",
              reference_number: newJobData.jobNumber,
              notes: `Material committed for job ${newJobData.jobNumber}`,
            });
          }
        }
      }

      const updatedJobs = [...jobs, newJob];
      localStorage.setItem("jobs", JSON.stringify(updatedJobs));
      setJobs(updatedJobs);

      // Update order status
      if (order) {
        const updatedOrders = orders.map((o: any) =>
          o.id === newJobData.orderId ? { ...o, status: "Processing" } : o
        );
        localStorage.setItem("orders", JSON.stringify(updatedOrders));
        setOrders(updatedOrders);
      }

      toast({
        title: "Job Created",
        description: `Job ${newJobData.jobNumber} created successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error Creating Job",
        description: error.message || "Failed to create job",
        variant: "destructive",
      });
    }
  }, [jobs, orders, toast]);

  // Memoize generateJobNumber for JobCardDialog
  const memoizedGenerateJobNumber = useCallback(() => generateJobNumber(), []);

  // Handler for finding jobs with filters
  const handleFindJobs = useCallback((filters: JobFilters) => {
    // Get fresh jobs data from localStorage
    const currentJobs = JSON.parse(localStorage.getItem("jobs") || "[]");
    
    let filtered = [...currentJobs];

    // Filter by job number range
    if (filters.jobFrom) {
      filtered = filtered.filter((job: any) => {
        const jobId = job.id || job.jobNumber || "";
        return jobId.toLowerCase() >= filters.jobFrom.toLowerCase();
      });
    }
    if (filters.jobTo) {
      filtered = filtered.filter((job: any) => {
        const jobId = job.id || job.jobNumber || "";
        return jobId.toLowerCase() <= filters.jobTo.toLowerCase();
      });
    }

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter((job: any) => 
        (job.type || job.jobType || "Standard") === filters.type
      );
    }

    // Filter by assembly/item code
    if (filters.assembly) {
      filtered = filtered.filter((job: any) => 
        job.itemCode?.toLowerCase().includes(filters.assembly.toLowerCase()) ||
        job.productName?.toLowerCase().includes(filters.assembly.toLowerCase())
      );
    }

    // Filter by class
    if (filters.class) {
      filtered = filtered.filter((job: any) => 
        (job.class || job.jobClass || "").toLowerCase().includes(filters.class.toLowerCase())
      );
    }

    // Filter by start date range
    if (filters.startDateFrom) {
      filtered = filtered.filter((job: any) => {
        const jobDate = job.createdAt || job.startDate;
        return jobDate >= filters.startDateFrom;
      });
    }
    if (filters.startDateTo) {
      filtered = filtered.filter((job: any) => {
        const jobDate = job.createdAt || job.startDate;
        return jobDate <= filters.startDateTo;
      });
    }

    // Filter by completion date range
    if (filters.completionDateFrom) {
      filtered = filtered.filter((job: any) => job.dueDate >= filters.completionDateFrom);
    }
    if (filters.completionDateTo) {
      filtered = filtered.filter((job: any) => job.dueDate <= filters.completionDateTo);
    }

    // Filter by status checkboxes
    const selectedStatuses: string[] = [];
    if (filters.statusUnreleased) selectedStatuses.push("Pending", "Created", "Unreleased");
    if (filters.statusReleased) selectedStatuses.push("In Progress", "Released");
    if (filters.statusComplete) selectedStatuses.push("Completed", "Complete", "Ready for Dispatch");
    if (filters.statusOnHold) selectedStatuses.push("On Hold");
    
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((job: any) => selectedStatuses.includes(job.status));
    }

    // Update jobs state with fresh data
    setJobs(currentJobs);
    setFilteredJobs(filtered);
    setIsSearchResultsOpen(true);
    toast({
      title: "Jobs Found",
      description: `Found ${filtered.length} job(s) matching your criteria.`,
    });
  }, [toast]);

  // Handler for opening a job from search results
  const handleOpenJobFromSearch = useCallback((job: any) => {
    setSelectedJob(job);
    setIsSearchResultsOpen(false);
    setIsViewDialogOpen(true);
  }, []);

  // Handler for viewing operations from search results
  const handleViewOperationsFromSearch = useCallback((job: any) => {
    setSelectedJob(job);
    setIsSearchResultsOpen(false);
    setIsViewDialogOpen(true);
  }, []);

  // Handler for viewing components from search results  
  const handleViewComponentsFromSearch = useCallback((job: any) => {
    setSelectedJob(job);
    setIsSearchResultsOpen(false);
    setIsViewDialogOpen(true);
  }, []);

  // Handler for viewing genealogy from search results
  const handleViewGenealogyFromSearch = useCallback((job: any) => {
    setSelectedJob(job);
    setIsSearchResultsOpen(false);
    setIsViewDialogOpen(true);
  }, []);

  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Production Jobs</h1>
            <p className="text-muted-foreground mt-1">Manage and track production jobs</p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsFindJobsDialogOpen(true)}>
              <Search className="h-4 w-4 mr-2" />
              Find Jobs
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </div>
        </div>

        {/* Find Jobs Dialog */}
        <FindJobsDialog
          open={isFindJobsDialogOpen}
          onOpenChange={setIsFindJobsDialogOpen}
          onFind={handleFindJobs}
          onNew={() => setIsDialogOpen(true)}
        />
        
        {/* New ERP-Style Job Card Dialog */}
        <JobCardDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          pendingOrders={pendingOrders}
          orders={orders}
          onCreateJob={handleCreateJobFromDialog}
          generateJobNumber={memoizedGenerateJobNumber}
          calculateInProgressJobQty={calculateInProgressJobQty}
          calculatePendingJobQty={calculatePendingJobQty}
        />

        {/* Main Jobs List Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {filteredJobs.length > 0 ? "Search Results" : "Created Jobs"}
                </CardTitle>
                <CardDescription>
                  {filteredJobs.length > 0 
                    ? `Showing ${filteredJobs.length} filtered job(s)` 
                    : "All jobs created from orders"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {filteredJobs.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setFilteredJobs([])}
                  >
                    Clear Filter
                  </Button>
                )}
                {jobs.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {jobs.length} job(s) • {jobs.filter((j: any) => j.status === "Pending").length} pending •{" "}
                    {jobs.filter((j: any) => j.priority === "High").length} high priority
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="border border-dashed rounded-lg py-10 text-center text-muted-foreground text-sm">
                No jobs created yet. Click <span className="font-medium">Create Job</span> to get started.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {(filteredJobs.length > 0 ? filteredJobs : jobs).map((job: any) => (
                  <Card key={job.id} className="flex flex-col border border-border/60 shadow-sm h-full">
                    <CardHeader className="pb-3">
                      <div className="text-xs font-semibold text-primary mb-1">{job.id}</div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">{job.productName}</CardTitle>
                          <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                            {job.orderId && <>ORDER {job.orderId}</>}
                          </p>
                        </div>
                        <Badge
                          variant={
                            job.status === "Completed"
                              ? "secondary"
                              : job.status === "Ready for Dispatch"
                                ? "outline"
                                : job.status === "In Progress"
                                  ? "default"
                                  : "outline"
                          }
                          className="text-[11px] shrink-0"
                        >
                          {job.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 pb-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Item Code</span>
                          <span className="font-medium">{job.itemCode || "N/A"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Job Quantity</span>
                          <span className="font-medium">{job.quantity}</span>
                        </div>
                        {job.orderId && (() => {
                          const order = orders.find((o: any) => o.id === job.orderId);
                          if (order) {
                            const productItems = Array.isArray(order.items) 
                              ? order.items.filter((item: any) => item.itemType === "Product")
                              : [];
                            const orderQty = productItems.reduce((sum: number, item: any) => 
                              sum + (parseFloat(item.quantityOrdered) || 0), 0
                            );
                            const inProgressQty = calculateInProgressJobQty(job.orderId);
                            const pendingQty = Math.max(0, orderQty - inProgressQty);
                            
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Order Qty</span>
                                  <span className="font-medium">{orderQty}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">In-Progress Qty</span>
                                  <span className="font-medium">{inProgressQty}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Pending Qty</span>
                                  <span className={`font-medium ${pendingQty === 0 ? "text-muted-foreground" : "text-foreground"}`}>
                                    {pendingQty}
                                  </span>
                                </div>
                              </>
                            );
                          }
                          return null;
                        })()}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Quantity</span>
                          <span className="font-medium">{job.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Due Date</span>
                          <span className="font-medium">{job.dueDate || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Priority</span>
                          <Badge
                            variant={job.priority === "High" ? "destructive" : "secondary"}
                            className="text-[11px] px-2"
                          >
                            {job.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          Created: {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-muted-foreground">
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Operations: {job.operations?.length || 0}
                        </span>
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-muted-foreground">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Components: {job.bomItems?.length || 0}
                        </span>
                      </div>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-3 border-t pt-3 mt-auto">
                      {/* Discrete jobs are view-only - no status update allowed */}
                      {job.jobType?.toLowerCase() !== "discrete" && (
                        <div className="w-full">
                          <Label className="text-[11px] text-muted-foreground mb-1.5 block">Update Status</Label>
                          <Select value={job.status} onValueChange={(value) => handleJobStatusChange(job.id, value)}>
                            <SelectTrigger className="h-9 text-xs w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Ready for Dispatch">Ready for Dispatch</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Show view-only indicator for discrete jobs */}
                      {job.jobType?.toLowerCase() === "discrete" && (
                        <div className="w-full">
                          <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted/50 rounded-md border border-dashed">
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-medium">View Only - Discrete Job</span>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 flex-1 text-xs"
                          onClick={() => {
                            setSelectedJob(job);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View
                        </Button>
                        {/* Hide delete button for discrete jobs */}
                        {job.jobType?.toLowerCase() !== "discrete" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 flex-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Job Dialog */}
        <ViewJobDialog
          open={isViewDialogOpen}
          onOpenChange={setIsViewDialogOpen}
          job={selectedJob}
        />

        {/* Job Search Results Dialog */}
        <JobSearchResultsDialog
          open={isSearchResultsOpen}
          onOpenChange={setIsSearchResultsOpen}
          jobs={filteredJobs}
          onOpen={handleOpenJobFromSearch}
          onViewOperations={handleViewOperationsFromSearch}
          onViewComponents={handleViewComponentsFromSearch}
          onViewGenealogy={handleViewGenealogyFromSearch}
        />
      </div>
    </Layout>
  );
};

export default Planning;
