import Layout from "@/components/Layout";
import RFQForm from "@/components/RFQForm";
import OrderPackagesTab from "@/components/orders/OrderPackagesTab";
import { RefundDialog } from "@/components/orders/RefundDialog";
import { RefundsTab } from "@/components/orders/RefundsTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import axios from "axios";
import {
  Plus,
  Trash2,
  Eye,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Check,
  ChevronsUpDown,
  GripVertical,
  Printer,
  Sparkles,
  MapPin,
  ExternalLink,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CalendarIcon,
  Filter,
  RotateCcw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import FilterBar from "@/components/FilterBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Progress } from "@/components/ui/progress";

interface BOMComponent {
  component: string;
  description: string;
  uom: string;
  type: string;
  bomQuantity: number;
  availableQty: number;
  requiredQty: number;
}

interface LineItem {
  id: string;
  itemType: string;
  itemCode: string;
  itemName: string;
  uom: string;
  quantityOrdered: number;
  availableStock: number;
  rackLocation: string;
  batchNo: string;
  expiryDate: string;
  rate: number;
  tax: number;
  totalAmount: number;
  stockValidated: boolean;
  hasBOM?: boolean;
  bomComponents?: BOMComponent[];
  bomLoading?: boolean;
  noBOM?: boolean;
}

interface Order {
  id: string;
  orderDate: string;
  orderType: string;
  customer: string;
  contactPerson: string;
  contactNumber: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  referenceNo: string;
  priority: string;
  remarks: string;
  items: LineItem[];
  dispatchMode: string;
  transporterName: string;
  vehicleNo: string;
  expectedDispatchDate: string;
  deliveryStatus: string;
  warehouseLocation: string;
  location: string;
  paymentType: string;
  paymentTerms: string;
  advanceAmount: number;
  balanceAmount: number;
  invoiceRequired: string;
  status: string;
}

const Orders = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem("orders");
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      // Ensure all orders have items as an array
      return Array.isArray(parsed)
        ? parsed.map((order) => ({
            ...order,
            items: Array.isArray(order.items) ? order.items : [],
          }))
        : [];
    } catch (e) {
      console.error("Failed to parse orders from localStorage:", e);
      return [];
    }
  });

  const [usedItemCodes, setUsedItemCodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  
const [itemSearch, setItemSearch] = useState("");
const [itemSearches, setItemSearches] = useState<Record<string, string>>({});
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [currentEditingItemId, setCurrentEditingItemId] = useState<string | null>(null);
  const [itemCodePopoverOpen, setItemCodePopoverOpen] = useState<{ [key: string]: boolean }>({});
  const [itemUsabilityFilter, setItemUsabilityFilter] = useState<{ [key: string]: "all" | "buy" | "make" }>({});
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"Open" | "Done">("Open");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [locationFilter, setLocationFilter] = useState("All locations");
  const [currentTab, setCurrentTab] = useState("customer");
  const [mainTab, setMainTab] = useState("orders");
  const [completedTabs, setCompletedTabs] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState("");
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Advanced filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>("all");

  // Sorting states
  const [sortField, setSortField] = useState<"date" | "amount" | "customer" | "status" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // RFQ dialog states
  const [rfqDialogOpen, setRfqDialogOpen] = useState(false);
  const [rfqItem, setRfqItem] = useState<{
    item_code: string;
    item_name: string;
    description?: string;
    quantity: number;
  } | null>(null);

  // Refund states
  const [refunds, setRefunds] = useState<any[]>(() => {
    const saved = localStorage.getItem("orderRefunds");
    return saved ? JSON.parse(saved) : [];
  });
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);

  useEffect(() => {
    localStorage.setItem("orders", JSON.stringify(orders));
  }, [orders]);

  // Save refunds to localStorage
  useEffect(() => {
    localStorage.setItem("orderRefunds", JSON.stringify(refunds));
  }, [refunds]);

  // Auto-create order when returning from BOM page
  useEffect(() => {
    if (location.state?.autoCreateOrder && location.state?.orderData && location.state?.lineItems) {
      const { orderData, lineItems: returnedLineItems, bomData } = location.state;

      // Restore form data and line items
      setFormData(orderData);
      setLineItems(returnedLineItems);

      toast({
        title: "BOM Created Successfully",
        description: `BOM ${bomData.itemCode} created. Creating order automatically...`,
      });

      // Trigger order creation after a short delay
      setTimeout(async () => {
        // Create order programmatically
        const totalAmount = returnedLineItems.reduce((sum: number, item: LineItem) => sum + item.totalAmount, 0);

        const newOrder: Order = {
          id: generateSONumber(),
          orderDate: orderData.orderDate,
          orderType: orderData.orderType,
          customer: orderData.customerName,
          contactPerson: orderData.contactPerson,
          contactNumber: orderData.contactNumber,
          email: orderData.email,
          billingAddress: orderData.billingAddress,
          shippingAddress: orderData.shippingAddress,
          referenceNo: orderData.referenceNo,
          priority: orderData.priority,
          remarks: orderData.remarks,
          items: returnedLineItems,
          dispatchMode: orderData.dispatchMode,
          transporterName: orderData.transporterName,
          vehicleNo: orderData.vehicleNo,
          expectedDispatchDate: orderData.expectedDispatchDate,
          deliveryStatus: orderData.deliveryStatus,
          warehouseLocation: orderData.warehouseLocation,
          location: orderData.location || "",
          paymentType: orderData.paymentType,
          paymentTerms: orderData.paymentTerms,
          advanceAmount: orderData.advanceAmount,
          balanceAmount: totalAmount - orderData.advanceAmount,
          invoiceRequired: orderData.invoiceRequired,
          status: "Awaiting Confirmation",
        };

        // Update allocated quantity in inventory for each line item (orders use allocated)
        for (const item of returnedLineItems) {
          if (item.itemCode && item.quantityOrdered > 0) {
           await axios.post("/api/inventory-stock", {
              item_code: item.itemCode,
              allocated_quantity: item.quantityOrdered,
            });

          }
        }

        setOrders((prev) => [...prev, newOrder]);

        toast({
          title: "Order Created Successfully",
          description: `${newOrder.id} has been created with BOM ${bomData.itemCode}.`,
        });
      }, 1000);

      // Clear location state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location.state, toast]);




// fetch items on mount
/*useEffect(() => {
  fetch("http://127.0.0.1:8000/api/inventory-stock")
    .then((res) => res.json())
    .then((data) => {
      console.log("Fetched items:", data);
      // adjust if your API returns { items: [...] }
      setInventoryItems(data.items || []);
    })
    .catch((err) => console.error("Error fetching inventory:", err));
}, []);
         */


useEffect(() => {
  // Fetch all inventory items from backend
  fetch("/api/inventory-stock")
    .then((res) => res.json())
    .then((data) => setInventoryItems(data))
    .catch((err) => console.error("Error fetching inventory items:", err));
}, []);

  // Fetch inventory items and customers
useEffect(() => {
  const fetchData = async () => {
    try {
      // 1. Inventory fetch
      const inventoryResponse = await axios.get("/api/inventory-stock");
      const rawData = inventoryResponse.data;

      console.log("[Inventory] Raw response:", rawData);

      // Safely extract array (covers most Laravel patterns)
      let items = [];
      if (Array.isArray(rawData)) {
        items = rawData;
      } else if (rawData && typeof rawData === "object") {
        items = rawData.items || rawData.data || rawData.inventory || [];
      }

      console.log("[Inventory] Processed count:", items.length);
      if (items.length > 0) {
        console.log("[Inventory] First item:", items[0]);
        console.log("[Inventory] First item keys:", Object.keys(items[0]));
      } else {
        console.warn("[Inventory] No items loaded — check if DB has data or API response format");
      }

      setInventoryItems(items);

      // 2. Customers fetch
      const customerResponse = await axios.get("/api/customers");
      const customersData = Array.isArray(customerResponse.data)
        ? customerResponse.data
        : (customerResponse.data?.customers || customerResponse.data?.data || []);

      console.log("[Customers] Count:", customersData.length);

      setCustomers(
        customersData.length > 0
          ? customersData
          : [
              { id: "1", customer_name: "ABC Corporation", customer_code: "CUST001", email: "contact@abc.com", phone: "1234567890" },
              { id: "2", customer_name: "XYZ Industries",   customer_code: "CUST002", email: "info@xyz.com",     phone: "0987654321" },
              { id: "3", customer_name: "Global Traders",   customer_code: "CUST003", email: "sales@globaltraders.com", phone: "5551234567" },
            ]
      );

    } catch (error: any) {
      console.error("[Data Fetch] Failed:", error.message, error.response?.data);

      setCustomers([
        { id: "1", customer_name: "ABC Corporation", customer_code: "CUST001", email: "contact@abc.com", phone: "1234567890" },
        { id: "2", customer_name: "XYZ Industries",   customer_code: "CUST002", email: "info@xyz.com",     phone: "0987654321" },
        { id: "3", customer_name: "Global Traders",   customer_code: "CUST003", email: "sales@globaltraders.com", phone: "5551234567" },
      ]);

      toast({
        title: "Data Load Issue",
        description: error.response?.data?.message || "Couldn't load inventory/customers. Using fallback data.",
        variant: "default",
      });
    }
  };

  fetchData();
}, [createItemOpen]);

  // Generate unique SO number
  const generateSONumber = () => {
    const year = new Date().getFullYear();
    const count = orders.length + 1;
    return `SO-${year}-${String(count).padStart(5, "0")}`;
  };

  // Generate unique item code
  const generateItemCode = () => {
    let code;
    do {
      code = `ITM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    } while (usedItemCodes.has(code));
    return code;
  };

  // Validate stock availability against Supabase inventory
  const validateStock = (itemCode: string, quantity: number): boolean => {
    const item = inventoryItems.find((i: any) => i.item_code === itemCode);
    return item ? (item.available_quantity || 0) >= quantity : false;
  };

  const [formData, setFormData] = useState({
    customerName: "",
    customerCode: "",
    contactPerson: "",
    contactNumber: "",
    email: "",
    billingAddress: "",
    shippingAddress: "",
    orderNo: generateSONumber(),
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    orderType: "Sales Order",
    referenceNo: "",
    priority: "Normal",
    remarks: "",
    dispatchMode: "Courier",
    transporterName: "",
    vehicleNo: "",
    expectedDispatchDate: "",
    deliveryStatus: "Awaiting",
    warehouseLocation: "",
    location: "",
    paymentType: "Credit",
    paymentTerms: "Net 30 days",
    advanceAmount: 0,
    balanceAmount: 0,
    invoiceRequired: "Yes",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: "1",
      itemType: "",
      itemCode: "",
      itemName: "",
      uom: "pcs",
      quantityOrdered: 0,
      availableStock: 0,
      rackLocation: "",
      batchNo: "",
      expiryDate: "",
      rate: 0,
      tax: 18, // Default GST 18%
      totalAmount: 0,
      stockValidated: false,
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Auto-save form data to localStorage
  useEffect(() => {
    if (isDialogOpen) {
      const formState = {
        formData,
        lineItems,
        currentTab,
        completedTabs: Array.from(completedTabs),
      };
      localStorage.setItem("orderFormDraft", JSON.stringify(formState));
    }
  }, [formData, lineItems, currentTab, completedTabs, isDialogOpen]);

  // Load saved form data when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      const savedDraft = localStorage.getItem("orderFormDraft");
      if (savedDraft) {
        try {
          const {
            formData: savedFormData,
            lineItems: savedLineItems,
            currentTab: savedTab,
            completedTabs: savedCompletedTabs,
          } = JSON.parse(savedDraft);

          // Only restore if we have actual saved data different from initial state
          const hasData = savedFormData.customerName || savedLineItems.some((item: LineItem) => item.itemCode);
          if (hasData) {
            setFormData(savedFormData);
            setLineItems(savedLineItems);
            setCurrentTab(savedTab);
            setCompletedTabs(new Set(savedCompletedTabs));

            toast({
              title: "Draft Restored",
              description: "Your previous form data has been restored.",
            });
          }
        } catch (e) {
          console.error("Failed to restore draft:", e);
        }
      }
    }
  }, [isDialogOpen]);

  const addLineItem = () => {
    // Determine default item type based on order type
    const defaultItemType =
      formData.orderType === "Sales" ? "Component" : formData.orderType === "Manufacturing" ? "Product" : "";

    const newItem: LineItem = {
      id: String(lineItems.length + 1),
      itemType: defaultItemType,
      itemCode: "",
      itemName: "",
      uom: "pcs",
      quantityOrdered: 0,
      availableStock: 0,
      rackLocation: "",
      batchNo: "",
      expiryDate: "",
      rate: 0,
      tax: 18, // Default GST 18%
      totalAmount: 0,
      stockValidated: false,
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  // Calculate progress for each tab
  const getTabProgress = (tab: string) => {
    let completed = 0;
    let total = 0;

    switch (tab) {
      case "customer":
        total = 4;
        if (formData.customerName) completed++;
        if (formData.contactPerson) completed++;
        if (formData.contactNumber) completed++;
        if (formData.location) completed++;
        break;
      case "order":
        total = 4;
        if (formData.orderType) completed++;
        if (formData.orderDate) completed++;
        if (formData.expectedDeliveryDate) completed++;
        if (formData.priority) completed++;
        break;
      case "items":
        total = lineItems.length * 3;
        lineItems.forEach((item) => {
          if (item.itemType) completed++;
          if (item.itemCode) completed++;
          if (item.quantityOrdered > 0) completed++;
        });
        break;
      case "delivery":
        total = 2;
        if (formData.dispatchMode) completed++;
        if (formData.expectedDispatchDate) completed++;
        break;
      case "payment":
        total = 2;
        if (formData.paymentType) completed++;
        if (formData.paymentTerms) completed++;
        break;
    }

    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  // Fetch BOM components for a product
  const fetchBOMComponents = async (itemCode: string, orderQuantity: number) => {
  try {
    // 1️⃣ Fetch the latest active BOM header for this item
    const bomHeaderResponse = await axios.get("/api/bom-headers", {
      params: {
        item_code: itemCode.trim(),
        status: "Active",
        limit: 1,
        order_by: "created_at",
        order_dir: "desc",
      },
    });

    const bomHeaders = bomHeaderResponse.data;

    if (!bomHeaders || bomHeaders.length === 0) {
      return { components: [], noBOM: true };
    }

    const bomId = bomHeaders[0].id;

    // 2️⃣ Fetch BOM components for this BOM
    const componentsResponse = await axios.get("/api/bom-components", {
      params: {
        bom_id: bomId,
        status: "Active",
      },
    });

    const components = componentsResponse.data;

    if (!components || components.length === 0) {
      return { components: [], noBOM: true };
    }

    // 3️⃣ Fetch available quantities for all components
    const componentCodes = components.map((c: any) => c.component);

    const inventoryResponse = await axios.get("/api/inventory-stock", {
      params: {
        item_codes: componentCodes.join(","), // assuming your API can accept comma-separated codes
      },
    });

    const inventoryData = inventoryResponse.data;

    const inventoryMap = new Map(
      (inventoryData || []).map((item: any) => [item.item_code, item.available_quantity || 0])
    );

    // 4️⃣ Map BOM components with required and available quantities
    const bomComponents: BOMComponent[] = components.map((comp: any) => ({
      component: comp.component,
      description: comp.description,
      uom: comp.uom,
      type: comp.type,
      bomQuantity: comp.quantity,
      availableQty: inventoryMap.get(comp.component) || 0,
      requiredQty: comp.quantity * orderQuantity,
    }));

    return { components: bomComponents, noBOM: false };
  } catch (error) {
    console.error("Error fetching BOM components:", error);
    return { components: [], noBOM: true };
  }
};

  const updateLineItem = async (id: string, field: keyof LineItem, value: any) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // If itemCode is changed via selection, auto-fill details and check BOM
          if (field === "itemCode" && value) {
            const selectedItem = inventoryItems.find((inv) => inv.item_code === value);
            if (selectedItem) {
              updated.itemName = selectedItem.item_name || "";
              updated.itemType = selectedItem.item_type || "";
              updated.rate = selectedItem.unit_cost || 0;
              updated.availableStock = selectedItem.available_quantity || 0;
              updated.rackLocation = selectedItem.location || "";
              updated.stockValidated = true;

              // Fetch BOM components if item type is Product
              if (updated.itemType === "Product") {
                updated.bomLoading = true;
                updated.bomComponents = [];
                updated.noBOM = false;

                // Fetch BOM components asynchronously
                fetchBOMComponents(value, updated.quantityOrdered || 1).then(({ components, noBOM }) => {
                  setLineItems((prevItems) =>
                    prevItems.map((prevItem) =>
                      prevItem.id === id
                        ? { ...prevItem, bomComponents: components, bomLoading: false, noBOM }
                        : prevItem,
                    ),
                  );
                });
              }

              // Check if item has BOM and if it's up to date
              checkBOMStatus(value).then((bomStatus) => {
                if (bomStatus.hasBOM) {
                  if (bomStatus.needsUpdate) {
                    toast({
                      title: "BOM Update Required",
                      description: `Item ${value} has outdated BOM data. ${bomStatus.reason}`,
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "BOM Verified",
                      description: `Item ${value} has up-to-date BOM`,
                    });
                  }
                } else {
                  toast({
                    title: "No BOM Found",
                    description: `Item ${value} does not have a Bill of Materials defined`,
                    variant: "destructive",
                  });
                }
              });
            }
          }

          // Validate stock when quantity or item code changes
          if (field === "quantityOrdered" || field === "itemCode") {
            const qty = field === "quantityOrdered" ? value : updated.quantityOrdered;
            const code = field === "itemCode" ? value : updated.itemCode;

            if (code && qty > 0) {
              updated.stockValidated = validateStock(code, qty);
              if (!updated.stockValidated) {
                toast({
                  title: "Stock Warning",
                  description: `Insufficient stock for item ${code}. Quantity: ${qty}`,
                  variant: "destructive",
                });
              }
            }
          }

          // Recalculate BOM component required quantities when order quantity changes
          if (field === "quantityOrdered" && updated.itemType === "Product" && updated.bomComponents) {
            updated.bomComponents = updated.bomComponents.map((comp) => ({
              ...comp,
              requiredQty: comp.bomQuantity * value,
            }));
          }

          if (field === "quantityOrdered" || field === "rate" || field === "tax") {
            const qty = field === "quantityOrdered" ? value : updated.quantityOrdered;
            const rate = field === "rate" ? value : updated.rate;
            const tax = field === "tax" ? value : updated.tax;
            updated.totalAmount = qty * rate * (1 + tax / 100);
          }
          return updated;
        }
        return item;
      }),
    );
  };

  // Check BOM status for an item
const checkBOMStatus = async (
  itemCode: string
): Promise<{ hasBOM: boolean; needsUpdate: boolean; reason: string }> => {
  try {
    const trimmedCode = itemCode.trim();

    // 1️⃣ Fetch BOM headers along with components and operations
    const bomResponse = await axios.get("/api/bom-headers", {
      params: {
        item_code: trimmedCode,
        include: "bom_components,bom_operations", // your API should handle this
        limit: 1,
      },
    });

    const bomDataArray = bomResponse.data;

    if (!bomDataArray || bomDataArray.length === 0) {
      return { hasBOM: false, needsUpdate: false, reason: "No BOM defined" };
    }

    const bomData = bomDataArray[0];

    const components = bomData.bom_components || [];
    const operations = bomData.bom_operations || [];

    let needsUpdate = false;
    let reason = "";

    // 2️⃣ Check each BOM component
    for (const comp of components) {
      // Fetch inventory for this component
      const invResponse = await axios.get("/api/inventory-stock", {
        params: { item_code: comp.component },
      });
      const invData = invResponse.data[0]; // assume API returns an array

      if (!invData || (invData.available_quantity || 0) < comp.quantity) {
        needsUpdate = true;
        reason = "Component stock insufficient";
        break;
      }

      // Check if cost has changed significantly
      if (invData && comp.unit_cost && Math.abs((invData.unit_cost || 0) - comp.unit_cost) / comp.unit_cost > 0.1) {
        needsUpdate = true;
        reason = "Component costs have changed";
        break;
      }
    }

    // 3️⃣ Check operations for missing data
    for (const op of operations) {
      const totalCost = (op.labor_cost || 0) + (op.machine_cost || 0) + (op.overhead_cost || 0);
      if (totalCost === 0 || ((op.setup_time || 0) === 0 && (op.run_time || 0) === 0)) {
        needsUpdate = true;
        reason = reason || "Operation data incomplete";
        break;
      }
    }

    return { hasBOM: true, needsUpdate, reason: needsUpdate ? reason : "BOM is up to date" };
  } catch (error) {
    console.error("Error checking BOM status:", error);
    return { hasBOM: false, needsUpdate: false, reason: "Error checking BOM" };
  }
};


  // Validation functions for each tab
  const validateCustomerTab = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.customerName?.trim()) {
      errors.customerName = "Customer name is required";
    }
    if (!formData.contactPerson?.trim()) {
      errors.contactPerson = "Contact person is required";
    }
    if (!formData.contactNumber?.trim()) {
      errors.contactNumber = "Contact number is required";
    }
    if (!formData.location?.trim()) {
      errors.location = "Location is required";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateOrderTab = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.orderType?.trim()) {
      errors.orderType = "Order type is required";
    }
    if (!formData.orderDate?.trim()) {
      errors.orderDate = "Order date is required";
    }
    if (!formData.expectedDeliveryDate?.trim()) {
      errors.expectedDeliveryDate = "Expected delivery date is required";
    } else if (formData.orderDate && formData.expectedDeliveryDate) {
      // Check if expected delivery date is not earlier than order date
      const orderDate = new Date(formData.orderDate);
      const deliveryDate = new Date(formData.expectedDeliveryDate);
      if (deliveryDate < orderDate) {
        errors.expectedDeliveryDate = "Expected delivery date cannot be earlier than order date";
      }
    }
    if (!formData.priority?.trim()) {
      errors.priority = "Priority is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateItemsTab = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (lineItems.length === 0) {
      errors.lineItems = "At least one item is required";
      toast({
        title: "Validation Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
    } else {
      // Validate each line item
      let hasInvalidItem = false;
      lineItems.forEach((item, index) => {
        if (!item.itemType) {
          errors[`item_${index}_itemType`] = "Item type is required";
          hasInvalidItem = true;
        }
        if (!item.itemCode) {
          errors[`item_${index}_itemCode`] = "Item code is required";
          hasInvalidItem = true;
        }
        if (!item.quantityOrdered || item.quantityOrdered <= 0) {
          errors[`item_${index}_quantity`] = "Quantity must be greater than 0";
          hasInvalidItem = true;
        }
      });

      if (hasInvalidItem) {
        toast({
          title: "Validation Error",
          description: "Please fill all required fields for each item",
          variant: "destructive",
        });
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateDeliveryTab = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.dispatchMode?.trim()) {
      errors.dispatchMode = "Dispatch mode is required";
    }
    if (!formData.expectedDispatchDate?.trim()) {
      errors.expectedDispatchDate = "Expected dispatch date is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateCurrentTab = (): boolean => {
    switch (currentTab) {
      case "customer":
        return validateCustomerTab();
      case "order":
        return validateOrderTab();
      case "items":
        return validateItemsTab();
      case "delivery":
        return validateDeliveryTab();
      case "payment":
        return true; // Payment tab has no required fields
      default:
        return true;
    }
  };

  const handleCreateOrder = async () => {
    if (!formData.customerName || !formData.orderType) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Customer Name, Order Type).",
        variant: "destructive",
      });
      return;
    }

    // Check for stock validation and warn about low stock
    const itemsWithInsufficientStock = lineItems.filter((item) => {
      if (item.quantityOrdered <= 0) return false;
      const inventoryItem = inventoryItems.find((i: any) => i.item_code === item.itemCode);
      const availableStock = inventoryItem?.available_quantity || 0;
      return availableStock < item.quantityOrdered;
    });

    const itemsBelowReorder = lineItems.filter((item) => {
      if (item.quantityOrdered <= 0) return false;
      const inventoryItem = inventoryItems.find((i: any) => i.item_code === item.itemCode);
      const availableStock = inventoryItem?.available_quantity || 0;
      const reorderPoint = inventoryItem?.reorder_point || 0;
      return availableStock < reorderPoint && availableStock >= item.quantityOrdered;
    });

    // Show warning for insufficient stock but allow order creation
    if (itemsWithInsufficientStock.length > 0) {
      const itemCodes = itemsWithInsufficientStock.map((i) => i.itemCode).join(", ");
      toast({
        title: "Low Stock Warning",
        description: `Items with insufficient stock: ${itemCodes}. Order created - please review inventory.`,
        variant: "default",
      });
    }

    // Show warning for items below reorder point
    if (itemsBelowReorder.length > 0) {
      const itemCodes = itemsBelowReorder.map((i) => i.itemCode).join(", ");
      toast({
        title: "Reorder Point Warning",
        description: `Items below reorder point: ${itemCodes}. Consider restocking.`,
        variant: "default",
      });
    }

    const totalAmount = lineItems.reduce((sum, item) => sum + item.totalAmount, 0);

    const newOrder: Order = {
      id: generateSONumber(),
      orderDate: formData.orderDate,
      orderType: formData.orderType,
      customer: formData.customerName,
      contactPerson: formData.contactPerson,
      contactNumber: formData.contactNumber,
      email: formData.email,
      billingAddress: formData.billingAddress,
      shippingAddress: formData.shippingAddress,
      referenceNo: formData.referenceNo,
      priority: formData.priority,
      remarks: formData.remarks,
      items: lineItems,
      dispatchMode: formData.dispatchMode,
      transporterName: formData.transporterName,
      vehicleNo: formData.vehicleNo,
      expectedDispatchDate: formData.expectedDispatchDate,
      deliveryStatus: formData.deliveryStatus,
      warehouseLocation: formData.warehouseLocation,
      location: formData.location,
      paymentType: formData.paymentType,
      paymentTerms: formData.paymentTerms,
      advanceAmount: formData.advanceAmount,
      balanceAmount: totalAmount - formData.advanceAmount,
      invoiceRequired: formData.invoiceRequired,
      status: "Awaiting Confirmation",
    };

    // Update allocated quantity in inventory for each line item (orders use allocated)
    for (const item of lineItems) {
  if (item.itemCode && item.quantityOrdered > 0) {
    try {
      // 1️⃣ Fetch current allocated quantity from your API
      const stockResponse = await axios.get("/api/inventory-stock", {
        params: { item_code: item.itemCode },
      });

      const currentStock = stockResponse.data[0]; // assuming API returns an array
      const currentAllocated = currentStock?.allocated_quantity || 0;

      // 2️⃣ Update allocated quantity via API
      await axios.put(`/api/inventory-stock/${currentStock.id}`, {
        allocated_quantity: currentAllocated + item.quantityOrdered,
      });
    } catch (error) {
      console.error(`Error updating inventory for ${item.itemCode}:`, error);
    }
  }
}
    setOrders([...orders, newOrder]);
    setUsedItemCodes(new Set());

    // Clear saved draft after successful order creation
    localStorage.removeItem("orderFormDraft");

    toast({
      title: "Sales Order Created",
      description: `${newOrder.id} has been created and awaiting confirmation.`,
    });

    setFormData({
      customerName: "",
      customerCode: "",
      contactPerson: "",
      contactNumber: "",
      email: "",
      billingAddress: "",
      shippingAddress: "",
      orderNo: generateSONumber(),
      orderDate: new Date().toISOString().split("T")[0],
      expectedDeliveryDate: "",
      orderType: "Sales Order",
      referenceNo: "",
      priority: "Normal",
      remarks: "",
      dispatchMode: "Courier",
      transporterName: "",
      vehicleNo: "",
      expectedDispatchDate: "",
      deliveryStatus: "Awaiting",
      warehouseLocation: "",
      location: "",
      paymentType: "Credit",
      paymentTerms: "Net 30 days",
      advanceAmount: 0,
      balanceAmount: 0,
      invoiceRequired: "Yes",
    });
    setLineItems([
      {
        id: "1",
        itemType: "",
        itemCode: "",
        itemName: "",
        uom: "pcs",
        quantityOrdered: 0,
        availableStock: 0,
        rackLocation: "",
        batchNo: "",
        expiryDate: "",
        rate: 0,
        tax: 18,
        totalAmount: 0,
        stockValidated: false,
      },
    ]);
    setIsDialogOpen(false);
    setCurrentTab("customer");
    setCompletedTabs(new Set());
  };

  // Export to PDF (uses browser print)
  const exportToPDF = () => {
    toast({
      title: "Export Started",
      description: "Opening print dialog...",
    });
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Print orders
  const handlePrint = () => {
    window.print();
  };

  // Export to Excel (XLSX)
  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = sortedOrders.map((order) => ({
        "Order ID": order.id,
        "Order Date": order.orderDate,
        "Order Type": order.orderType,
        Customer: order.customer,
        "Contact Person": order.contactPerson,
        "Contact Number": order.contactNumber,
        Email: order.email,
        Location: order.location,
        "Reference No": order.referenceNo,
        Priority: order.priority,
        Status: order.status,
        "Total Items": order.items.length,
        "Dispatch Mode": order.dispatchMode,
        "Expected Dispatch": order.expectedDispatchDate,
        "Delivery Status": order.deliveryStatus,
        "Payment Type": order.paymentType,
        "Payment Terms": order.paymentTerms,
        "Advance Amount": order.advanceAmount,
        "Balance Amount": order.balanceAmount,
        "Invoice Required": order.invoiceRequired,
        Remarks: order.remarks,
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Order ID
        { wch: 12 }, // Order Date
        { wch: 15 }, // Order Type
        { wch: 20 }, // Customer
        { wch: 15 }, // Contact Person
        { wch: 15 }, // Contact Number
        { wch: 25 }, // Email
        { wch: 15 }, // Location
        { wch: 15 }, // Reference No
        { wch: 10 }, // Priority
        { wch: 15 }, // Status
        { wch: 12 }, // Total Items
        { wch: 15 }, // Dispatch Mode
        { wch: 15 }, // Expected Dispatch
        { wch: 15 }, // Delivery Status
        { wch: 12 }, // Payment Type
        { wch: 15 }, // Payment Terms
        { wch: 15 }, // Advance Amount
        { wch: 15 }, // Balance Amount
        { wch: 15 }, // Invoice Required
        { wch: 30 }, // Remarks
      ];
      ws["!cols"] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Orders");

      // Generate filename with current date
      const date = new Date().toISOString().split("T")[0];
      const filename = `Orders_${date}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Complete",
        description: `Orders exported to ${filename} successfully.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export orders to Excel.",
        variant: "destructive",
      });
    }
  };

const handleAIInsights = async () => {
  setIsLoadingInsights(true);
  setShowInsights(true);
  setInsights("");

  try {
    // Call your Laravel API endpoint for AI insights
    const response = await axios.post("/api/order-insights", {
      orders: sortedOrders,
    });

    const data = response.data;

    if (!data || !data.insights) {
      toast({
        title: "AI Insights Failed",
        description: "Failed to generate insights",
        variant: "destructive",
      });
      setShowInsights(false);
      return;
    }

    setInsights(data.insights);
    toast({
      title: "AI Insights Generated",
      description: "Successfully analyzed your orders.",
    });
  } catch (error: any) {
    console.error("Error generating AI insights:", error);
    toast({
      title: "AI Insights Failed",
      description: error?.response?.data?.message || "Failed to generate insights",
      variant: "destructive",
    });
    setShowInsights(false);
  } finally {
    setIsLoadingInsights(false);
  }
};

  // Import from Excel
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "Import Started",
        description: `Importing ${file.name}...`,
      });
      // Import logic would go here
      setTimeout(() => {
        toast({
          title: "Import Complete",
          description: "Orders imported successfully.",
        });
      }, 1000);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      "Awaiting Confirmation": "secondary",
      Pending: "secondary",
      Processing: "default",
      Shipped: "outline",
      Delivered: "outline",
      Packed: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      Urgent: "text-destructive",
      High: "text-destructive",
      Normal: "text-muted-foreground",
      Scheduled: "text-muted-foreground",
    };
    return <span className={`font-medium ${colors[priority]}`}>{priority}</span>;
  };

  // Handle order status change
const handleOrderStatusChange = async (orderId: string, newStatus: string) => {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  const oldStatus = order.status;

  try {
    // If moving from "Awaiting Confirmation" to "Processing", move from allocated to committed
    if (oldStatus === "Awaiting Confirmation" && newStatus === "Processing") {
      for (const item of order.items) {
        if (item.itemCode && item.quantityOrdered > 0) {
          // Call your API to get current inventory for the item
          const { data: currentStock } = await axios.get(`/api/inventory-stock/${item.itemCode}`);

          const currentAllocated = currentStock?.allocated_quantity || 0;
          const currentCommitted = currentStock?.committed_quantity || 0;

          // Call API to update allocated and committed quantities
          await axios.put(`/api/inventory-stock/${item.itemCode}`, {
            allocated_quantity: Math.max(0, currentAllocated - item.quantityOrdered),
            committed_quantity: currentCommitted + item.quantityOrdered,
          });
        }
      }

      toast({
        title: "Status Updated",
        description: `Order ${orderId} moved to Processing. Quantities updated from allocated to committed.`,
      });
    }

    // Update order status in local state
    setOrders((prevOrders) =>
      prevOrders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    // Optionally, update order status in backend
    await axios.put(`/api/orders/${orderId}/status`, { status: newStatus });
  } catch (error: any) {
    console.error("Error updating order status:", error);
    toast({
      title: "Status Update Failed",
      description: error?.response?.data?.message || "Failed to update order status",
      variant: "destructive",
    });
  }
};

  const handleSort = (field: "date" | "amount" | "customer" | "status") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: "date" | "amount" | "customer" | "status") => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4 inline" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    );
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "Open" ? order.status !== "Delivered" : order.status === "Delivered";

    // Date range filter
    const orderDate = new Date(order.orderDate);
    const matchesDateRange = (!startDate || orderDate >= startDate) && (!endDate || orderDate <= endDate);

    // Amount range filter
    const orderTotal = order.items?.reduce((sum, item) => sum + item.totalAmount, 0) || 0;
    const matchesAmountRange =
      (!minAmount || orderTotal >= parseFloat(minAmount)) && (!maxAmount || orderTotal <= parseFloat(maxAmount));

    // Delivery status filter
    const matchesDeliveryStatus = deliveryStatusFilter === "all" || order.deliveryStatus === deliveryStatusFilter;

    return matchesSearch && matchesStatus && matchesDateRange && matchesAmountRange && matchesDeliveryStatus;
  });

  // Apply sorting
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortField) return 0;

    let comparison = 0;

    switch (sortField) {
      case "date":
        comparison = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
        break;
      case "amount":
        const aTotal = a.items?.reduce((sum, item) => sum + item.totalAmount, 0) || 0;
        const bTotal = b.items?.reduce((sum, item) => sum + item.totalAmount, 0) || 0;
        comparison = aTotal - bTotal;
        break;
      case "customer":
        comparison = a.customer.localeCompare(b.customer);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filterStatus,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    deliveryStatusFilter,
    sortField,
    sortDirection,
  ]);

  const totalAmount = sortedOrders.reduce((sum, order) => {
    return sum + (order.items?.reduce((itemSum, item) => itemSum + item.totalAmount, 0) || 0);
  }, 0);

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAllOrders = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  };

 // console.warn({lineItems})
  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Main Module Tabs */}
        <div className="bg-background border-b border-border px-6 py-2">
          <Tabs value={mainTab} onValueChange={setMainTab}>
            <TabsList className="bg-muted">
              <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Orders
              </TabsTrigger>
              <TabsTrigger value="packages" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Packages
              </TabsTrigger>
              <TabsTrigger value="refunds" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <RotateCcw className="h-4 w-4 mr-1" />
                Refunds
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {mainTab === "packages" ? (
          <div className="flex-1 p-6 overflow-auto">
            <OrderPackagesTab orders={orders} />
          </div>
        ) : mainTab === "refunds" ? (
          <div className="flex-1 p-6 overflow-auto">
            <RefundsTab
              refunds={refunds}
              onUpdateRefund={(refundId, updates) => {
                setRefunds((prev) =>
                  prev.map((r) => (r.id === refundId ? { ...r, ...updates } : r))
                );
              }}
              onRestoreInventory={async (refund) => {
                // Restore inventory for items marked for restoration
              
                for (const item of refund.items) {
                  if (item.restoreInventory && item.quantityRefunded > 0) {
                    try {
                      // 1️⃣ Get current inventory from API
                      const { data: currentStock } = await axios.get(`/api/inventory-stock/${item.itemCode}`);

                      if (currentStock) {
                        const currentQty = currentStock.quantity_on_hand || 0;
                        const currentAllocated = currentStock.allocated_quantity || 0;

                        // 2️⃣ Update inventory via API
                        await axios.put(`/api/inventory-stock/${item.itemCode}`, {
                          quantity_on_hand: currentQty + item.quantityRefunded,
                          allocated_quantity: Math.max(0, currentAllocated - item.quantityRefunded),
                        });

                        // 3️⃣ Record stock transaction via API
                        await axios.post(`/api/stock-transactions`, {
                          item_code: item.itemCode,
                          transaction_type: "Refund Return",
                          quantity: item.quantityRefunded,
                          reference_type: "Refund",
                          reference_number: refund.refundNumber,
                          notes: `Refund from order ${refund.orderId}`,
                        });
                      }
                    } catch (error: any) {
                      console.error(`Error processing refund for item ${item.itemCode}:`, error);
                      toast({
                        title: "Refund Processing Failed",
                        description:
                          error?.response?.data?.message || `Failed to process refund for ${item.itemCode}`,
                        variant: "destructive",
                      });
                    }
                  }
                }               
              }}
            />
          </div>
        ) : (
        <>
        {/* Filter Bar */}
        <div className="bg-background border-b border-border px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <FilterBar
              filters={["Open", "Done"]}
              activeFilter={filterStatus}
              onFilterChange={(filter) => setFilterStatus(filter as "Open" | "Done")}
            />
            <div className="flex items-center gap-3">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-48">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All locations">All locations</SelectItem>
                  <SelectItem value="Warehouse A">Warehouse A</SelectItem>
                  <SelectItem value="Warehouse B">Warehouse B</SelectItem>
                </SelectContent>
              </Select>
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) {
                    setCurrentTab("customer");
                    setCompletedTabs(new Set());
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setCurrentTab("customer");
                      setCompletedTabs(new Set());
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Sales order
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Order</DialogTitle>
                  </DialogHeader>

                  <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="customer" className="flex-col gap-1 h-auto py-2">
                        <div className="flex items-center gap-2">
                          <span>Customer Info</span>
                          {completedTabs.has("customer") && <Check className="h-3 w-3" />}
                        </div>
                        <div className="w-full space-y-1">
                          <Progress value={getTabProgress("customer").percentage} className="h-1" />
                          <span className="text-[10px] text-muted-foreground">
                            {getTabProgress("customer").completed}/{getTabProgress("customer").total}
                          </span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger value="order" className="flex-col gap-1 h-auto py-2">
                        <div className="flex items-center gap-2">
                          <span>Order Details</span>
                          {completedTabs.has("order") && <Check className="h-3 w-3" />}
                        </div>
                        <div className="w-full space-y-1">
                          <Progress value={getTabProgress("order").percentage} className="h-1" />
                          <span className="text-[10px] text-muted-foreground">
                            {getTabProgress("order").completed}/{getTabProgress("order").total}
                          </span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger value="items" className="flex-col gap-1 h-auto py-2">
                        <div className="flex items-center gap-2">
                          <span>Item Details</span>
                          {completedTabs.has("items") && <Check className="h-3 w-3" />}
                        </div>
                        <div className="w-full space-y-1">
                          <Progress value={getTabProgress("items").percentage} className="h-1" />
                          <span className="text-[10px] text-muted-foreground">
                            {getTabProgress("items").completed}/{getTabProgress("items").total}
                          </span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger value="delivery" className="flex-col gap-1 h-auto py-2">
                        <div className="flex items-center gap-2">
                          <span>Delivery</span>
                          {completedTabs.has("delivery") && <Check className="h-3 w-3" />}
                        </div>
                        <div className="w-full space-y-1">
                          <Progress value={getTabProgress("delivery").percentage} className="h-1" />
                          <span className="text-[10px] text-muted-foreground">
                            {getTabProgress("delivery").completed}/{getTabProgress("delivery").total}
                          </span>
                        </div>
                      </TabsTrigger>
                      <TabsTrigger value="payment" className="flex-col gap-1 h-auto py-2">
                        <div className="flex items-center gap-2">
                          <span>Payment</span>
                          {completedTabs.has("payment") && <Check className="h-3 w-3" />}
                        </div>
                        <div className="w-full space-y-1">
                          <Progress value={getTabProgress("payment").percentage} className="h-1" />
                          <span className="text-[10px] text-muted-foreground">
                            {getTabProgress("payment").completed}/{getTabProgress("payment").total}
                          </span>
                        </div>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="customer" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                          <Label>Customer Name *</Label>
                          <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={customerPopoverOpen}
                                className={cn(
                                  "w-full justify-between",
                                  fieldErrors.customerName && "border-destructive",
                                )}
                              >
                                {formData.customerName || "Select customer..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0 bg-background z-50">
                              <Command>
                                <CommandInput placeholder="Search customer..." />
                                <CommandList>
                                  <CommandEmpty>No customer found.</CommandEmpty>
                                  <CommandGroup>
                                    {customers.map((customer: any) => (
                                      <CommandItem
                                        key={customer.id}
                                        value={customer.customer_name}
                                        onSelect={() => {
                                          setFormData({
                                            ...formData,
                                            customerName: customer.customer_name,
                                            customerCode: customer.customer_code || "",
                                            email: customer.email || "",
                                            contactNumber: customer.phone || "",
                                            contactPerson: customer.contact_person || "",
                                            billingAddress: customer.billing_address || "",
                                            shippingAddress: customer.shipping_address || "",
                                          });
                                          setCustomerPopoverOpen(false);
                                          // Clear error when value is selected
                                          if (fieldErrors.customerName) {
                                            setFieldErrors({ ...fieldErrors, customerName: "" });
                                          }
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            formData.customerName === customer.customer_name
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {customer.customer_name} ({customer.customer_code})
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {fieldErrors.customerName && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.customerName}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customerCode">Customer Code / ID</Label>
                          <Input
                            id="customerCode"
                            value={formData.customerCode}
                            onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactPerson">Contact Person *</Label>
                          <Input
                            id="contactPerson"
                            value={formData.contactPerson}
                            onChange={(e) => {
                              setFormData({ ...formData, contactPerson: e.target.value });
                              if (fieldErrors.contactPerson) {
                                setFieldErrors({ ...fieldErrors, contactPerson: "" });
                              }
                            }}
                            className={fieldErrors.contactPerson ? "border-destructive" : ""}
                          />
                          {fieldErrors.contactPerson && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.contactPerson}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contactNumber">Contact Number *</Label>
                          <Input
                            id="contactNumber"
                            value={formData.contactNumber}
                            onChange={(e) => {
                              setFormData({ ...formData, contactNumber: e.target.value });
                              if (fieldErrors.contactNumber) {
                                setFieldErrors({ ...fieldErrors, contactNumber: "" });
                              }
                            }}
                            className={fieldErrors.contactNumber ? "border-destructive" : ""}
                          />
                          {fieldErrors.contactNumber && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.contactNumber}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="email">Email ID</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => {
                              setFormData({ ...formData, email: e.target.value });
                              if (fieldErrors.email) {
                                setFieldErrors({ ...fieldErrors, email: "" });
                              }
                            }}
                            className={fieldErrors.email ? "border-destructive" : ""}
                          />
                          {fieldErrors.email && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.email}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="billingAddress">Billing Address</Label>
                          <Textarea
                            id="billingAddress"
                            value={formData.billingAddress}
                            onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="shippingAddress">Shipping Address</Label>
                          <Textarea
                            id="shippingAddress"
                            value={formData.shippingAddress}
                            onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="location">Location *</Label>
                          <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => {
                              setFormData({ ...formData, location: e.target.value });
                              if (fieldErrors.location) {
                                setFieldErrors({ ...fieldErrors, location: "" });
                              }
                            }}
                            placeholder="Enter location"
                            className={fieldErrors.location ? "border-destructive" : ""}
                          />
                          {fieldErrors.location && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="order" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="orderNo">Order ID</Label>
                          <Input id="orderNo" value={formData.orderNo} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="orderType">Order Type *</Label>
                          <Select
                            value={formData.orderType}
                            onValueChange={(value) => {
                              setFormData({ ...formData, orderType: value });

                              // Auto-update item type for all line items based on order type
                              const defaultItemType =
                                value === "Sales" ? "Component" : value === "Manufacturing" ? "Product" : "";
                              if (defaultItemType) {
                                setLineItems(lineItems.map((item) => ({ ...item, itemType: defaultItemType })));
                              }

                              if (fieldErrors.orderType) {
                                setFieldErrors({ ...fieldErrors, orderType: "" });
                              }
                            }}
                          >
                            <SelectTrigger className={fieldErrors.orderType ? "border-destructive" : ""}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="Sales">Sales</SelectItem>
                              <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                            </SelectContent>
                          </Select>
                          {fieldErrors.orderType && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.orderType}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="orderDate">Order Date *</Label>
                          <Input
                            id="orderDate"
                            type="date"
                            value={formData.orderDate}
                            onChange={(e) => {
                              setFormData({ ...formData, orderDate: e.target.value });
                              if (fieldErrors.orderDate) {
                                setFieldErrors({ ...fieldErrors, orderDate: "" });
                              }
                            }}
                            className={fieldErrors.orderDate ? "border-destructive" : ""}
                          />
                          {fieldErrors.orderDate && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.orderDate}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expectedDeliveryDate">Expected Delivery Date *</Label>
                          <Input
                            id="expectedDeliveryDate"
                            type="date"
                            value={formData.expectedDeliveryDate}
                            onChange={(e) => {
                              setFormData({ ...formData, expectedDeliveryDate: e.target.value });
                              if (fieldErrors.expectedDeliveryDate) {
                                setFieldErrors({ ...fieldErrors, expectedDeliveryDate: "" });
                              }
                            }}
                            className={fieldErrors.expectedDeliveryDate ? "border-destructive" : ""}
                          />
                          {fieldErrors.expectedDeliveryDate && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.expectedDeliveryDate}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="referenceNo">Reference No.</Label>
                          <Input
                            id="referenceNo"
                            value={formData.referenceNo}
                            onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority *</Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value) => {
                              setFormData({ ...formData, priority: value });
                              if (fieldErrors.priority) {
                                setFieldErrors({ ...fieldErrors, priority: "" });
                              }
                            }}
                          >
                            <SelectTrigger className={fieldErrors.priority ? "border-destructive" : ""}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="Normal">Normal</SelectItem>
                              <SelectItem value="Urgent">Urgent</SelectItem>
                              <SelectItem value="Scheduled">Scheduled</SelectItem>
                            </SelectContent>
                          </Select>
                          {fieldErrors.priority && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.priority}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="remarks">Remarks</Label>
                          <Textarea
                            id="remarks"
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="items" className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Add Items to Order</h3>
                        <Button onClick={addLineItem} size="sm" variant="outline">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Item Row
                        </Button>
                      </div>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {lineItems.map((item, index) => (
                          <Card key={item.id} className="p-4 bg-muted/30">
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-medium text-sm">Item #{index + 1}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLineItem(item.id)}
                                disabled={lineItems.length === 1}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              {/* Item Type Selection */}
                              <div className="space-y-2">
                                <Label>Item Type *</Label>
                                <Select
                                  disabled
                                  value={item.itemType}
                                  onValueChange={(value) => {
                                    updateLineItem(item.id, "itemType", value);
                                    // Reset item code when type changes
                                    if (item.itemCode) {
                                      updateLineItem(item.id, "itemCode", "");
                                    }
                                    // Clear error when value is selected
                                    if (fieldErrors[`item_${index}_itemType`]) {
                                      const newErrors = { ...fieldErrors };
                                      delete newErrors[`item_${index}_itemType`];
                                      setFieldErrors(newErrors);
                                    }
                                  }}
                                >
                                  <SelectTrigger
                                    className={fieldErrors[`item_${index}_itemType`] ? "border-destructive" : ""}
                                  >
                                    <SelectValue placeholder="Select type..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Component">Component</SelectItem>
                                    <SelectItem value="Product">Product</SelectItem>
                                    <SelectItem value="Service">Service</SelectItem>
                                  </SelectContent>
                                </Select>
                                {fieldErrors[`item_${index}_itemType`] && (
                                  <p className="text-sm text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {fieldErrors[`item_${index}_itemType`]}
                                  </p>
                                )}
                              </div>

                              {/* Item Selection Row */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>Item Code *</Label>
                                  {item.itemType === "Product" && (
                                    <div className="flex gap-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={
                                          !itemUsabilityFilter[item.id] || itemUsabilityFilter[item.id] === "all"
                                            ? "default"
                                            : "outline"
                                        }
                                        className="h-7 px-2 text-xs"
                                        onClick={() =>
                                          setItemUsabilityFilter({ ...itemUsabilityFilter, [item.id]: "all" })
                                        }
                                      >
                                        All
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={itemUsabilityFilter[item.id] === "buy" ? "default" : "outline"}
                                        className="h-7 px-2 text-xs"
                                        onClick={() =>
                                          setItemUsabilityFilter({ ...itemUsabilityFilter, [item.id]: "buy" })
                                        }
                                      >
                                        Buy
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={itemUsabilityFilter[item.id] === "make" ? "default" : "outline"}
                                        className="h-7 px-2 text-xs"
                                        onClick={() =>
                                          setItemUsabilityFilter({ ...itemUsabilityFilter, [item.id]: "make" })
                                        }
                                      >
                                        Make
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Popover
                                    open={itemCodePopoverOpen[item.id]}
                                    onOpenChange={(open) =>
                                      setItemCodePopoverOpen({ ...itemCodePopoverOpen, [item.id]: open })
                                    }
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={itemCodePopoverOpen[item.id]}
                                        className={cn(
                                          "w-full justify-between",
                                          fieldErrors[`item_${index}_itemCode`] && "border-destructive",
                                        )}
                                        disabled={!item.itemType}
                                      >
                                        {item.itemCode || (item.itemType ? "Select item..." : "Select type first")}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
  <Command>
    <CommandInput placeholder="Search item..." />
    <CommandList>
      <CommandEmpty>
        <div className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">No item found.</p>
          <Button
            size="sm"
            onClick={() => {
              setCurrentEditingItemId(item.id);
              setCreateItemOpen(true);
              setItemCodePopoverOpen({ ...itemCodePopoverOpen, [item.id]: true });
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Item
          </Button>
        </div>
      </CommandEmpty>

   <CommandGroup>
  {Array.isArray(inventoryItems) &&
    inventoryItems
      .filter((invItem) => {
        if (invItem.item_type !== item.itemType) return false;

        if (item.itemType === "Product") {
          const filter = itemUsabilityFilter[item.id] || "all";
          if (filter === "buy" && !invItem.usability_buy) return false;
          if (filter === "make" && !invItem.usability_make) return false;
        }
        return true;
      })
      .map((invItem, index) => (
        <CommandItem
          key={invItem.id}
          value={String(invItem.itemCode ?? invItem.id ?? `item-${invItem.id}`)}
          onSelect={() => {
            console.log("Selected item:", invItem);

            updateLineItem(item.id, "itemCode", invItem.itemCode ?? "");
            updateLineItem(item.id, "itemName", invItem.itemName ?? "");
            updateLineItem(item.id, "uom", invItem.uom || "pcs");
            updateLineItem(item.id, "rate", invItem.unit_cost || 0);

            setItemCodePopoverOpen(prev => ({ ...prev, [item.id]: false }));

            const errorKey = `item_${index}_itemCode`;
            if (fieldErrors[errorKey]) {
              setFieldErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
              });
            }
          }}
        >
          <Check
            className={cn(
              "mr-2 h-4 w-4",
              item.itemCode === invItem.itemCode ? "opacity-100" : "opacity-0"
            )}
          />
          <div>
            <div className="font-medium">{invItem.itemCode || "— no code —"}</div>
            <div className="text-sm text-muted-foreground">{invItem.itemName || "— no name —"}</div>
          </div>
        </CommandItem>
      ))}
</CommandGroup>
    </CommandList>
  </Command>
</PopoverContent>


                                  </Popover>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" onClick={() => setCreateItemOpen(true)}>
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Add New Item</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                {fieldErrors[`item_${index}_itemCode`] && (
                                  <p className="text-sm text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {fieldErrors[`item_${index}_itemCode`]}
                                  </p>
                                )}
                              </div>

                               <div className="space-y-2">
                                <Label>Item Name</Label>
                                <div className="flex gap-2 items-center">
                                  <Input value={item.itemName} disabled className="bg-muted flex-1" />
                                  {item.itemCode && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => {
                                              navigate("/api/bom", {
                                                state: { itemCode: item.itemCode, itemName: item.itemName },
                                              });
                                            }}
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>View/Create BOM</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>


                              <div className="space-y-2">
                                <Label>Unit / UOM</Label>
                                <Input value={item.uom} disabled className="bg-muted" />
                              </div>

                              {/* Stock and Quantity Row */}
                              <div className="space-y-2">
                                <Label>Available Stock</Label>
                                <div className="flex items-center gap-2">
                                  <Input type="number" value={item.availableStock} disabled className="bg-muted" />
                                  {item.quantityOrdered > 0 && item.availableStock >= item.quantityOrdered && (
                                    <Badge variant="outline" className="text-green-600 whitespace-nowrap">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      In Stock
                                    </Badge>
                                  )}
                                  {item.quantityOrdered > 0 && item.availableStock < item.quantityOrdered && (
                                    <>
                                      <Badge variant="destructive" className="whitespace-nowrap">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Low Stock
                                      </Badge>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setRfqItem({
                                            item_code: item.itemCode,
                                            item_name: item.itemName,
                                            description: item.itemName,
                                            quantity: item.quantityOrdered - item.availableStock,
                                          });
                                          setRfqDialogOpen(true);
                                        }}
                                        className="h-7"
                                      >
                                        Buy
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Quantity *</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantityOrdered || ""}
                                  onChange={(e) => {
                                    updateLineItem(item.id, "quantityOrdered", Number(e.target.value));
                                    // Clear error when value is entered
                                    if (fieldErrors[`item_${index}_quantity`]) {
                                      const newErrors = { ...fieldErrors };
                                      delete newErrors[`item_${index}_quantity`];
                                      setFieldErrors(newErrors);
                                    }
                                  }}
                                  placeholder="0"
                                  className={fieldErrors[`item_${index}_quantity`] ? "border-destructive" : ""}
                                />
                                {fieldErrors[`item_${index}_quantity`] && (
                                  <p className="text-sm text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {fieldErrors[`item_${index}_quantity`]}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label>Location</Label>
                                <Input value={item.rackLocation} disabled className="bg-muted" />
                              </div>

                              {/* Pricing Row */}
                              <div className="space-y-2">
                                <Label>Rate / Price (₹)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.rate || ""}
                                  onChange={(e) => updateLineItem(item.id, "rate", Number(e.target.value))}
                                  placeholder="0.00"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Tax (GST %)</Label>
                                <Select
                                  value={String(item.tax)}
                                  onValueChange={(value) => updateLineItem(item.id, "tax", Number(value))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">0% (Exempt)</SelectItem>
                                    <SelectItem value="5">5% GST</SelectItem>
                                    <SelectItem value="12">12% GST</SelectItem>
                                    <SelectItem value="18">18% GST</SelectItem>
                                    <SelectItem value="28">28% GST</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Total Amount (₹)</Label>
                                <Input
                                  type="number"
                                  value={item.totalAmount.toFixed(2)}
                                  disabled
                                  className="bg-muted font-semibold"
                                />
                              </div>
                            </div>

                            {/* BOM Components Section - Only for Product items */}
                            {item.itemType === "Product" && item.itemCode && (
                              <div className="mt-6 pt-6 border-t">
                                <div className="mb-4">
                                  <h4 className="text-sm font-semibold mb-1">Line Details</h4>
                                  <p className="text-xs text-muted-foreground">Bill of Materials Components</p>
                                </div>

                                {item.bomLoading && (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                      <span className="text-sm">Loading BOM components...</span>
                                    </div>
                                  </div>
                                )}

                                {!item.bomLoading && item.noBOM && (
                                  <div className="flex items-center justify-center py-8 border rounded-md bg-muted/50">
                                    <div className="text-center">
                                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                      <p className="text-sm font-medium text-muted-foreground">
                                        No BOM is defined for this product.
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {!item.bomLoading &&
                                  !item.noBOM &&
                                  item.bomComponents &&
                                  item.bomComponents.length > 0 && (
                                    <div className="border rounded-md overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-muted/50">
                                            <TableHead className="w-[140px]">Related Item</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="w-[80px]">UOM</TableHead>
                                            <TableHead className="w-[120px]">Type</TableHead>
                                            <TableHead className="w-[100px] text-right">Available Qty</TableHead>
                                            <TableHead className="w-[100px] text-right">Required Qty</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {item.bomComponents.map((comp, idx) => (
                                            <TableRow key={idx}>
                                              <TableCell className="font-mono text-sm">{comp.component}</TableCell>
                                              <TableCell className="text-sm">{comp.description}</TableCell>
                                              <TableCell className="text-sm">{comp.uom}</TableCell>
                                              <TableCell className="text-sm">{comp.type}</TableCell>
                                              <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                  <span className="text-sm">{comp.availableQty}</span>
                                                  {comp.availableQty < comp.requiredQty && (
                                                    <Badge variant="destructive" className="text-xs">
                                                      Low
                                                    </Badge>
                                                  )}
                                                </div>
                                              </TableCell>
                                              <TableCell className="text-right font-medium text-sm">
                                                {comp.requiredQty}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="delivery" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dispatchMode">Dispatch Mode *</Label>
                          <Select
                            value={formData.dispatchMode}
                            onValueChange={(value) => {
                              setFormData({ ...formData, dispatchMode: value });
                              if (fieldErrors.dispatchMode) {
                                setFieldErrors({ ...fieldErrors, dispatchMode: "" });
                              }
                            }}
                          >
                            <SelectTrigger className={fieldErrors.dispatchMode ? "border-destructive" : ""}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="Courier">Courier</SelectItem>
                              <SelectItem value="Transport">Transport</SelectItem>
                              <SelectItem value="Pickup">Pickup</SelectItem>
                            </SelectContent>
                          </Select>
                          {fieldErrors.dispatchMode && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.dispatchMode}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="transporterName">Transporter Name</Label>
                          <Input
                            id="transporterName"
                            value={formData.transporterName}
                            onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vehicleNo">Vehicle No.</Label>
                          <Input
                            id="vehicleNo"
                            value={formData.vehicleNo}
                            onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="expectedDispatchDate">Expected Dispatch Date *</Label>
                          <Input
                            id="expectedDispatchDate"
                            type="date"
                            value={formData.expectedDispatchDate}
                            onChange={(e) => {
                              setFormData({ ...formData, expectedDispatchDate: e.target.value });
                              if (fieldErrors.expectedDispatchDate) {
                                setFieldErrors({ ...fieldErrors, expectedDispatchDate: "" });
                              }
                            }}
                            className={fieldErrors.expectedDispatchDate ? "border-destructive" : ""}
                          />
                          {fieldErrors.expectedDispatchDate && (
                            <p className="text-sm text-destructive flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {fieldErrors.expectedDispatchDate}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliveryStatus">Delivery Status</Label>
                          <Select
                            value={formData.deliveryStatus}
                            onValueChange={(value) => setFormData({ ...formData, deliveryStatus: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Awaiting">Awaiting</SelectItem>
                              <SelectItem value="Packed">Packed</SelectItem>
                              <SelectItem value="Shipped">Shipped</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="warehouseLocation">Warehouse Location</Label>
                          <Input
                            id="warehouseLocation"
                            value={formData.warehouseLocation}
                            onChange={(e) => setFormData({ ...formData, warehouseLocation: e.target.value })}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="payment" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="paymentType">Payment Type *</Label>
                          <Select
                            value={formData.paymentType}
                            onValueChange={(value) => setFormData({ ...formData, paymentType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Credit">Credit</SelectItem>
                              <SelectItem value="Online">Online Transfer</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentTerms">Payment Terms *</Label>
                          <Select
                            value={formData.paymentTerms}
                            onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Immediate">Immediate</SelectItem>
                              <SelectItem value="Net 15 days">Net 15 days</SelectItem>
                              <SelectItem value="Net 30 days">Net 30 days</SelectItem>
                              <SelectItem value="Net 45 days">Net 45 days</SelectItem>
                              <SelectItem value="Net 60 days">Net 60 days</SelectItem>
                              <SelectItem value="Net 90 days">Net 90 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="advanceAmount">Advance Amount</Label>
                          <Input
                            id="advanceAmount"
                            type="number"
                            value={formData.advanceAmount}
                            onChange={(e) => setFormData({ ...formData, advanceAmount: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="invoiceRequired">Invoice Required</Label>
                          <Select
                            value={formData.invoiceRequired}
                            onValueChange={(value) => setFormData({ ...formData, invoiceRequired: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Yes">Yes</SelectItem>
                              <SelectItem value="No">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Clear saved draft when canceling
                        localStorage.removeItem("orderFormDraft");
                        setIsDialogOpen(false);
                        setCurrentTab("customer");
                        setCompletedTabs(new Set());
                      }}
                    >
                      Cancel
                    </Button>
                    {currentTab !== "payment" ? (
                      <Button
                        onClick={() => {
                          // Validate current tab before moving to next
                          if (!validateCurrentTab()) {
                            return;
                          }

                          // Mark current tab as completed
                          setCompletedTabs((prev) => new Set([...prev, currentTab]));

                          // Clear errors
                          setFieldErrors({});

                          // Move to next tab
                          const tabs = ["customer", "order", "items", "delivery", "payment"];
                          const currentIndex = tabs.indexOf(currentTab);
                          if (currentIndex < tabs.length - 1) {
                            setCurrentTab(tabs[currentIndex + 1]);
                          }
                        }}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button onClick={handleCreateOrder} disabled={completedTabs.size < 4}>
                        Create Order
                      </Button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Advanced Filters Collapsible Panel */}
        <div className="bg-background border-b border-border px-6">
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <div className="flex items-center justify-between py-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvancedFilters && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              {(startDate || endDate || minAmount || maxAmount || deliveryStatusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                    setMinAmount("");
                    setMaxAmount("");
                    setDeliveryStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
            <CollapsibleContent className="pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Range Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Order Date Range</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? new Date(startDate).toLocaleDateString() : "From"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? new Date(endDate).toLocaleDateString() : "To"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Amount Range Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Amount Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Delivery Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Delivery Status</Label>
                  <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Transit">In Transit</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{sortedOrders.length} orders</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAIInsights}
                disabled={isLoadingInsights || sortedOrders.length === 0}
              >
                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                AI insights
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={exportToPDF}>
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export to PDF</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={exportToExcel}>
                      <FileSpreadsheet className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export to Excel (XLSX)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handlePrint}>
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Print Orders</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[40px]">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableHead>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedOrders.size === sortedOrders.length && sortedOrders.length > 0}
                      onCheckedChange={toggleAllOrders}
                    />
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("date")} className="h-8 px-2">
                      Created date
                      {getSortIcon("date")}
                    </Button>
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("customer")} className="h-8 px-2">
                      Customer
                      {getSortIcon("customer")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("amount")} className="h-8 px-2">
                      Total amount
                      {getSortIcon("amount")}
                    </Button>
                  </TableHead>
                  <TableHead>Delivery deadline</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Sales items</TableHead>
                  <TableHead>Production</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort("status")} className="h-8 px-2">
                      Delivery
                      {getSortIcon("status")}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Total Row */}
                <TableRow className="font-bold bg-gray-50">
                  <TableCell colSpan={5} className="text-right pr-4">
                    Total:
                  </TableCell>
                  <TableCell>₹{totalAmount.toFixed(2)}</TableCell>
                  <TableCell colSpan={5}></TableCell>
                </TableRow>

                {sortedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order, index) => {
                    const orderTotal = order.items?.reduce((sum, item) => sum + item.totalAmount, 0) || 0;
                    const isOverdue = order.expectedDispatchDate && new Date(order.expectedDispatchDate) < new Date();

                    return (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.has(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                          />
                        </TableCell>
                        <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="link"
                                className="p-0 h-auto text-blue-600"
                                onClick={() => setViewOrder(order)}
                              >
                                {order.id}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Order Details - {order.id}</DialogTitle>
                              </DialogHeader>
                              {viewOrder && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-muted-foreground">Customer</Label>
                                      <p className="font-medium">{viewOrder.customer}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Order Date</Label>
                                      <p className="font-medium">{viewOrder.orderDate}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Status</Label>
                                      <p className="mt-1">{getStatusBadge(viewOrder.status)}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Priority</Label>
                                      <p className="font-medium">{viewOrder.priority}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Location</Label>
                                      <p className="font-medium">{viewOrder.location || "-"}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold mb-3">Order Items</h4>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Item Code</TableHead>
                                          <TableHead>Item Name</TableHead>
                                          <TableHead>Quantity</TableHead>
                                          <TableHead>Rate</TableHead>
                                          <TableHead>Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {Array.isArray(viewOrder.items) &&
                                          viewOrder.items.map((item) => (
                                            <TableRow key={item.id}>
                                              <TableCell>{item.itemCode}</TableCell>
                                              <TableCell>{item.itemName}</TableCell>
                                              <TableCell>{item.quantityOrdered}</TableCell>
                                              <TableCell>₹{item.rate.toFixed(2)}</TableCell>
                                              <TableCell>₹{item.totalAmount.toFixed(2)}</TableCell>
                                            </TableRow>
                                          ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>₹{orderTotal.toFixed(2)}</TableCell>
                        <TableCell className={isOverdue ? "text-red-600" : ""}>
                          {order.expectedDispatchDate ? new Date(order.expectedDispatchDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{order.location || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              order.deliveryStatus === "Delivered"
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : order.deliveryStatus === "Packed"
                                  ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                  : order.deliveryStatus === "Shipped"
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "bg-gray-500 text-white hover:bg-gray-600"
                            }
                          >
                            {order.deliveryStatus === "Awaiting" ? "Expected" : order.deliveryStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleOrderStatusChange(order.id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Awaiting Confirmation">Awaiting Confirmation</SelectItem>
                              <SelectItem value="Processing">Processing</SelectItem>
                              <SelectItem value="Shipped">Shipped</SelectItem>
                              <SelectItem value="Delivered">Delivered</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              order.deliveryStatus === "Delivered"
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : order.deliveryStatus === "Packed"
                                  ? "bg-blue-500 text-white hover:bg-blue-600"
                                  : order.deliveryStatus === "Shipped"
                                    ? "bg-purple-500 text-white hover:bg-purple-600"
                                    : "bg-yellow-500 text-white hover:bg-yellow-600"
                            }
                          >
                            {order.deliveryStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  onClick={() => {
                                    setRefundOrder(order);
                                    setRefundDialogOpen(true);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Create Refund</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredOrders.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}{" "}
                orders
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        {/* AI Insights Sheet */}
        <Sheet open={showInsights} onOpenChange={setShowInsights}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Insights
              </SheetTitle>
              <SheetDescription>AI-powered analysis of your orders</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              {isLoadingInsights ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground">Analyzing your orders...</p>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap">{insights}</div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Create New Item Dialog */}
        <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Item</DialogTitle>
            </DialogHeader>
            <NewItemForm
              onSuccess={(createdItemCode, createdItemName, itemDetails) => {
                setCreateItemOpen(false);
                // If we were editing a specific line item, auto-fill it
                if (currentEditingItemId && createdItemCode) {
                  updateLineItem(currentEditingItemId, "itemCode", createdItemCode);
                }
                setCurrentEditingItemId(null);
                toast({
                  title: "Item Created",
                  description: "New inventory item created successfully. Redirecting to BOM page...",
                });
                // Navigate to BOM page with full order context
                setTimeout(() => {
                  navigate("/bom", {
                    state: {
                      itemCode: createdItemCode,
                      itemName: createdItemName,
                      itemDetails: itemDetails,
                      orderContext: {
                        formData: formData,
                        lineItems: lineItems,
                        currentLineItemId: currentEditingItemId,
                      },
                    },
                  });
                }, 500);
              }}
              onCancel={() => {
                setCreateItemOpen(false);
                setCurrentEditingItemId(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* RFQ Dialog */}
        <Dialog open={rfqDialogOpen} onOpenChange={setRfqDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Request for Quote</DialogTitle>
            </DialogHeader>
            <RFQForm
              initialItem={rfqItem || undefined}
              onSuccess={() => {
                setRfqDialogOpen(false);
                setRfqItem(null);
                toast({
                  title: "Success",
                  description: "RFQ created successfully. You can continue with your order.",
                });
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Refund Dialog */}
        <RefundDialog
          open={refundDialogOpen}
          onOpenChange={setRefundDialogOpen}
          order={refundOrder}
          onRefundCreated={(refund) => {
            setRefunds((prev) => [...prev, refund]);
          }}
        />
        </>
        )}
      </div>
    </Layout>
  );
};

// New Item Form Component
const NewItemForm = ({
  onSuccess,
  onCancel,
}: {
  onSuccess: (itemCode?: string, itemName?: string, itemDetails?: any) => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    itemCode: "",
    itemName: "",
    type: "",
    uom: "",
    serviceCode: "",
    defaultSalesPrice: "",
  });

  const generateItemCode = (type: string) => {
    const prefix = type === "Product" ? "PRD" : "SRV";
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  const handleTypeChange = (type: string) => {
    setFormData({ ...formData, type: type, itemCode: generateItemCode(type) });
  };

  const handleSubmit = async () => {
    if (!formData.itemCode || !formData.itemName || !formData.type || !formData.uom) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Type, Item Name, UOM).",
        variant: "destructive",
      });
      return;
    }

    try {
  const response = await fetch("/api/inventory-stock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      item_code: formData.itemCode,
      item_name: formData.itemName,
      item_type: formData.type,
      description: `${formData.type}${formData.serviceCode ? ` - Service Code: ${formData.serviceCode}` : ""}`,
      location: formData.type === "Product" ? "Main Warehouse" : "Service",
      unit_cost: parseFloat(formData.defaultSalesPrice) || 0,
      quantity_on_hand: 0,
      reorder_point: 0,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    toast({
      title: "Error",
      description: errorData.message || "Failed to create inventory item",
      variant: "destructive",
    });
    return;
  }

  toast({
    title: "Item Created",
    description: `${formData.itemName} has been added to inventory.`,
  });
} catch (error: any) {
  console.error("Error creating inventory item:", error);
  toast({
    title: "Error",
    description: error.message || "Failed to create inventory item",
    variant: "destructive",
  });
}

    onSuccess(formData.itemCode, formData.itemName, {
      type: formData.type,
      uom: formData.uom,
      serviceCode: formData.serviceCode,
      defaultSalesPrice: formData.defaultSalesPrice,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={formData.type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Product">Product</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Item Code *</Label>
          <Input value={formData.itemCode} disabled className="bg-muted" />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Item Name *</Label>
          <Input
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            placeholder="Enter item name"
          />
        </div>
        <div className="space-y-2">
          <Label>UOM (Unit of Measurement) *</Label>
          <Input
            value={formData.uom}
            onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
            placeholder="e.g., Kg, Pcs, Ltr"
          />
        </div>
        <div className="space-y-2">
          <Label>Service Code</Label>
          <Input
            value={formData.serviceCode}
            onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })}
            placeholder="Enter service code"
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Default Sales Price</Label>
          <Input
            type="number"
            value={formData.defaultSalesPrice}
            onChange={(e) => setFormData({ ...formData, defaultSalesPrice: e.target.value })}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save & Create BOM</Button>
      </div>
    </div>
  );
};

export default Orders;
