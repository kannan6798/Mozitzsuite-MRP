import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Menu, X, ChevronDown, Truck, Package, CheckCircle, Barcode, ScanLine, Printer, Filter, Search, FileText, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PackageItem {
  id: string;
  itemName: string;
  sku: string;
  description: string;
  ordered: number;
  packed: number;
  quantityToPack: number;
  uom: string;
  stockOnHand?: number;
}

interface Package {
  id: string;
  customerName: string;
  packageSlip: string;
  salesOrder: string;
  date: string;
  status: "not_shipped" | "shipped" | "delivered";
  items: PackageItem[];
  internalNotes?: string;
  carrier?: string;
  trackingNumber?: string;
}

// Mock data for demonstration
const mockPackages: Package[] = [
  {
    id: "1",
    customerName: "Vincent",
    packageSlip: "PCK-05",
    salesOrder: "SO-05",
    date: "2025-09-30",
    status: "not_shipped",
    items: [],
  },
  {
    id: "2",
    customerName: "Gilda",
    packageSlip: "PCK-00",
    salesOrder: "SO-00",
    date: "2025-10-06",
    status: "shipped",
    items: [],
  },
  {
    id: "3",
    customerName: "Bennett",
    packageSlip: "PCK-04",
    salesOrder: "SO-04",
    date: "2025-08-12",
    status: "shipped",
    items: [],
  },
  {
    id: "4",
    customerName: "Carleton",
    packageSlip: "PCK-06",
    salesOrder: "SO-06",
    date: "2021-09-20",
    status: "shipped",
    items: [],
  },
  {
    id: "5",
    customerName: "Tate",
    packageSlip: "PCK-01",
    salesOrder: "SO-01",
    date: "2025-06-25",
    status: "delivered",
    items: [],
  },
  {
    id: "6",
    customerName: "Josefina",
    packageSlip: "PCK-02",
    salesOrder: "SO-02",
    date: "2025-10-18",
    status: "delivered",
    items: [],
  },
  {
    id: "7",
    customerName: "Pietro",
    packageSlip: "PCK-03",
    salesOrder: "SO-03",
    date: "2024-05-23",
    status: "delivered",
    items: [],
  },
  {
    id: "8",
    customerName: "Ezra",
    packageSlip: "PCK-07",
    salesOrder: "SO-07",
    date: "2025-06-13",
    status: "delivered",
    items: [],
  },
];

// Mock inventory items for barcode scanning
const mockInventoryItems: Record<string, PackageItem> = {
  "SKU-001": {
    id: "scan-1",
    itemName: "Wireless Mouse",
    sku: "SKU-001",
    description: "Ergonomic wireless mouse with USB receiver",
    ordered: 100,
    packed: 0,
    quantityToPack: 1,
    uom: "Pcs",
    stockOnHand: 50,
  },
  "SKU-002": {
    id: "scan-2",
    itemName: "Mechanical Keyboard",
    sku: "SKU-002",
    description: "RGB mechanical keyboard with Cherry MX switches",
    ordered: 50,
    packed: 0,
    quantityToPack: 1,
    uom: "Pcs",
    stockOnHand: 25,
  },
  "SKU-003": {
    id: "scan-3",
    itemName: "USB-C Hub",
    sku: "SKU-003",
    description: "7-in-1 USB-C hub with HDMI and SD card reader",
    ordered: 200,
    packed: 0,
    quantityToPack: 1,
    uom: "Pcs",
    stockOnHand: 100,
  },
};

// Mock items for new package
const mockSalesOrderItems: PackageItem[] = [
  {
    id: "1",
    itemName: "Queen Size Bed",
    sku: "Item 1 sku",
    description: "Mid-century wooden double bed. Scandinavian-style double bed with white blanket and pillows.",
    ordered: 49667,
    packed: 94776,
    quantityToPack: 29324,
    uom: "Ltr",
  },
  {
    id: "2",
    itemName: "Area Rug",
    sku: "Item 2 sku",
    description: "A soft, high-quality area rug to add warmth to any room.",
    ordered: 56431,
    packed: 93852,
    quantityToPack: 14911,
    uom: "Ltr",
  },
  {
    id: "3",
    itemName: "Sofa",
    sku: "Item 5 sku",
    description: "A comfortable, modern sofa with plush cushions.",
    ordered: 54957,
    packed: 36639,
    quantityToPack: 66550,
    uom: "Ltr",
  },
  {
    id: "4",
    itemName: "Sofa",
    sku: "Item 6 sku",
    description: "A comfortable, modern sofa with plush cushions.",
    ordered: 74697,
    packed: 89860,
    quantityToPack: 84612,
    uom: "Ltr",
  },
  {
    id: "5",
    itemName: "Patio Dining Set",
    sku: "Item 7 sku",
    description: "An outdoor dining set with a table and six chairs.",
    ordered: 43546,
    packed: 11821,
    quantityToPack: 58068,
    uom: "Ltr",
    stockOnHand: 13,
  },
  {
    id: "6",
    itemName: "Storage Cabinet",
    sku: "Item 8 sku",
    description: "A versatile storage cabinet with adjustable shelves.",
    ordered: 5088,
    packed: 82000,
    quantityToPack: 47518,
    uom: "Ltr",
    stockOnHand: -26,
  },
];

const PackagesTab = () => {
  const [packages, setPackages] = useState<Package[]>(mockPackages);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [newPackageOpen, setNewPackageOpen] = useState(false);
  const [scanModeActive, setScanModeActive] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("packages");
  
  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCarrier, setFilterCarrier] = useState<string>("all");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  
  // Report state
  const [reportMonth, setReportMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [reportYear, setReportYear] = useState<string>(String(new Date().getFullYear()));
  
  // New package form state
  const [customerName, setCustomerName] = useState("John Smith Customer");
  const [salesOrder, setSalesOrder] = useState("SO-00");
  const [packageSlip, setPackageSlip] = useState("PKG-00028");
  const [packageDate, setPackageDate] = useState(new Date().toISOString().split("T")[0]);
  const [packageItems, setPackageItems] = useState<PackageItem[]>(mockSalesOrderItems);
  const [internalNotes, setInternalNotes] = useState("");

  // Apply filters
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Status filter
      if (filterStatus !== "all" && pkg.status !== filterStatus) return false;
      
      // Carrier filter
      if (filterCarrier !== "all") {
        const pkgCarrier = pkg.carrier || "Other";
        if (pkgCarrier !== filterCarrier) return false;
      }
      
      // Customer filter
      if (filterCustomer && !pkg.customerName.toLowerCase().includes(filterCustomer.toLowerCase())) return false;
      
      // Date range filter
      if (filterDateFrom && pkg.date < filterDateFrom) return false;
      if (filterDateTo && pkg.date > filterDateTo) return false;
      
      return true;
    });
  }, [packages, filterStatus, filterCarrier, filterCustomer, filterDateFrom, filterDateTo]);

  const notShippedPackages = filteredPackages.filter((p) => p.status === "not_shipped");
  const shippedPackages = filteredPackages.filter((p) => p.status === "shipped");
  const deliveredPackages = filteredPackages.filter((p) => p.status === "delivered");

  // Get unique carriers for filter
  const uniqueCarriers = useMemo(() => {
    const carriers = new Set<string>();
    packages.forEach((pkg) => {
      if (pkg.carrier) carriers.add(pkg.carrier);
    });
    return Array.from(carriers);
  }, [packages]);

  // Generate monthly report data
  const monthlyReport = useMemo(() => {
    const month = parseInt(reportMonth);
    const year = parseInt(reportYear);
    
    const monthPackages = packages.filter((pkg) => {
      const date = new Date(pkg.date);
      return date.getMonth() + 1 === month && date.getFullYear() === year;
    });

    const byStatus = {
      not_shipped: monthPackages.filter((p) => p.status === "not_shipped").length,
      shipped: monthPackages.filter((p) => p.status === "shipped").length,
      delivered: monthPackages.filter((p) => p.status === "delivered").length,
    };

    const byCarrier: Record<string, number> = {};
    monthPackages.forEach((pkg) => {
      const carrier = pkg.carrier || "Unassigned";
      byCarrier[carrier] = (byCarrier[carrier] || 0) + 1;
    });

    const byCustomer: Record<string, number> = {};
    monthPackages.forEach((pkg) => {
      byCustomer[pkg.customerName] = (byCustomer[pkg.customerName] || 0) + 1;
    });

    return {
      total: monthPackages.length,
      byStatus,
      byCarrier,
      byCustomer,
      packages: monthPackages,
    };
  }, [packages, reportMonth, reportYear]);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterCarrier("all");
    setFilterCustomer("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  // Focus barcode input when scan mode is activated
  useEffect(() => {
    if (scanModeActive && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [scanModeActive]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const togglePackageSelection = (id: string) => {
    const newSelected = new Set(selectedPackages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPackages(newSelected);
  };

  // Status update functions
  const updatePackageStatus = (packageId: string, newStatus: Package["status"]) => {
    setPackages((prev) =>
      prev.map((pkg) => (pkg.id === packageId ? { ...pkg, status: newStatus } : pkg))
    );
    const statusLabels = {
      not_shipped: "Not Shipped",
      shipped: "Shipped",
      delivered: "Delivered",
    };
    toast.success(`Package status updated to ${statusLabels[newStatus]}`);
  };

  // Shipment dialog state
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false);
  const [selectedPackageForShipment, setSelectedPackageForShipment] = useState<string | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isBulkShipment, setIsBulkShipment] = useState(false);

  const openShipmentDialog = (packageId: string) => {
    setSelectedPackageForShipment(packageId);
    setIsBulkShipment(false);
    setSelectedCarrier("");
    setTrackingNumber("");
    setShipmentDialogOpen(true);
  };

  const openBulkShipmentDialog = () => {
    if (selectedPackages.size === 0) {
      toast.error("Please select packages to ship");
      return;
    }
    setIsBulkShipment(true);
    setSelectedCarrier("");
    setTrackingNumber("");
    setShipmentDialogOpen(true);
  };

  const confirmShipment = () => {
    if (!selectedCarrier) {
      toast.error("Please select a carrier");
      return;
    }
    if (!trackingNumber.trim()) {
      toast.error("Please enter a tracking number");
      return;
    }

    if (isBulkShipment) {
      setPackages((prev) =>
        prev.map((pkg) =>
          selectedPackages.has(pkg.id)
            ? { ...pkg, status: "shipped" as const, carrier: selectedCarrier, trackingNumber: trackingNumber.trim() }
            : pkg
        )
      );
      toast.success(`${selectedPackages.size} package(s) marked as shipped via ${selectedCarrier}`);
      setSelectedPackages(new Set());
    } else if (selectedPackageForShipment) {
      setPackages((prev) =>
        prev.map((pkg) =>
          pkg.id === selectedPackageForShipment
            ? { ...pkg, status: "shipped" as const, carrier: selectedCarrier, trackingNumber: trackingNumber.trim() }
            : pkg
        )
      );
      toast.success(`Package shipped via ${selectedCarrier}`);
    }

    setShipmentDialogOpen(false);
    setSelectedPackageForShipment(null);
    setSelectedCarrier("");
    setTrackingNumber("");
  };

  const markAsDelivered = (packageId: string) => updatePackageStatus(packageId, "delivered");
  const markAsNotShipped = (packageId: string) => {
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === packageId
          ? { ...pkg, status: "not_shipped" as const, carrier: undefined, trackingNumber: undefined }
          : pkg
      )
    );
    toast.success("Package status updated to Not Shipped");
  };

  // Bulk status update (for non-shipped statuses)
  const bulkUpdateStatus = (newStatus: Package["status"]) => {
    if (selectedPackages.size === 0) {
      toast.error("Please select packages to update");
      return;
    }
    
    if (newStatus === "shipped") {
      openBulkShipmentDialog();
      return;
    }
    
    setPackages((prev) =>
      prev.map((pkg) => {
        if (selectedPackages.has(pkg.id)) {
          if (newStatus === "not_shipped") {
            return { ...pkg, status: newStatus, carrier: undefined, trackingNumber: undefined };
          }
          return { ...pkg, status: newStatus };
        }
        return pkg;
      })
    );
    const statusLabels = {
      not_shipped: "Not Shipped",
      shipped: "Shipped",
      delivered: "Delivered",
    };
    toast.success(`${selectedPackages.size} package(s) marked as ${statusLabels[newStatus]}`);
    setSelectedPackages(new Set());
  };

  // Barcode scanning handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedBarcode = barcodeInput.trim().toUpperCase();
    
    if (!trimmedBarcode) return;

    const item = mockInventoryItems[trimmedBarcode];
    if (item) {
      // Check if item already exists in package
      const existingIndex = packageItems.findIndex((i) => i.sku === trimmedBarcode);
      if (existingIndex >= 0) {
        // Increment quantity
        setPackageItems((prev) =>
          prev.map((i, idx) =>
            idx === existingIndex ? { ...i, quantityToPack: i.quantityToPack + 1 } : i
          )
        );
        toast.success(`${item.itemName} quantity increased`);
      } else {
        // Add new item
        const newItem = { ...item, id: `scan-${Date.now()}` };
        setPackageItems((prev) => [...prev, newItem]);
        toast.success(`${item.itemName} added to package`);
      }
    } else {
      toast.error(`Item with barcode "${trimmedBarcode}" not found`);
    }
    
    setBarcodeInput("");
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  const calculateTotalItems = () => {
    return packageItems.reduce((sum, item) => sum + item.quantityToPack, 0);
  };

  const handleRemoveItem = (itemId: string) => {
    setPackageItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    setPackageItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantityToPack: newQuantity } : item))
    );
  };

  const handleSavePackage = () => {
    // In a real implementation, this would save to the database
    setNewPackageOpen(false);
    setCustomerName("John Smith Customer");
    setSalesOrder("SO-00");
    setPackageSlip("PKG-00028");
    setPackageDate(new Date().toISOString().split("T")[0]);
    setPackageItems(mockSalesOrderItems);
    setInternalNotes("");
    setScanModeActive(false);
    setBarcodeInput("");
  };

  // Print shipping label
  const printShippingLabel = (pkg: Package) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      toast.error("Unable to open print window. Please allow popups.");
      return;
    }

    const labelContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shipping Label - ${pkg.packageSlip}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .label { border: 2px solid #000; padding: 20px; max-width: 350px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
          .carrier-logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .carrier-fedex { color: #4D148C; }
          .carrier-ups { color: #351C15; }
          .carrier-dhl { color: #D40511; }
          .carrier-usps { color: #004B87; }
          .carrier-australia { color: #D0021B; }
          .section { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #ccc; }
          .section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .label-title { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 3px; }
          .label-value { font-size: 14px; font-weight: 600; }
          .tracking { text-align: center; margin: 20px 0; }
          .tracking-number { font-size: 18px; font-weight: bold; letter-spacing: 2px; font-family: monospace; }
          .barcode { text-align: center; margin: 15px 0; font-family: 'Libre Barcode 128', monospace; font-size: 48px; }
          .barcode-fallback { border: 1px solid #000; padding: 10px; background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px); height: 60px; margin: 15px auto; max-width: 200px; }
          .package-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .from-to { display: grid; grid-template-columns: 1fr; gap: 15px; }
          .address-block { padding: 10px; background: #f5f5f5; }
          .print-date { text-align: center; font-size: 10px; color: #999; margin-top: 15px; }
          @media print {
            body { padding: 0; }
            .label { border-width: 1px; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="header">
            <div class="carrier-logo carrier-${(pkg.carrier || 'Other').toLowerCase().replace(' ', '-')}">${pkg.carrier || 'Standard Shipping'}</div>
            <div style="font-size: 12px; color: #666;">SHIPPING LABEL</div>
          </div>
          
          <div class="section from-to">
            <div class="address-block">
              <div class="label-title">Ship To</div>
              <div class="label-value">${pkg.customerName}</div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">Customer Address Line 1<br/>City, State ZIP</div>
            </div>
          </div>
          
          <div class="section tracking">
            <div class="label-title">Tracking Number</div>
            <div class="tracking-number">${pkg.trackingNumber || 'N/A'}</div>
            <div class="barcode-fallback" title="Barcode"></div>
          </div>
          
          <div class="section package-info">
            <div>
              <div class="label-title">Package Slip</div>
              <div class="label-value">${pkg.packageSlip}</div>
            </div>
            <div>
              <div class="label-title">Sales Order</div>
              <div class="label-value">${pkg.salesOrder}</div>
            </div>
            <div>
              <div class="label-title">Date</div>
              <div class="label-value">${formatDate(pkg.date)}</div>
            </div>
            <div>
              <div class="label-title">Status</div>
              <div class="label-value">${pkg.status === 'shipped' ? 'Shipped' : pkg.status === 'delivered' ? 'Delivered' : 'Not Shipped'}</div>
            </div>
          </div>
          
          <div class="print-date">Printed: ${new Date().toLocaleString()}</div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(labelContent);
    printWindow.document.close();
    toast.success("Shipping label sent to print");
  };

  const PackageCard = ({ pkg, showValue = false }: { pkg: Package; showValue?: boolean }) => (
    <div className="flex items-start gap-3 p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors group">
      <Checkbox
        checked={selectedPackages.has(pkg.id)}
        onCheckedChange={() => togglePackageSelection(pkg.id)}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground">{pkg.customerName}</div>
        <div className="flex items-center gap-2 mt-1 text-sm">
          <span className="text-primary font-medium">{pkg.packageSlip}</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">{pkg.salesOrder}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {pkg.carrier && (
            <span className="text-muted-foreground">{pkg.carrier} | </span>
          )}
          {pkg.trackingNumber && (
            <span className="text-primary font-medium">{pkg.trackingNumber} | </span>
          )}
          {!pkg.carrier && pkg.status === "shipped" && <span className="text-muted-foreground">Australian P... | </span>}
          {!pkg.carrier && pkg.status === "delivered" && pkg.id !== "5" && pkg.id !== "6" && (
            <span className="text-muted-foreground">
              {pkg.id === "8" ? "UPS | " : pkg.id === "7" ? "FedEx | " : "Australian P... | "}
            </span>
          )}
          {!pkg.carrier && pkg.id === "5" && <span className="text-muted-foreground">FedEx | </span>}
          {!pkg.carrier && pkg.id === "6" && <span className="text-muted-foreground">Australian P... | </span>}
          {formatDate(pkg.date)}
        </div>
        {/* Status action buttons */}
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {pkg.status === "not_shipped" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                openShipmentDialog(pkg.id);
              }}
            >
              <Truck className="h-3 w-3" />
              Mark Shipped
            </Button>
          )}
          {pkg.status === "shipped" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  printShippingLabel(pkg);
                }}
              >
                <Printer className="h-3 w-3" />
                Print Label
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsDelivered(pkg.id);
                }}
              >
                <CheckCircle className="h-3 w-3" />
                Mark Delivered
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  markAsNotShipped(pkg.id);
                }}
              >
                <Package className="h-3 w-3" />
                Unship
              </Button>
            </>
          )}
          {pkg.status === "delivered" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  printShippingLabel(pkg);
                }}
              >
                <Printer className="h-3 w-3" />
                Print Label
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  openShipmentDialog(pkg.id);
                }}
              >
                <Truck className="h-3 w-3" />
                Back to Shipped
              </Button>
            </>
          )}
        </div>
      </div>
      {showValue && (
        <div className="text-right font-medium">
          {pkg.id === "2" ? "0.00" : pkg.id === "3" ? "3.00" : pkg.id === "4" ? "4.00" : ""}
          {pkg.id === "5" ? "1.00" : pkg.id === "6" ? "1.00" : pkg.id === "7" ? "0.00" : pkg.id === "8" ? "6.00" : ""}
        </div>
      )}
    </div>
  );

  const ColumnHeader = ({ title, color, status }: { title: string; color: string; status?: Package["status"] }) => (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-t-lg ${color}`}
    >
      <h3 className="font-semibold text-foreground">{title}</h3>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Sort by</DropdownMenuItem>
          <DropdownMenuItem>Import Packages</DropdownMenuItem>
          <DropdownMenuItem>Export Packages</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Import Shipments</DropdownMenuItem>
          <DropdownMenuItem>Export Shipments</DropdownMenuItem>
          {status && selectedPackages.size > 0 && (
            <>
              <DropdownMenuSeparator />
              {status !== "shipped" && (
                <DropdownMenuItem onClick={() => bulkUpdateStatus("shipped")}>
                  <Truck className="h-4 w-4 mr-2" />
                  Mark Selected as Shipped
                </DropdownMenuItem>
              )}
              {status !== "delivered" && (
                <DropdownMenuItem onClick={() => bulkUpdateStatus("delivered")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Selected as Delivered
                </DropdownMenuItem>
              )}
              {status !== "not_shipped" && (
                <DropdownMenuItem onClick={() => bulkUpdateStatus("not_shipped")}>
                  <Package className="h-4 w-4 mr-2" />
                  Mark Selected as Not Shipped
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Packages</h2>
        <Button onClick={() => setNewPackageOpen(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </div>

      {/* Tabs for Packages and Reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted rounded-lg">
          <TabsTrigger value="packages" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="h-4 w-4" />
            Packages
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-4 w-4" />
            Monthly Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-4 space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Filters</span>
                {(filterStatus !== "all" || filterCarrier !== "all" || filterCustomer || filterDateFrom || filterDateTo) && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Status Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="not_shipped">Not Shipped</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Carrier Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Carrier</Label>
                  <Select value={filterCarrier} onValueChange={setFilterCarrier}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All Carriers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Carriers</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                      <SelectItem value="USPS">USPS</SelectItem>
                      <SelectItem value="Australia Post">Australia Post</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Filter */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Customer</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customer..."
                      value={filterCustomer}
                      onChange={(e) => setFilterCustomer(e.target.value)}
                      className="h-9 pl-8"
                    />
                  </div>
                </div>

                {/* Date From */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Date To */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              {filteredPackages.length !== packages.length && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Showing {filteredPackages.length} of {packages.length} packages
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kanban Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Not Shipped Column */}
            <Card className="overflow-hidden">
              <ColumnHeader title="Packages, Not Shipped" color="bg-white border-b" status="not_shipped" />
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {notShippedPackages.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">No packages</div>
                  ) : (
                    notShippedPackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Shipped Column */}
            <Card className="overflow-hidden">
              <ColumnHeader title="Shipped Packages" color="bg-muted/50 border-b" status="shipped" />
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {shippedPackages.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">No packages</div>
                  ) : (
                    shippedPackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} showValue />)
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Delivered Column */}
            <Card className="overflow-hidden border-t-4 border-t-green-500">
              <ColumnHeader title="Delivered Packages" color="bg-green-50 border-b" status="delivered" />
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {deliveredPackages.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">No packages</div>
                  ) : (
                    deliveredPackages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} showValue />)
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-4 space-y-4">
          {/* Report Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Select Period</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Month</Label>
                  <Select value={reportMonth} onValueChange={setReportMonth}>
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="2">February</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                      <SelectItem value="5">May</SelectItem>
                      <SelectItem value="6">June</SelectItem>
                      <SelectItem value="7">July</SelectItem>
                      <SelectItem value="8">August</SelectItem>
                      <SelectItem value="9">September</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                      <SelectItem value="11">November</SelectItem>
                      <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <Select value={reportYear} onValueChange={setReportYear}>
                    <SelectTrigger className="h-9 w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2021">2021</SelectItem>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-primary">{monthlyReport.total}</div>
                <div className="text-sm text-muted-foreground">Total Packages</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-amber-500">{monthlyReport.byStatus.not_shipped}</div>
                <div className="text-sm text-muted-foreground">Not Shipped</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-500">{monthlyReport.byStatus.shipped}</div>
                <div className="text-sm text-muted-foreground">Shipped</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-500">{monthlyReport.byStatus.delivered}</div>
                <div className="text-sm text-muted-foreground">Delivered</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Reports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Carrier */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Packages by Carrier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(monthlyReport.byCarrier).length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No data for this period</div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(monthlyReport.byCarrier).map(([carrier, count]) => (
                      <div key={carrier} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                        <span className="font-medium">{carrier}</span>
                        <span className="text-primary font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* By Customer */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Packages by Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(monthlyReport.byCustomer).length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No data for this period</div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {Object.entries(monthlyReport.byCustomer)
                        .sort(([, a], [, b]) => b - a)
                        .map(([customer, count]) => (
                          <div key={customer} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                            <span className="font-medium">{customer}</span>
                            <span className="text-primary font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Package List for Period */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Package Details</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyReport.packages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No packages for this period</div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="font-semibold">Package Slip</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Carrier</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyReport.packages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell className="font-medium text-primary">{pkg.packageSlip}</TableCell>
                          <TableCell>{pkg.customerName}</TableCell>
                          <TableCell>{formatDate(pkg.date)}</TableCell>
                          <TableCell>{pkg.carrier || "-"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              pkg.status === "delivered" 
                                ? "bg-green-100 text-green-700" 
                                : pkg.status === "shipped" 
                                  ? "bg-blue-100 text-blue-700" 
                                  : "bg-amber-100 text-amber-700"
                            }`}>
                              {pkg.status === "not_shipped" ? "Not Shipped" : pkg.status === "shipped" ? "Shipped" : "Delivered"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Package Dialog */}
      <Dialog open={newPackageOpen} onOpenChange={setNewPackageOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <span className="text-muted-foreground">📦</span> New Package
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-primary cursor-pointer hover:underline">📐 Evaluate packing geometry</span>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Customer and Sales Order */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Customer Name</Label>
                  <Select value={customerName} onValueChange={setCustomerName}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="John Smith Customer">John Smith Customer</SelectItem>
                      <SelectItem value="Vincent">Vincent</SelectItem>
                      <SelectItem value="Gilda">Gilda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-destructive">Sales Order#*</Label>
                  <Select value={salesOrder} onValueChange={setSalesOrder}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SO-00">SO-00</SelectItem>
                      <SelectItem value="SO-01">SO-01</SelectItem>
                      <SelectItem value="SO-02">SO-02</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Package Slip and Date */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-destructive">Package Slip#*</Label>
                  <div className="relative">
                    <Input
                      value={packageSlip}
                      onChange={(e) => setPackageSlip(e.target.value)}
                      className="h-10 pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    >
                      <span className="text-muted-foreground">⚙</span>
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-destructive">Date*</Label>
                  <Input
                    type="date"
                    value={packageDate}
                    onChange={(e) => setPackageDate(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Barcode Scanning Section */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-5 w-5 text-primary" />
                    <span className="font-medium">Barcode Scanner</span>
                  </div>
                  <Button
                    variant={scanModeActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setScanModeActive(!scanModeActive)}
                    className="gap-2"
                  >
                    <Barcode className="h-4 w-4" />
                    {scanModeActive ? "Scanning Active" : "Enable Scanning"}
                  </Button>
                </div>
                
                {scanModeActive && (
                  <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        ref={barcodeInputRef}
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan barcode or enter SKU (e.g., SKU-001, SKU-002, SKU-003)"
                        className="pl-10 h-10"
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </form>
                )}
                
                {!scanModeActive && (
                  <p className="text-sm text-muted-foreground">
                    Enable scanning to add items by scanning barcodes or entering SKU codes directly.
                  </p>
                )}
              </div>

              {/* Info Banner */}
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                <span className="text-amber-600">ℹ️</span>
                <span className="text-muted-foreground">
                  You can also select or scan the items to be included from the sales order.{" "}
                  <span 
                    className="text-primary cursor-pointer hover:underline"
                    onClick={() => setScanModeActive(true)}
                  >
                    Select or Scan Items
                  </span>
                </span>
              </div>

              {/* Items Table with Scrollbar */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold text-xs uppercase tracking-wide w-[40%]">
                        Items & Description
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">
                        Ordered
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">
                        Packed
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">
                        Quantity to Pack
                      </TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                </Table>
                <ScrollArea className="h-[250px]">
                  <Table>
                    <TableBody>
                      {packageItems.map((item) => (
                        <TableRow key={item.id} className="border-b">
                          <TableCell className="py-4 w-[40%]">
                            <div>
                              <div className="font-medium text-foreground">{item.itemName}</div>
                              <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                              <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-primary font-medium">{item.ordered.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.packed.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-medium">{item.quantityToPack.toLocaleString()}</span>
                              {item.stockOnHand !== undefined && (
                                <span
                                  className={`text-xs ${item.stockOnHand < 0 ? "text-destructive" : "text-primary"}`}
                                >
                                  Stock on Hand: {item.stockOnHand} {item.uom} ⓘ
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="w-20">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-sm">{item.uom}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-primary">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Internal Notes */}
              <div className="space-y-2">
                <Label className="text-muted-foreground font-semibold uppercase text-xs tracking-wide">
                  Internal Notes
                </Label>
                <Textarea
                  placeholder="Enter internal notes..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between border-t pt-4 mt-4">
            <div className="flex gap-2">
              <Button onClick={handleSavePackage} className="bg-primary hover:bg-primary/90">
                Save
              </Button>
              <Button variant="outline" onClick={() => setNewPackageOpen(false)}>
                Cancel
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Total Items : <span className="font-semibold text-foreground">{calculateTotalItems().toLocaleString()}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipment Dialog */}
      <Dialog open={shipmentDialogOpen} onOpenChange={setShipmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              {isBulkShipment ? `Ship ${selectedPackages.size} Package(s)` : "Ship Package"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Shipping Carrier <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedCarrier} onValueChange={setSelectedCarrier}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a carrier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FedEx">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-purple-600">FedEx</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="UPS">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-amber-700">UPS</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="DHL">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-yellow-600">DHL</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="USPS">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600">USPS</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Australia Post">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-red-600">Australia Post</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="Other">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-muted-foreground">Other</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Tracking Number <span className="text-destructive">*</span>
              </Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="h-10"
              />
            </div>

            {selectedCarrier && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  <span>
                    {isBulkShipment 
                      ? `${selectedPackages.size} packages will be shipped via ${selectedCarrier}`
                      : `Package will be shipped via ${selectedCarrier}`
                    }
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShipmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmShipment} className="gap-2">
              <Truck className="h-4 w-4" />
              Confirm Shipment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PackagesTab;
