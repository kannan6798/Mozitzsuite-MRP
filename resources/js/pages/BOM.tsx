import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Save, Trash2, Eye, RotateCcw, History, GitCompare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import RevisionCompareDialog from "@/components/bom/RevisionCompareDialog";
import BOMDeleteDialog from "@/components/bom/BOMDeleteDialog";



const bomFormSchema = z.object({
  itemType: z.enum(["Product", "Component"], {
    message: "Please select an item type",
  }),
  itemCode: z.string().min(1, "Item code is required"),
  itemName: z.string().min(1, "Item name is required"),
  vendor: z.string().optional(),
  alternate: z.string().optional(),
  revision: z.string().min(1, "Revision is required"),
  uom: z.string().min(1, "UOM is required"),
  implementedOnly: z.boolean().default(false),
  components: z
    .array(
      z.object({
        itemSeq: z.number(),
        operationSeq: z.number(),
        component: z.string().min(1, "Component is required"),
        description: z.string().min(1, "Description is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        uom: z.string().min(1, "UOM is required"),
        basis: z.string().min(1, "Basis is required"),
        type: z.string().min(1, "Type is required"),
        status: z.string().min(1, "Status is required"),
        planningPercent: z.number().min(0).max(100).default(100),
        yield: z.number().min(0).max(100).default(100),
        includeInCostRollup: z.boolean().default(true),
        unitCost: z.number().min(0).default(0),
        totalCost: z.number().min(0).default(0),
      }),
    )
    .min(1, "At least one component is required"),
  operations: z
    .array(
      z.object({
        operationSeq: z.number(),
        operationCode: z.string().min(1, "Operation code is required"),
        description: z.string().min(1, "Description is required"),
        department: z.string().min(1, "Department is required"),
        workCenter: z.string().optional(),
        routingEnabled: z.boolean().default(true),
        laborCost: z.number().min(0).default(0),
        machineCost: z.number().min(0).default(0),
        overheadCost: z.number().min(0).default(0),
        setupTime: z.number().min(0).default(0),
        runTime: z.number().min(0).default(0),
      }),
    )
    .default([]),
});

type BOMFormValues = z.infer<typeof bomFormSchema>;

const BOM = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isReviseDialogOpen, setIsReviseDialogOpen] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<any>(null);
  const [revisionBOM, setRevisionBOM] = useState<any>(null);
  const [revisionReason, setRevisionReason] = useState("");
  const [revisionHistory, setRevisionHistory] = useState<any[]>([]);
  const [revisionDocument, setRevisionDocument] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [editingBomId, setEditingBomId] = useState<string | null>(null);
  const [showAllRevisions, setShowAllRevisions] = useState(false);
  const [isCompareDialogOpen, setIsCompareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [bomToDelete, setBomToDelete] = useState<any>(null);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const orderContext = location.state?.orderContext;


  // Fetch inventory items and BOM data
  const fetchBOMData = async () => {
    try {
      const response = await fetch("/api/bom-headers"); // Your API endpoint
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to fetch BOM data:", errorData.message);
        return;
      }

      const data = await response.json();

      const formattedData = data.map((bom: any) => ({
        id: bom.id,
        itemCode: bom.item_code,
        itemName: bom.item_name,
        alternate: bom.alternate || "",
        revision: bom.revision,
        revisionNumber: bom.revision_number || 1,
        uom: bom.uom,
        components: bom.bom_components?.length || 0,
        status: bom.status,
        implementedOnly: bom.implemented_only,
        rawData: bom,
      }));

      setBomData(formattedData);
    } catch (error: any) {
      console.error("Error fetching BOM data:", error);
    }
  };


  useEffect(() => {
    const fetchInventoryItems = async () => {
      try {
        const response = await fetch("/api/inventory-stock"); // Your API endpoint
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to fetch inventory items:", errorData.message);
          return;
        }

        const data = await response.json();
        console.log("Raw API data:", data);
        console.log("Keys:", Object.keys(data));
        setInventoryItems(Array.isArray(data.items) ? data.items : []);
      } catch (error) {
        console.error("Error fetching inventory items:", error);
      }
    };

    fetchInventoryItems();
    fetchBOMData(); // Call your API-based BOM fetch function
  }, []);


  // Get URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const itemCode = params.get("itemCode");
    const itemName = params.get("itemName");
    const itemType = params.get("itemType");

    if (itemCode && itemName) {
      form.setValue("itemCode", itemCode);
      form.setValue("itemName", itemName);
      if (itemType) {
        form.setValue("itemType", itemType as "Product" | "Component");
      }
      setIsDialogOpen(true);
    }
  }, []);

  const form = useForm<BOMFormValues>({
    resolver: zodResolver(bomFormSchema) as any,
    defaultValues: {
      itemType: "Product",
      itemCode: location.state?.itemCode || "",
      itemName: location.state?.itemName || "",
      vendor: "",
      alternate: "",
      revision: "A",
      uom: location.state?.itemDetails?.uom || "Ea",
      implementedOnly: false,
      components: [
        {
          itemSeq: 10,
          operationSeq: 10,
          component: "",
          description: "",
          quantity: 1,
          uom: "Ea",
          basis: "Item",
          type: "Purchased Item",
          status: "Active",
          planningPercent: 100,
          yield: 100,
          includeInCostRollup: true,
          unitCost: 0,
          totalCost: 0,
        },
      ],
      operations: [],
    },
  });

  const itemType = form.watch("itemType");

  // Open dialog automatically if coming from Orders with item context
  useEffect(() => {
    if (location.state?.itemCode && location.state?.orderContext) {
      setIsDialogOpen(true);
    }
  }, [location.state]);
  const [bomData, setBomData] = useState([
    {
      id: "BOM-001",
      itemCode: "CN97444",
      itemName: "Envoy Custom Laptop",
      alternate: "",
      revision: "A",
      uom: "Ea",
      components: 5,
      status: "Active",
      implementedOnly: true,
    },
    {
      id: "BOM-002",
      itemCode: "PL08630",
      itemName: "Plastic Housing - Gray",
      alternate: "",
      revision: "A",
      uom: "Ea",
      components: 4,
      status: "Active",
      implementedOnly: true,
    },
    {
      id: "BOM-003",
      itemCode: "WP1250",
      itemName: "Workstation Pro Assembly",
      alternate: "ALT1",
      revision: "B",
      uom: "Ea",
      components: 8,
      status: "Review",
      implementedOnly: false,
    },
  ]);

  // Filter BOM data to show only latest revisions by default
  const filteredBomData = showAllRevisions
    ? bomData
    : bomData.filter(bom => bom.status !== "Superseded");

  const sampleComponents = [
    {
      itemSeq: 10,
      operationSeq: 10,
      component: "RWP4043",
      description: "Raw Material Component",
      quantity: 1,
      uom: "Ea",
      basis: "Item",
      type: "Purchased Item",
      status: "Active",
      planningPercent: 100,
      yield: 100,
      includeInCostRollup: true,
      unitCost: 0,
      totalCost: 0,
    },
    {
      itemSeq: 20,
      operationSeq: 10,
      component: "SC34065",
      description: "Subassembly Component",
      quantity: 1,
      uom: "Ea",
      basis: "Item",
      type: "Purchased Item",
      status: "Active",
      planningPercent: 100,
      yield: 100,
      includeInCostRollup: true,
      unitCost: 0,
      totalCost: 0,
    },
    {
      itemSeq: 30,
      operationSeq: 20,
      component: "SC34077",
      description: "Assembly Component",
      quantity: 1,
      uom: "Ea",
      basis: "Item",
      type: "Purchased Item",
      status: "Active",
      planningPercent: 100,
      yield: 100,
      includeInCostRollup: true,
      unitCost: 0,
      totalCost: 0,
    },
  ];

  const addComponent = () => {
    const currentComponents = form.getValues("components");
    const lastSeq = currentComponents.length > 0 ? Math.max(...currentComponents.map((c) => c.itemSeq)) : 0;

    form.setValue("components", [
      ...currentComponents,
      {
        itemSeq: lastSeq + 10,
        operationSeq: 10,
        component: "",
        description: "",
        quantity: 1,
        uom: "Ea",
        basis: "Item",
        type: "Purchased Item",
        status: "Active",
        planningPercent: 100,
        yield: 100,
        includeInCostRollup: true,
        unitCost: 0,
        totalCost: 0,
      },
    ]);
  };

  const removeComponent = (index: number) => {
    const currentComponents = form.getValues("components");
    if (currentComponents.length > 1) {
      form.setValue(
        "components",
        currentComponents.filter((_, i) => i !== index),
      );
    }
  };

  const addOperation = () => {
    const currentOperations = form.getValues("operations") || [];
    const lastSeq = currentOperations.length > 0 ? Math.max(...currentOperations.map((o) => o.operationSeq)) : 0;

    form.setValue("operations", [
      ...currentOperations,
      {
        operationSeq: lastSeq + 10,
        operationCode: "",
        description: "",
        department: "",
        workCenter: "",
        routingEnabled: true,
        laborCost: 0,
        machineCost: 0,
        overheadCost: 0,
        setupTime: 0,
        runTime: 0,
      },
    ]);
  };

  const removeOperation = (index: number) => {
    const currentOperations = form.getValues("operations") || [];
    form.setValue(
      "operations",
      currentOperations.filter((_, i) => i !== index),
    );
  };

  const uploadDocument = async (file: File) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append("file", file);

  const resp = await axios.post("/api/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return resp.data.url; // assume your API returns { url: "file_path_or_url" }
};

 const onSubmit = async (data: BOMFormValues) => {
  console.log("Form submitted!", data);
  try {
    console.log("SUBMIT CLICKED");
    console.log("Editing ID:", editingBomId);
    console.log("Form Data:", data);

    // ✅ Check for existing active BOM when creating new (not editing)
    if (!editingBomId) {
      try {
        const resp = await axios.get("/api/bom-headers", {
          params: { item_code: data.itemCode, status: "Active" },
        });

        const existingBOMs = resp.data;
       if (!editingBomId && existingBOMs.length > 0) {
  toast({
    title: "BOM Already Exists",
    description: `This item (${data.itemCode}) already has an existing BOM.`,
    variant: "destructive",
  });
  return;
}
if (editingBomId) {
  const otherBOM = existingBOMs.find((bom: any) => bom.id !== editingBomId);
  if (otherBOM) {
    toast({
      title: "BOM Already Exists",
      description: `Another BOM already uses item code ${data.itemCode}.`,
      variant: "destructive",
    });
    return;
  }
}
      } catch (error: any) {
        console.error("Error checking existing BOM:", error.response?.data || error);
        toast({
          title: "Error Checking BOM",
          description: error.response?.data?.error || error.message,
          variant: "destructive",
        });
        return;
      }
    }

    let bomId = editingBomId;
    let documentUrl: string | null = null;

    // ✅ Upload new document if provided
    if (revisionDocument) {
      try {
        documentUrl = await uploadDocument(revisionDocument);
        console.log("Uploaded document URL:", documentUrl);
      } catch (err: any) {
        console.error("Error uploading document:", err.response?.data || err);
        toast({
          title: "Document Upload Failed",
          description: err.response?.data?.error || err.message,
          variant: "destructive",
        });
        return;
      }
    }

    // ✅ Use existing document URL if updating
    if (editingBomId && !documentUrl) {
      try {
        const resp = await axios.get(`/api/bom-headers/${editingBomId}`);
        documentUrl = resp.data.document || "";
        console.log("Using existing document URL:", documentUrl);
      } catch (err: any) {
        console.error("Error fetching existing BOM document:", err.response?.data || err);
        toast({
          title: "Cannot fetch existing BOM document",
          description: err.response?.data?.error || err.message,
          variant: "destructive",
        });
        return;
      }
    }

    // ✅ UPDATE EXISTING BOM
    if (editingBomId) {
      try {
        // Update BOM header
        await axios.put(`/api/bom-headers/${editingBomId}`, {
          item_type: data.itemType,
          item_code: data.itemCode,
          item_name: data.itemName,
          vendor: data.vendor,
          alternate: data.alternate,
          revision: data.revision,
          uom: data.uom,
          implemented_only: data.implementedOnly,
          status: "Active",
          document: documentUrl || null,
        });
        

        // Delete old components and operations (use data payload)
        await Promise.all([
          axios.delete("/api/bom-components", { data: { bom_id: editingBomId } }),
          axios.delete("/api/bom-operations", { data: { bom_id: editingBomId } }),
        ]);

        toast({
          title: "BOM Updated Successfully",
          description: `${data.itemCode} - ${data.itemName} has been updated.`,
        });
      } catch (error: any) {
        console.error("Error updating BOM:", error.response?.data || error);
        toast({
          title: "Error Updating BOM",
          description: error.response?.data?.error || error.message,
          variant: "destructive",
        });
        return;
      }
    } else {
      // ✅ CREATE NEW BOM
       let documentUrl: string | null = null;
    if (revisionDocument) {
      documentUrl = await uploadDocument(revisionDocument);
      console.log("Uploaded document URL:", documentUrl);
    }
      try {
        const bomHeaderResp = await axios.post("/api/bom-headers", {
          item_type: data.itemType,
          item_code: data.itemCode,
          item_name: data.itemName,
          vendor: data.vendor,
          alternate: data.alternate,
          revision: data.revision,
          uom: data.uom,
          implemented_only: data.implementedOnly,
          status: "Active",
           document: documentUrl || null,
        });

        const bomHeader = bomHeaderResp.data;
        if (!bomHeader || !bomHeader.id) throw new Error("Failed to create BOM header");
        bomId = bomHeader.id;
      } catch (error: any) {
        console.error("Error creating BOM header:", error.response?.data || error);
        toast({
          title: "Error Creating BOM Header",
          description: error.response?.data?.error || error.message,
          variant: "destructive",
        });
        return;
      }
    }

    // ✅ Insert BOM components
    if (data.components.length > 0) {
      try {
        const componentsToInsert = data.components.map((comp) => ({
          bom_id: bomId,
          item_seq: comp.itemSeq,
          operation_seq: comp.operationSeq,
          component: comp.component,
          description: comp.description,
          quantity: comp.quantity,
          uom: comp.uom,
          basis: comp.basis,
          type: comp.type,
          status: comp.status,
          planning_percent: comp.planningPercent,
          yield_percent: comp.yield,
          include_in_cost_rollup: comp.includeInCostRollup,
          unit_cost: comp.unitCost,
          total_cost: comp.totalCost,
        }));
        await axios.post("/api/bom-components", componentsToInsert);
      } catch (err: any) {
        console.error("Error inserting BOM components:", err.response?.data || err);
        toast({
          title: "Error Saving BOM Components",
          description: err.response?.data?.error || err.message,
          variant: "destructive",
        });
        return;
      }
    }

    // ✅ Insert BOM operations
    if (data.operations && data.operations.length > 0) {
      try {
        const operationsToInsert = data.operations.map((op) => ({
          bom_id: bomId,
          operation_seq: op.operationSeq,
          operation_code: op.operationCode,
          description: op.description,
          department: op.department,
          work_center: op.workCenter,
          routing_enabled: op.routingEnabled,
          labor_cost: op.laborCost,
          machine_cost: op.machineCost,
          overhead_cost: op.overheadCost,
          setup_time: op.setupTime,
          run_time: op.runTime,
        }));
        await axios.post("/api/bom-operations", operationsToInsert);
      } catch (error: any) {
        console.error("Error inserting BOM operations:", error.response?.data || error);
        toast({
          title: "Error Saving BOM Operations",
          description: error.response?.data?.error || error.message,
          variant: "destructive",
        });
        return;
      }
    }

    // ✅ Reload BOM data and reset form
    await fetchBOMData();
    setIsDialogOpen(false);
    setEditingBomId(null);
    form.reset();

    toast({
      title: editingBomId ? "BOM Updated Successfully" : "BOM Created Successfully",
      description: `${data.itemCode} - ${data.itemName}`,
    });
  } catch (error: any) {
    console.error("Full error object:", error);
    toast({
      title: "Error Saving BOM",
      description: error.response?.data?.error || error.message,
      variant: "destructive",
    });
  }
};


  const handleViewBOM = async (bom: any) => {
    try {
      console.log("Fetching BOM for ID:", bom.id);

      const { data } = await axios.get(`/api/bom-headers/${bom.id}`);
      console.log("BOM data received:", data);

      if (data) {
        console.log("Setting selected BOM");
        setSelectedBOM(data);
        setIsViewDialogOpen(true);
      } else {
        console.warn("No BOM data received");
      }
    } catch (error: any) {
      console.error("Error fetching BOM:", error);
      toast({
        title: "Error Fetching BOM",
        description: error.message || "Failed to load BOM data.",
        variant: "destructive",
      });
    }
  };

const handleEditBOM = async (bom: any) => {
  try {
    const { data: bomHeader } = await axios.get(`/api/bom-headers/${bom.id}`);
    if (!bomHeader) throw new Error("Failed to fetch BOM header");

    const [componentsRes, operationsRes] = await Promise.all([
      axios.get("/api/bom-components", { params: { bom_id: bom.id } }),
      axios.get("/api/bom-operations", { params: { bom_id: bom.id } }),
    ]);

    // Reset form with fetched data
    form.reset({
      itemType: bomHeader.item_type,
      itemCode: bomHeader.item_code,
      itemName: bomHeader.item_name,
      vendor: bomHeader.vendor || "",
      alternate: bomHeader.alternate || "",
      revision: bomHeader.revision,
      uom: bomHeader.uom,
      implementedOnly: bomHeader.implemented_only,
      components: componentsRes.data.map((comp: any) => ({
        itemSeq: comp.item_seq,
        operationSeq: comp.operation_seq,
        component: comp.component,
        description: comp.description,
        quantity: comp.quantity,
        uom: comp.uom,
        basis: comp.basis,
        type: comp.type,
        status: comp.status,
        planningPercent: comp.planning_percent,
        yield: comp.yield,
        includeInCostRollup: comp.include_in_cost_rollup,
        unitCost: comp.unit_cost,
        totalCost: comp.total_cost,
      })),
      operations: operationsRes.data.map((op: any) => ({
        operationSeq: op.operation_seq,
        operationCode: op.operation_code,
        description: op.description,
        department: op.department,
        workCenter: op.work_center || "",
        routingEnabled: op.routing_enabled,
        laborCost: op.labor_cost,
        machineCost: op.machine_cost,
        overheadCost: op.overhead_cost,
        setupTime: op.setup_time,
        runTime: op.run_time,
      })),
    });

    // ✅ Set the editing BOM ID first
    // Use a callback to ensure dialog opens after state update
    setEditingBomId(bom.id);
    setIsDialogOpen(true);
  } catch (error: any) {
    console.error("Error fetching BOM details:", error);
    toast({
      title: "Error Loading BOM",
      description: error.message || "Failed to fetch BOM data.",
      variant: "destructive",
    });
  }
};

  const handleDeleteBOM = (bom: any) => {
    setBomToDelete(bom);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    toast({
      title: "BOM Deleted",
      description: `${bomToDelete?.itemCode} - ${bomToDelete?.itemName} has been deleted successfully.`,
    });
    fetchBOMData();
    setBomToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      Active: "default",
      Completed: "default",
      Review: "secondary",
      Inactive: "outline",
      Superseded: "outline",
    };
    return (
      <Badge
        variant={variants[status] || "default"}
        className={status === "Superseded" ? "bg-muted text-muted-foreground" : ""}
      >
        {status}
      </Badge>
    );
  };

  // Get next revision letter (A -> B -> C -> ... -> Z -> AA -> AB ...)
  const getNextRevision = (currentRevision: string): string => {
    if (!currentRevision) return "B";

    const lastChar = currentRevision.charAt(currentRevision.length - 1);
    if (lastChar === "Z") {
      if (currentRevision.length === 1) {
        return "AA";
      }
      return getNextRevision(currentRevision.slice(0, -1)) + "A";
    }
    return currentRevision.slice(0, -1) + String.fromCharCode(lastChar.charCodeAt(0) + 1);
  };

  // Fetch revision history for a BOM
  const fetchRevisionHistory = async (itemCode: string) => {
    try {
      // Fetch BOM revisions from your API
      const { data } = await axios.get(`/api/bom-headers`, {
        params: { item_code: itemCode, order_by: "revision_number", order: "desc" },
      });

      if (data) {
        setRevisionHistory(data);
      }
    } catch (error: any) {
      toast({
        title: "Error Fetching Revisions",
        description: error.message || "Failed to fetch revision history.",
        variant: "destructive",
      });
    }
  };


  // Open revision confirmation dialog
  const handleOpenReviseDialog = (bom: any) => {
    if (bom.status === "Superseded") {
      toast({
        title: "Cannot Revise",
        description: "This BOM has been superseded. Please revise the active version.",
        variant: "destructive",
      });
      return;
    }
    setRevisionBOM(bom);
    setRevisionReason("");
    setIsReviseDialogOpen(true);
  };

  // Handle BOM revision
  const handleReviseBOM = async () => {
    if (!revisionBOM || !revisionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the revision.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch full BOM data with components and operations via API
      const { data: originalBOM } = await axios.get(`/api/bom-headers/${revisionBOM.id}`, {
        params: { include: "bom_components,bom_operations" }, // if your API supports this
      });

      if (!originalBOM) {
        throw new Error("Failed to fetch BOM details");
      }

      const bomData = originalBOM as any;
      const nextRevision = getNextRevision(bomData.revision || "A");
      const nextRevisionNumber = (bomData.revision_number || 1) + 1;

      // Update original BOM to Superseded
      try {
        await axios.put(`/api/bom-headers/${revisionBOM.id}`, {
          status: "Superseded",
        });
      } catch (updateError: any) {
        throw new Error(updateError?.response?.data?.message || "Failed to update BOM status");
      }


      // Create new BOM header
      const response = await axios.post("/api/bom-headers", {
        item_type: bomData.item_type,
        item_code: bomData.item_code,
        item_name: bomData.item_name,
        vendor: bomData.vendor,
        alternate: bomData.alternate,
        revision: nextRevision,
        uom: bomData.uom,
        implemented_only: bomData.implemented_only,
        status: "Active",
        parent_bom_id: revisionBOM.id,
        revision_number: nextRevisionNumber,
        revision_reason: revisionReason.trim(),
      });

      const newBomHeader = response.data;

      if (!newBomHeader) {
        throw new Error("Failed to create new revision");
      }


      const newBomId = (newBomHeader as any).id;

      // Copy components to new BOM
      if (bomData.bom_components && bomData.bom_components.length > 0) {
        const componentsToInsert = bomData.bom_components.map((comp: any) => ({
          bom_id: newBomHeader.id, // use the ID from the new BOM created
          item_seq: comp.item_seq,
          operation_seq: comp.operation_seq,
          component: comp.component,
          description: comp.description,
          quantity: comp.quantity,
          uom: comp.uom,
          basis: comp.basis,
          type: comp.type,
          status: comp.status,
          planning_percent: comp.planningPercent,
          yield_percent: comp.yield,
          include_in_cost_rollup: comp.include_in_cost_rollup,
          unit_cost: comp.unit_cost,
          total_cost: comp.total_cost,
        }));

        try {
          await axios.post("/api/bom-components", componentsToInsert);
        } catch (error: any) {
          console.error("Failed to copy components:", error?.response?.data?.message || error.message);
          throw new Error("Failed to copy BOM components");
        }
      }

      // Copy operations to new BOM
      if (bomData.bom_operations && bomData.bom_operations.length > 0) {
        const operationsToInsert = bomData.bom_operations.map((op: any) => ({
          bom_id: newBomHeader.id, // use the new BOM ID
          operation_seq: op.operation_seq,
          operation_code: op.operation_code,
          description: op.description,
          department: op.department,
          work_center: op.work_center,
          routing_enabled: op.routing_enabled,
          labor_cost: op.labor_cost,
          machine_cost: op.machine_cost,
          overhead_cost: op.overhead_cost,
          setup_time: op.setup_time,
          run_time: op.run_time,
        }));

        try {
          await axios.post("/api/bom-operations", operationsToInsert);
        } catch (error: any) {
          console.error("Failed to copy operations:", error?.response?.data?.message || error.message);
          throw new Error("Failed to copy BOM operations");
        }
      }

      toast({
        title: "Revision Created",
        description: `New revision ${nextRevision} created successfully. Opening for editing...`,
      });

      // Refresh BOM data
      await fetchBOMData();

      // Close revision dialog
      setIsReviseDialogOpen(false);
      setRevisionBOM(null);
      setRevisionReason("");

      // Open the new BOM in edit mode
      const newBomData = {
        id: newBomId,
        itemCode: bomData.item_code,
        itemName: bomData.item_name,
      };
      handleEditBOM(newBomData);

    } catch (error: any) {
      toast({
        title: "Error Creating Revision",
        description: error.message || "Failed to create new revision",
        variant: "destructive",
      });
    }
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Bill of Materials</h1>
            <p className="text-muted-foreground mt-2">Create BOM – Smart Hierarchical Component Management</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create BOM
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bills of Material</DialogTitle>
                <DialogDescription>
                  {orderContext ? (
                    <>
                      Create a new BOM with hierarchical component structure. After saving, your order will be created
                      automatically.
                    </>
                  ) : (
                    <>Create a new BOM with hierarchical component structure</>
                  )}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Order Context Alert */}
                  {orderContext && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-foreground">Creating BOM from Order</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Item details have been pre-filled from your order. Add components and operation costs below,
                            then save to automatically create the order.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Item Type Selection */}
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <FormField
                      control={form.control}
                      name="itemType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select item type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Product">Product</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Header Section - Oracle Style */}
                  <div className="grid grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                    <FormField
                      control={form.control}
                      name="itemCode"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Select Item</FormLabel>
                          <Select
                            onValueChange={async (value) => {
                             const selectedItem = inventoryItems.find((item) => item.itemCode === value);
if (!selectedItem) return;

try {
  // Check if this exact itemCode exists in BOM headers
  const response = await axios.get("/api/bom-headers", {
    params: { itemCode: selectedItem.itemCode, status: "Active" },
  });

  const existingBOMs = response.data || [];

  // Only block if the exact itemCode exists
  if (existingBOMs.some((bom: any) => bom.item_code === selectedItem.itemCode)) {
    toast({
      title: "BOM Already Exists",
      description: `This item (${selectedItem.itemCode}) already has a BOM in the system.`,
      variant: "destructive",
    });
    return; // Prevent setting form values
  }
} catch (error: any) {
  console.error("Error checking BOM:", error?.response?.data?.message || error.message);
  toast({
    title: "Error",
    description: "Failed to verify existing BOM.",
    variant: "destructive",
  });
  return;
}

// If itemCode is not stored, allow selection
form.setValue("itemCode", selectedItem.itemCode);
form.setValue("itemName", selectedItem.itemName);
form.setValue("uom", selectedItem.itemType === "Component" ? "kg" : "Ea");

toast({
  title: "Item Details Loaded",
  description: `${selectedItem.itemCode} - ${selectedItem.itemName} loaded from inventory`,
});
                            }}
                            value={field.value}
                            disabled={!!orderContext}
                          >
                            <FormControl>
                              <SelectTrigger className={orderContext ? "bg-muted" : ""}>
                                <SelectValue placeholder="Search and select item from inventory" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(inventoryItems) &&
                                inventoryItems.length > 0 &&
                                inventoryItems.map((item) => (
                                  <SelectItem
                                    key={item.id || item.itemCode}
                                    value={item.itemCode}
                                  >
                                    {item.itemCode} - {item.itemName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="itemName"
                      render={({ field }) => (
                        <FormItem className="hidden">
                          <FormControl>
                            <Input type="hidden" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="uom"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UOM</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!!orderContext}>
                            <FormControl>
                              <SelectTrigger className={orderContext ? "bg-muted" : ""}>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Ea">Ea</SelectItem>
                              <SelectItem value="pc">pc</SelectItem>
                              <SelectItem value="set">set</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="alternate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alternate</FormLabel>
                          <FormControl>
                            <Input placeholder="Optional" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="revision"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Revision</FormLabel>
                          <FormControl>
                            <Input placeholder="A" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Vendor field - only shown for Component type */}
                    {itemType === "Component" && (
                      <FormField
                        control={form.control}
                        name="vendor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor</FormLabel>
                            <FormControl>
                              <Input placeholder="Select or enter vendor" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="col-span-2 flex items-center space-x-4 pt-8">
                      <FormField
                        control={form.control}
                        name="implementedOnly"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="!mt-0">Implemented Only</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Tabbed Component Section */}
                  <Tabs defaultValue="main" className="w-full">
                    <TabsList
                      className={itemType === "Product" ? "grid w-full grid-cols-5" : "grid w-full grid-cols-4"}
                    >
                      <TabsTrigger value="main">Main</TabsTrigger>
                      <TabsTrigger value="component-details">Component Details</TabsTrigger>
                      {itemType === "Product" && <TabsTrigger value="operations">Operations</TabsTrigger>}
                      <TabsTrigger value="bill-details">Bill Details</TabsTrigger>
                      <TabsTrigger value="revision">Revision</TabsTrigger>
                    </TabsList>

                    <TabsContent value="main" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Component Structure</h3>
                        <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Component
                        </Button>
                      </div>

                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">Item Seq</TableHead>
                              <TableHead className="w-24">Op Seq</TableHead>
                              <TableHead>Component</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="w-20">Qty</TableHead>
                              <TableHead className="w-20">UOM</TableHead>
                              <TableHead className="w-32">Basis</TableHead>
                              <TableHead className="w-24">Unit Cost</TableHead>
                              <TableHead className="w-24">Total Cost</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {form.watch("components").map((comp, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.itemSeq`}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        className="h-8"
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.operationSeq`}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        className="h-8"
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.component`}
                                    render={({ field }) => (
                                      <Select
                                        onValueChange={(value) => {
                                          const selectedItem = inventoryItems.find((item) => item.itemCode === value);
                                          if (selectedItem) {
                                            // Check for duplicate component in the BOM
                                            const currentComponents = form.getValues("components");
                                            const isDuplicate = currentComponents.some(
                                              (comp, idx) => idx !== index && comp.component === value
                                            );

                                            if (isDuplicate) {
                                              toast({
                                                title: "Duplicate Component",
                                                description: `${selectedItem.itemCode} is already added to this BOM`,
                                                variant: "destructive",
                                              });
                                              return;
                                            }

                                            field.onChange(value);
                                            form.setValue(`components.${index}.description`, selectedItem.itemName);
                                            form.setValue(`components.${index}.unitCost`, selectedItem.unit_cost || 0);
                                            const quantity = form.watch(`components.${index}.quantity`);
                                            form.setValue(
                                              `components.${index}.totalCost`,
                                              (selectedItem.unit_cost || 0) * quantity,
                                            );

                                            toast({
                                              title: "Component Added",
                                              description: `${selectedItem.itemCode} - ${selectedItem.itemName} details loaded`,
                                            });
                                          }
                                        }}
                                        value={field.value}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="Select item" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Array.isArray(inventoryItems) && inventoryItems.map(item => (
                                            <SelectItem key={item.id} value={item.itemCode}>
                                              {item.itemCode} - {item.itemName}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.description`}
                                    render={({ field }) => (
                                      <Input
                                        placeholder="Auto-filled from inventory"
                                        {...field}
                                        className="h-8 bg-muted/50"
                                        readOnly
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.quantity`}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) => {
                                          const quantity = parseInt(e.target.value) || 0;
                                          field.onChange(quantity);
                                          const unitCost = form.watch(`components.${index}.unitCost`);
                                          form.setValue(`components.${index}.totalCost`, unitCost * quantity);
                                        }}
                                        className="h-8"
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.uom`}
                                    render={({ field }) => (
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Ea">Ea</SelectItem>
                                          <SelectItem value="pc">pc</SelectItem>
                                          <SelectItem value="set">set</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.basis`}
                                    render={({ field }) => (
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Item">Item</SelectItem>
                                          <SelectItem value="Lot">Lot</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.unitCost`}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => {
                                          const unitCost = parseFloat(e.target.value) || 0;
                                          field.onChange(unitCost);
                                          const quantity = form.watch(`components.${index}.quantity`);
                                          form.setValue(`components.${index}.totalCost`, unitCost * quantity);
                                        }}
                                        className="h-8"
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.totalCost`}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                        className="h-8 bg-muted"
                                        readOnly
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  {form.watch("components").length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeComponent(index)}
                                      className="h-8 w-8"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    <TabsContent value="component-details" className="space-y-4 mt-4">
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Component</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Planning %</TableHead>
                              <TableHead>Yield %</TableHead>
                              <TableHead>Cost Rollup</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {form.watch("components").map((comp, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{comp.component || "-"}</TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.type`}
                                    render={({ field }) => (
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Procurement">Procurement</SelectItem>
                                          <SelectItem value="Manufactured Item">Manufactured Item</SelectItem>
                                          <SelectItem value="Subassembly">Subassembly</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.status`}
                                    render={({ field }) => (
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Active">Active</SelectItem>
                                          <SelectItem value="Inactive">Inactive</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.planningPercent`}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        className="h-8"
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.yield`}
                                    render={({ field }) => (
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        className="h-8"
                                      />
                                    )}
                                  />
                                </TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`components.${index}.includeInCostRollup`}
                                    render={({ field }) => (
                                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    )}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>

                    {itemType === "Product" && (
                      <TabsContent value="operations" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Operation Routing</h3>
                          <Button type="button" variant="outline" size="sm" onClick={addOperation}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Operation
                          </Button>
                        </div>

                        {!form.watch("operations") || form.watch("operations").length === 0 ? (
                          <Card>
                            <CardContent className="pt-6">
                              <p className="text-muted-foreground text-center">
                                No operations added. Click "Add Operation" to define routing and costs.
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-24">Op Seq</TableHead>
                                  <TableHead>Operation Code</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Department</TableHead>
                                  <TableHead>Work Center</TableHead>
                                  <TableHead className="w-24">Routing</TableHead>
                                  <TableHead className="w-10"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {form.watch("operations")?.map((op, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      <FormField
                                        control={form.control}
                                        name={`operations.${index}.operationSeq`}
                                        render={({ field }) => (
                                          <Input
                                            type="number"
                                            {...field}
                                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                                            className="h-8"
                                          />
                                        )}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <FormField
                                        control={form.control}
                                        name={`operations.${index}.operationCode`}
                                        render={({ field }) => (
                                          <Input placeholder="OP-001" {...field} className="h-8" />
                                        )}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <FormField
                                        control={form.control}
                                        name={`operations.${index}.description`}
                                        render={({ field }) => (
                                          <Input placeholder="Operation description" {...field} className="h-8" />
                                        )}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <FormField
                                        control={form.control}
                                        name={`operations.${index}.department`}
                                        render={({ field }) => (
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger className="h-8">
                                              <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="Assembly">Assembly</SelectItem>
                                              <SelectItem value="Machining">Machining</SelectItem>
                                              <SelectItem value="Quality">Quality</SelectItem>
                                              <SelectItem value="Packing">Packing</SelectItem>
                                              <SelectItem value="Testing">Testing</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <FormField
                                        control={form.control}
                                        name={`operations.${index}.workCenter`}
                                        render={({ field }) => (
                                          <Input placeholder="Work center" {...field} className="h-8" />
                                        )}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <FormField
                                        control={form.control}
                                        name={`operations.${index}.routingEnabled`}
                                        render={({ field }) => (
                                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOperation(index)}
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

                        {/* Operation Costs Section */}
                        {form.watch("operations") && form.watch("operations").length > 0 && (
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Operation Costs</h3>
                            <div className="border rounded-lg">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Operation</TableHead>
                                    <TableHead>Labor Cost</TableHead>
                                    <TableHead>Machine Cost</TableHead>
                                    <TableHead>Overhead Cost</TableHead>
                                    <TableHead>Setup Time (min)</TableHead>
                                    <TableHead>Run Time (min)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {form.watch("operations")?.map((op, index) => (
                                    <TableRow key={index}>
                                      <TableCell className="font-medium">
                                        {op.operationCode || `Op ${op.operationSeq}`}
                                      </TableCell>
                                      <TableCell>
                                        <FormField
                                          control={form.control}
                                          name={`operations.${index}.laborCost`}
                                          render={({ field }) => (
                                            <Input
                                              type="number"
                                              step="0.01"
                                              placeholder="0.00"
                                              {...field}
                                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                              className="h-8"
                                            />
                                          )}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <FormField
                                          control={form.control}
                                          name={`operations.${index}.machineCost`}
                                          render={({ field }) => (
                                            <Input
                                              type="number"
                                              step="0.01"
                                              placeholder="0.00"
                                              {...field}
                                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                              className="h-8"
                                            />
                                          )}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <FormField
                                          control={form.control}
                                          name={`operations.${index}.overheadCost`}
                                          render={({ field }) => (
                                            <Input
                                              type="number"
                                              step="0.01"
                                              placeholder="0.00"
                                              {...field}
                                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                              className="h-8"
                                            />
                                          )}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <FormField
                                          control={form.control}
                                          name={`operations.${index}.setupTime`}
                                          render={({ field }) => (
                                            <Input
                                              type="number"
                                              step="1"
                                              placeholder="0"
                                              {...field}
                                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                              className="h-8"
                                            />
                                          )}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <FormField
                                          control={form.control}
                                          name={`operations.${index}.runTime`}
                                          render={({ field }) => (
                                            <Input
                                              type="number"
                                              step="1"
                                              placeholder="0"
                                              {...field}
                                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                              className="h-8"
                                            />
                                          )}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    )}

                    <TabsContent value="bill-details" className="mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground">Additional bill details will appear here.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="revision" className="mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-muted-foreground">Revision history will appear here.</p>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button  type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      {editingBomId ? "Update BOM" : "Create BOM"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by BOM ID or product name..." className="pl-10" />
              </div>
              <Button
                variant={showAllRevisions ? "default" : "outline"}
                onClick={() => setShowAllRevisions(!showAllRevisions)}
                className="whitespace-nowrap"
              >
                <History className="h-4 w-4 mr-2" />
                {showAllRevisions ? "Showing All Revisions" : "Show Revision History"}
              </Button>
              <Button variant="outline">Filter</Button>
            </div>
          </CardContent>
        </Card>

        {/* BOM List */}
        <Card>
          <CardHeader>
            <CardTitle>Indented Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Alternate</TableHead>
                  <TableHead>Revision</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBomData.map((bom) => (
                  <TableRow key={bom.id} className={bom.status === "Superseded" ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{bom.itemCode}</TableCell>
                    <TableCell>{bom.itemName}</TableCell>
                    <TableCell>
                      {bom.alternate ? (
                        <Badge variant="outline">{bom.alternate}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{bom.revision}</Badge>
                    </TableCell>
                    <TableCell>{bom.uom}</TableCell>
                    <TableCell>{bom.components} items</TableCell>
                    <TableCell>{getStatusBadge(bom.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewBOM(bom)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {bom.status !== "Superseded" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReviseDialog(bom)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Revise
                          </Button>
                        )}
                        {bom.status === "Superseded" && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Read-only
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBOM(bom)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View BOM Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bills of Material - {selectedBOM?.itemName}</DialogTitle>
              <DialogDescription>
                {selectedBOM?.itemCode} - Revision {selectedBOM?.revision}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Item</p>
                  <p className="font-medium">{selectedBOM?.itemCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alternate</p>
                  <p className="font-medium">{selectedBOM?.alternate || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Revision</p>
                  <p className="font-medium">{selectedBOM?.revision}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">UOM</p>
                  <p className="font-medium">{selectedBOM?.uom}</p>
                </div>
              </div>

              <Tabs defaultValue="main" className="w-full" onValueChange={(value) => {
                if (value === "revision-history" && selectedBOM) {
                  fetchRevisionHistory(selectedBOM.item_code);
                }
              }}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="main">Main</TabsTrigger>
                  <TabsTrigger value="component-details">Component Details</TabsTrigger>
                  <TabsTrigger value="operations">Operations</TabsTrigger>
                  <TabsTrigger value="bill-details">Bill Details</TabsTrigger>
                  <TabsTrigger value="revision-history">
                    <History className="h-4 w-4 mr-1" />
                    Revision History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="main" className="mt-4">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Seq</TableHead>
                          <TableHead>Operation Seq</TableHead>
                          <TableHead>Component</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead>Basis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBOM?.components?.length > 0 ? (
                          selectedBOM.components.map((comp: any) => (
                            <TableRow key={comp.id}>
                              <TableCell>{comp.item_seq}</TableCell>
                              <TableCell>{comp.operation_seq}</TableCell>
                              <TableCell className="font-medium">{comp.component}</TableCell>
                              <TableCell>{comp.description}</TableCell>
                              <TableCell>{comp.quantity}</TableCell>
                              <TableCell>{comp.uom}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{comp.basis}</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              No components found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="component-details" className="mt-4">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Component</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Planning %</TableHead>
                          <TableHead>Yield</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Total Cost</TableHead>
                          <TableHead>Cost Rollup</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBOM?.components?.length > 0 ? (
                          selectedBOM.components.map((comp: any) => {
                            const unitCost = Number(comp.unit_cost) || 0;
                            const totalCost = unitCost * (Number(comp.quantity) || 0);

                            return (
                              <TableRow key={comp.id}>
                                <TableCell className="font-medium">{comp.component}</TableCell>
                                <TableCell>{comp.type}</TableCell>
                                <TableCell>{comp.quantity}</TableCell>
                                <TableCell>
                                  <Badge>{comp.status}</Badge>
                                </TableCell>
                                <TableCell>{comp.planning_percent}%</TableCell>
                                <TableCell>{comp.yield}%</TableCell>
                                <TableCell>${unitCost.toFixed(2)}</TableCell>
                                <TableCell>${totalCost.toFixed(2)}</TableCell>
                                <TableCell>{comp.include_in_cost_rollup ? "✓" : "-"}</TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground">
                              No component details found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="operations" className="mt-4">
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Seq</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Work Center</TableHead>
                          <TableHead>Labor Cost</TableHead>
                          <TableHead>Machine Cost</TableHead>
                          <TableHead>Overhead Cost</TableHead>
                          <TableHead>Total Cost</TableHead>
                          <TableHead>Setup Time</TableHead>
                          <TableHead>Run Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(selectedBOM?.operations) && selectedBOM.operations.length > 0 ? (
                          selectedBOM.operations.map((op: any) => {
                            const labor = Number(op.labor_cost) || 0;
                            const machine = Number(op.machine_cost) || 0;
                            const overhead = Number(op.overhead_cost) || 0;
                            const total = labor + machine + overhead;

                            return (
                              <TableRow key={op.id}>
                                <TableCell>{op.operation_seq}</TableCell>
                                <TableCell className="font-medium">{op.operation_code}</TableCell>
                                <TableCell>{op.description}</TableCell>
                                <TableCell>{op.department}</TableCell>
                                <TableCell>{op.work_center || "-"}</TableCell>
                                <TableCell>${labor.toFixed(2)}</TableCell>
                                <TableCell>${machine.toFixed(2)}</TableCell>
                                <TableCell>${overhead.toFixed(2)}</TableCell>
                                <TableCell className="font-semibold">${total.toFixed(2)}</TableCell>
                                <TableCell>{op.setup_time} min</TableCell>
                                <TableCell>{op.run_time} min</TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={11} className="text-center text-muted-foreground">
                              No operations found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="bill-details" className="mt-4">
                  <Card>
                    <CardContent className="pt-6 space-y-6">
                      {/* Material Cost Summary */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Material Cost Summary</h3>
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Component</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Cost</TableHead>
                                <TableHead>Total Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.isArray(selectedBOM?.components) && selectedBOM.components.length > 0 ? (
                                selectedBOM.components.map((comp: any) => {
                                  const unitCost = Number(comp.unit_cost) || 0;
                                  const qty = Number(comp.quantity) || 0;
                                  const componentTotalCost = unitCost * qty;

                                  return (
                                    <TableRow key={comp.id}>
                                      <TableCell className="font-medium">{comp.component}</TableCell>
                                      <TableCell>{qty}</TableCell>
                                      <TableCell>${unitCost.toFixed(2)}</TableCell>
                                      <TableCell>${componentTotalCost.toFixed(2)}</TableCell>
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No components found
                                  </TableCell>
                                </TableRow>
                              )}

                              {/* Total Material Cost */}
                              {Array.isArray(selectedBOM?.components) && selectedBOM.components.length > 0 && (
                                <TableRow className="font-semibold bg-muted/50">
                                  <TableCell colSpan={3} className="text-right">
                                    Total Material Cost:
                                  </TableCell>
                                  <TableCell>
                                    $
                                    {selectedBOM.components
                                      .reduce((sum: number, comp: any) => {
                                        const unitCost = Number(comp.unit_cost) || 0;
                                        const qty = Number(comp.quantity) || 0;
                                        return sum + unitCost * qty;
                                      }, 0)
                                      .toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Operation Cost Summary */}
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Operation Cost Summary</h3>
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Operation</TableHead>
                                <TableHead>Labor Cost</TableHead>
                                <TableHead>Machine Cost</TableHead>
                                <TableHead>Overhead Cost</TableHead>
                                <TableHead>Total Cost</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Array.isArray(selectedBOM?.operations) && selectedBOM.operations.length > 0 ? (
                                selectedBOM.operations.map((op: any) => {
                                  const labor = Number(op.labor_cost) || 0;
                                  const machine = Number(op.machine_cost) || 0;
                                  const overhead = Number(op.overhead_cost) || 0;
                                  const totalOperationCost = labor + machine + overhead;

                                  return (
                                    <TableRow key={op.id}>
                                      <TableCell className="font-medium">{op.operation_code}</TableCell>
                                      <TableCell>${labor.toFixed(2)}</TableCell>
                                      <TableCell>${machine.toFixed(2)}</TableCell>
                                      <TableCell>${overhead.toFixed(2)}</TableCell>
                                      <TableCell>${totalOperationCost.toFixed(2)}</TableCell>
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    No operations found
                                  </TableCell>
                                </TableRow>
                              )}

                              {/* Total Operation Cost */}
                              {Array.isArray(selectedBOM?.operations) && selectedBOM.operations.length > 0 && (
                                <TableRow className="font-semibold bg-muted/50">
                                  <TableCell colSpan={4} className="text-right">
                                    Total Operation Cost:
                                  </TableCell>
                                  <TableCell>
                                    $
                                    {selectedBOM.operations
                                      .reduce((sum: number, op: any) => {
                                        const labor = Number(op.labor_cost) || 0;
                                        const machine = Number(op.machine_cost) || 0;
                                        const overhead = Number(op.overhead_cost) || 0;
                                        return sum + labor + machine + overhead;
                                      }, 0)
                                      .toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      {/* Total BOM Cost */}
                      <div className="border rounded-lg p-6 bg-primary/5">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Material Cost</p>
                            <p className="text-2xl font-bold">
                              $
                              {Array.isArray(selectedBOM?.components) && selectedBOM.components.length > 0
                                ? selectedBOM.components
                                  .reduce((sum: number, comp: any) => {
                                    const unitCost = Number(comp.unit_cost) || 0;
                                    const qty = Number(comp.quantity) || 0;
                                    return sum + unitCost * qty;
                                  }, 0)
                                  .toFixed(2)
                                : "0.00"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Operation Cost</p>
                            <p className="text-2xl font-bold">
                              $
                              {Array.isArray(selectedBOM?.operations) && selectedBOM.operations.length > 0
                                ? selectedBOM.operations
                                  .reduce((sum: number, op: any) => {
                                    const labor = Number(op.labor_cost) || 0;
                                    const machine = Number(op.machine_cost) || 0;
                                    const overhead = Number(op.overhead_cost) || 0;
                                    return sum + labor + machine + overhead;
                                  }, 0)
                                  .toFixed(2)
                                : "0.00"}
                            </p>
                          </div>
                          <div className="col-span-2 pt-4 border-t">
                            <p className="text-sm text-muted-foreground">Total BOM Cost</p>
                            <p className="text-3xl font-bold text-primary">
                              $
                              {(
                                (Array.isArray(selectedBOM?.components)
                                  ? selectedBOM.components.reduce((sum: number, comp: any) => {
                                    const unitCost = Number(comp.unit_cost) || 0;
                                    const qty = Number(comp.quantity) || 0;
                                    return sum + unitCost * qty;
                                  }, 0)
                                  : 0) +
                                (Array.isArray(selectedBOM?.operations)
                                  ? selectedBOM.operations.reduce((sum: number, op: any) => {
                                    const labor = Number(op.labor_cost) || 0;
                                    const machine = Number(op.machine_cost) || 0;
                                    const overhead = Number(op.overhead_cost) || 0;
                                    return sum + labor + machine + overhead;
                                  }, 0)
                                  : 0)
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Revision History Tab */}
                <TabsContent value="revision-history" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Revision History</h3>
                      <div className="flex items-center gap-2">
                        {revisionHistory.length >= 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCompareDialogOpen(true)}
                          >
                            <GitCompare className="h-4 w-4 mr-2" />
                            Compare Revisions
                          </Button>
                        )}
                        <Badge variant="outline">
                          {revisionHistory.length} revision(s)
                        </Badge>
                      </div>
                    </div>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Revision</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Created Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revisionHistory.length > 0 ? (
                            revisionHistory.map((rev: any) => (
                              <TableRow
                                key={rev.id}
                                className={rev.id === selectedBOM?.id ? "bg-primary/10" : ""}
                              >
                                <TableCell>
                                  <Badge variant={rev.id === selectedBOM?.id ? "default" : "secondary"}>
                                    {rev.revision}
                                  </Badge>
                                  {rev.id === selectedBOM?.id && (
                                    <span className="ml-2 text-xs text-primary">(Current)</span>
                                  )}
                                </TableCell>
                                <TableCell>{getStatusBadge(rev.status)}</TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {rev.revision_reason || (rev.revision === "A" ? "Initial version" : "-")}
                                </TableCell>
                                <TableCell>
                                  {new Date(rev.created_at).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No revision history found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>

        {/* Revision Confirmation Dialog */}
        <AlertDialog open={isReviseDialogOpen} onOpenChange={setIsReviseDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revise Bill of Materials</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to revise this BOM?
                <br /><br />
                <span className="text-foreground font-medium">
                  {revisionBOM?.itemCode} - {revisionBOM?.itemName}
                </span>
                <br />
                Current Revision: <Badge variant="secondary">{revisionBOM?.revision || "A"}</Badge>
                <br /><br />
                This will create a new revision and mark the current one as superseded (read-only).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div>
              <label className="text-sm font-medium">
                Reason for Revision <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Enter the reason for creating this revision..."
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="mt-2 mb-[20px]"
                rows={3}
              />
            </div>

            {/* Document Upload */}
      <div  className="mb-[20px]">
        <label className="text-sm font-medium">
          Document <span className="text-destructive">*</span>
        </label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xlsx" // specify allowed formats
          onChange={(e) => setRevisionDocument(e.target.files?.[0] || null)}
          className="mt-2"
        />
        {revisionDocument && (
          <p className="text-sm text-foreground/80 mt-1">
            Selected File: {revisionDocument.name}
          </p>
        )}
      </div>
    </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setRevisionBOM(null);
                setRevisionReason("");
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReviseBOM}
                disabled={!revisionReason.trim()}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Continue Revision
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Revision Compare Dialog */}
        <RevisionCompareDialog
          open={isCompareDialogOpen}
          onOpenChange={setIsCompareDialogOpen}
          revisions={revisionHistory}
          itemCode={selectedBOM?.itemCode || ""}
        />

        {/* Delete Confirmation Dialog */}
        <BOMDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setBomToDelete(null);
          }}
          bom={bomToDelete}
          onDeleteSuccess={handleDeleteSuccess}
        />
      </div>
    </Layout>
  );
};

export default BOM;
