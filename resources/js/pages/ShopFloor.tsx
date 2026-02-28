import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Play, CheckCircle, Clock, Factory, ArrowRight, AlertTriangle, XCircle, History } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ERP-style input component
const ErpInput = ({ className = "", ...props }: React.ComponentProps<"input">) => (
  <input
    className={`h-7 px-2 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] ${className}`}
    {...props}
  />
);

// ERP-style label
const ErpLabel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`text-xs font-medium text-gray-700 whitespace-nowrap ${className}`}>{children}</span>
);

interface MoveQuantity {
  inQueue: number;
  running: number;
  toMove: number;
  toReject: number;
  toScrap: number;
  rejected: number;
  scrapped: number;
  completed: number;
}

interface RejectionTransaction {
  seq: number;
  quantity: number;
  reason: string;
  timestamp: string;
  user: string;
}

interface MoveTransaction {
  id: string;
  seq: number;
  operationName: string;
  transactionType: 'start' | 'move' | 'reject' | 'scrap' | 'complete';
  quantity: number;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  timestamp: string;
  user: string;
}

const ShopFloor = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Load jobs from localStorage
  const [jobs, setJobs] = useState<any[]>(() => {
    const saved = localStorage.getItem("jobs");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isJobMoveDialogOpen, setIsJobMoveDialogOpen] = useState(false);
  
  // Move quantities state for each operation
  const [moveQuantities, setMoveQuantities] = useState<{ [seq: number]: MoveQuantity }>({});
  
  // Rejection reason dialog state
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  // History dialog state
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("jobs");
      if (saved) {
        setJobs(JSON.parse(saved));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also poll for changes (in case storage event doesn't fire in same tab)
    const interval = setInterval(handleStorageChange, 1000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Initialize move quantities when a job is selected
  useEffect(() => {
    if (selectedJob) {
      const qty = parseInt(selectedJob.quantity) || 0;
      const operations = selectedJob.operations || [];
      const sequences = operations.length > 0 
        ? operations.map((op: any, idx: number) => op.sequence || (idx + 1) * 10)
        : [10, 20, 30];
      
      // Load saved move quantities or initialize
      const savedMoveData = selectedJob.moveQuantities || {};
      
      const initialQuantities: { [seq: number]: MoveQuantity } = {};
      sequences.forEach((seq: number, idx: number) => {
        initialQuantities[seq] = savedMoveData[seq] || {
          inQueue: idx === 0 ? qty : 0,
          running: 0,
          toMove: 0,
          toReject: 0,
          toScrap: 0,
          rejected: 0,
          scrapped: 0,
          completed: 0,
        };
      });
      setMoveQuantities(initialQuantities);
    }
  }, [selectedJob]);

  const handleOpenJobMove = (job: any) => {
    setSelectedJob(job);
    setIsJobMoveDialogOpen(true);
  };

  // Update individual move quantity cell
  const updateMoveQuantity = (seq: number, field: keyof MoveQuantity, value: number) => {
    setMoveQuantities(prev => ({
      ...prev,
      [seq]: {
        ...prev[seq],
        [field]: value,
      },
    }));
  };

  // Calculate total active quantities (excluding rejected/scrapped which are removed from flow)
  const calculateTotalActiveQty = (quantities: { [seq: number]: MoveQuantity }) => {
    let totalActive = 0;
    Object.values(quantities).forEach(q => {
      totalActive += (q.inQueue || 0) + (q.running || 0) + (q.completed || 0);
    });
    return totalActive;
  };

  // Handle Move Transaction - moves quantities through the workflow
  // Flow: In Queue -> Running -> To Move -> Next Operation's In Queue (or Completed if last)
  const handleMoveTransaction = () => {
    const sequences = Object.keys(moveQuantities).map(Number).sort((a, b) => a - b);
    let hasChanges = false;
    let errorMessage = "";
    const jobQty = parseInt(selectedJob?.quantity) || 0;
    
    const newQuantities = { ...moveQuantities };
    const newTransactions: MoveTransaction[] = [];
    const operations = selectedJob?.operations || [];
    
    sequences.forEach((seq, idx) => {
      const current = newQuantities[seq];
      const toMoveQty = current.toMove || 0;
      
      if (toMoveQty > 0) {
        // Validate: toMove cannot exceed running quantity
        if (toMoveQty > current.running) {
          errorMessage = `Seq ${seq}: Cannot move ${toMoveQty} - only ${current.running} in Running.`;
          return;
        }
        
        // Validate: next operation's In Queue cannot exceed Job Quantity
        if (idx < sequences.length - 1) {
          const nextSeq = sequences[idx + 1];
          const nextInQueue = (newQuantities[nextSeq]?.inQueue || 0) + toMoveQty;
          if (nextInQueue > jobQty) {
            errorMessage = `Seq ${nextSeq}: In-Queue (${nextInQueue}) would exceed Job Quantity (${jobQty}). Rejected quantities cannot move forward.`;
            return;
          }
        }
        
        hasChanges = true;
        
        // Get operation name for logging
        const op = operations.find((o: any) => (o.sequence || 10) === seq);
        const opName = op?.name || op?.operationCode || op?.description || `Operation ${seq / 10}`;
        
        // Deduct from Running
        newQuantities[seq] = {
          ...newQuantities[seq],
          running: current.running - toMoveQty,
          toMove: 0,
        };
        
        // Move to next operation's In Queue or to Completed if last operation
        if (idx < sequences.length - 1) {
          const nextSeq = sequences[idx + 1];
          const nextOp = operations.find((o: any) => (o.sequence || 10) === nextSeq);
          const nextOpName = nextOp?.name || nextOp?.operationCode || nextOp?.description || `Operation ${nextSeq / 10}`;
          
          newQuantities[nextSeq] = {
            ...newQuantities[nextSeq],
            inQueue: (newQuantities[nextSeq]?.inQueue || 0) + toMoveQty,
          };
          
          // Log move transaction
          newTransactions.push({
            id: `TXN-${Date.now()}-${seq}`,
            seq,
            operationName: opName,
            transactionType: 'move',
            quantity: toMoveQty,
            fromStatus: `Running (${opName})`,
            toStatus: `In Queue (${nextOpName})`,
            timestamp: new Date().toISOString(),
            user: 'Current User',
          });
        } else {
          // Last operation - move to Completed
          newQuantities[seq] = {
            ...newQuantities[seq],
            completed: (newQuantities[seq].completed || 0) + toMoveQty,
          };
          
          // Log completion transaction
          newTransactions.push({
            id: `TXN-${Date.now()}-${seq}`,
            seq,
            operationName: opName,
            transactionType: 'complete',
            quantity: toMoveQty,
            fromStatus: `Running (${opName})`,
            toStatus: 'Completed',
            timestamp: new Date().toISOString(),
            user: 'Current User',
          });
        }
      }
    });
    
    if (errorMessage) {
      toast({
        title: "Move Transaction Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    
    // Final validation: total active quantities should not exceed job quantity
    const totalActive = calculateTotalActiveQty(newQuantities);
    if (totalActive > jobQty) {
      toast({
        title: "Move Transaction Error",
        description: `Total active quantity (${totalActive}) would exceed Job Quantity (${jobQty}). Check your quantities.`,
        variant: "destructive",
      });
      return;
    }
    
    if (hasChanges) {
      setMoveQuantities(newQuantities);
      
      // Update job status to "In Progress" and save move quantities with transactions
      const existingTransactions = selectedJob.moveTransactions || [];
      const updatedJobs = jobs.map((job: any) => {
        if (job.id === selectedJob.id) {
          const newStatus = job.status === "Released" || job.status === "Pending" ? "In Progress" : job.status;
          return { 
            ...job, 
            status: newStatus,
            moveQuantities: newQuantities,
            moveTransactions: [...existingTransactions, ...newTransactions],
          };
        }
        return job;
      });
      
      localStorage.setItem("jobs", JSON.stringify(updatedJobs));
      setJobs(updatedJobs);
      setSelectedJob((prev: any) => ({ 
        ...prev, 
        status: prev.status === "Released" || prev.status === "Pending" ? "In Progress" : prev.status,
        moveQuantities: newQuantities,
        moveTransactions: [...existingTransactions, ...newTransactions],
      }));
      
      toast({
        title: "Move Transaction Completed",
        description: "Quantities moved successfully. Job status updated.",
      });
    } else {
      toast({
        title: "No Quantities to Move",
        description: "Enter quantities in 'To Move' column first.",
        variant: "destructive",
      });
    }
  };

  // Move from In Queue to Running
  const handleMoveToRunning = (seq: number, qty: number) => {
    const current = moveQuantities[seq];
    const jobQty = parseInt(selectedJob?.quantity) || 0;
    
    // Validate: quantity cannot exceed what's in queue
    if (qty > current.inQueue) {
      toast({
        title: "Invalid Quantity",
        description: `Cannot move ${qty} - only ${current.inQueue} in queue.`,
        variant: "destructive",
      });
      return;
    }
    
    // Validate: In-Queue cannot exceed Job Quantity
    if (current.inQueue > jobQty) {
      toast({
        title: "Invalid In-Queue Quantity",
        description: `In-Queue (${current.inQueue}) exceeds Job Quantity (${jobQty}). This should not happen - please check the data.`,
        variant: "destructive",
      });
      return;
    }
    
    const newQuantities = {
      ...moveQuantities,
      [seq]: {
        ...current,
        inQueue: current.inQueue - qty,
        running: current.running + qty,
      },
    };
    
    // Final validation: total active quantities should not exceed job quantity
    const totalActive = calculateTotalActiveQty(newQuantities);
    if (totalActive > jobQty) {
      toast({
        title: "Invalid Operation",
        description: `Total active quantity (${totalActive}) would exceed Job Quantity (${jobQty}).`,
        variant: "destructive",
      });
      return;
    }
    
    // Log the transaction
    const transaction: MoveTransaction = {
      id: `TXN-${Date.now()}`,
      seq,
      operationName: getOperationName(seq),
      transactionType: 'start',
      quantity: qty,
      fromStatus: 'In Queue',
      toStatus: 'Running',
      timestamp: new Date().toISOString(),
      user: 'Current User',
    };
    
    setMoveQuantities(newQuantities);
    saveJobMoveQuantities(newQuantities, [transaction]);
  };

  // Save move quantities to job
  const saveJobMoveQuantities = (quantities: { [seq: number]: MoveQuantity }, newTransactions?: MoveTransaction[]) => {
    const updatedJobs = jobs.map((job: any) => {
      if (job.id === selectedJob.id) {
        const newStatus = job.status === "Released" || job.status === "Pending" ? "In Progress" : job.status;
        const existingTransactions = job.moveTransactions || [];
        return { 
          ...job, 
          status: newStatus,
          moveQuantities: quantities,
          moveTransactions: newTransactions ? [...existingTransactions, ...newTransactions] : existingTransactions,
        };
      }
      return job;
    });
    
    localStorage.setItem("jobs", JSON.stringify(updatedJobs));
    setJobs(updatedJobs);
    setSelectedJob((prev: any) => {
      const existingTransactions = prev.moveTransactions || [];
      return { 
        ...prev, 
        status: prev.status === "Released" || prev.status === "Pending" ? "In Progress" : prev.status,
        moveQuantities: quantities,
        moveTransactions: newTransactions ? [...existingTransactions, ...newTransactions] : existingTransactions,
      };
    });
  };

  // Get operation name by sequence
  const getOperationName = (seq: number) => {
    const operations = selectedJob?.operations || [];
    const op = operations.find((o: any) => (o.sequence || 10) === seq);
    return op?.name || op?.operationCode || op?.description || `Operation ${seq / 10}`;
  };

  // Check if there are quantities to reject
  const hasRejectQuantities = () => {
    const sequences = Object.keys(moveQuantities).map(Number);
    return sequences.some((seq) => (moveQuantities[seq]?.toReject || 0) > 0);
  };

  // Open reject dialog
  const openRejectDialog = () => {
    if (!hasRejectQuantities()) {
      toast({
        title: "No Quantities to Reject",
        description: "Enter quantities in 'To Reject' column first.",
        variant: "destructive",
      });
      return;
    }
    setRejectReason("");
    setIsRejectDialogOpen(true);
  };

  // Handle Reject Transaction - moves quantities from Running to Rejected (cannot proceed further)
  const handleRejectTransaction = () => {
    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please enter a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    const sequences = Object.keys(moveQuantities).map(Number).sort((a, b) => a - b);
    let hasChanges = false;
    let errorMessage = "";
    
    const newQuantities = { ...moveQuantities };
    const newRejectionTransactions: RejectionTransaction[] = [];
    const newMoveTransactions: MoveTransaction[] = [];
    
    sequences.forEach((seq) => {
      const current = newQuantities[seq];
      const toRejectQty = current.toReject || 0;
      
      if (toRejectQty > 0) {
        // Validate: toReject cannot exceed running quantity
        if (toRejectQty > current.running) {
          errorMessage = `Seq ${seq}: Cannot reject ${toRejectQty} - only ${current.running} in Running.`;
          return;
        }
        
        hasChanges = true;
        const opName = getOperationName(seq);
        
        // Record rejection transaction (legacy)
        newRejectionTransactions.push({
          seq,
          quantity: toRejectQty,
          reason: rejectReason.trim(),
          timestamp: new Date().toISOString(),
          user: "Current User",
        });
        
        // Record move transaction for history
        newMoveTransactions.push({
          id: `TXN-${Date.now()}-${seq}`,
          seq,
          operationName: opName,
          transactionType: 'reject',
          quantity: toRejectQty,
          fromStatus: 'Running',
          toStatus: 'Rejected',
          reason: rejectReason.trim(),
          timestamp: new Date().toISOString(),
          user: 'Current User',
        });
        
        // Deduct from Running and add to Rejected (rejected stays at this operation, cannot move forward)
        newQuantities[seq] = {
          ...newQuantities[seq],
          running: current.running - toRejectQty,
          toReject: 0,
          rejected: (current.rejected || 0) + toRejectQty,
        };
      }
    });
    
    if (errorMessage) {
      toast({
        title: "Reject Transaction Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    
    if (hasChanges) {
      // Save with rejection history
      const existingRejections = selectedJob.rejectionTransactions || [];
      const existingMoveTransactions = selectedJob.moveTransactions || [];
      const updatedJobs = jobs.map((job: any) => {
        if (job.id === selectedJob.id) {
          const newStatus = job.status === "Released" || job.status === "Pending" ? "In Progress" : job.status;
          return { 
            ...job, 
            status: newStatus,
            moveQuantities: newQuantities,
            rejectionTransactions: [...existingRejections, ...newRejectionTransactions],
            moveTransactions: [...existingMoveTransactions, ...newMoveTransactions],
          };
        }
        return job;
      });
      
      localStorage.setItem("jobs", JSON.stringify(updatedJobs));
      setJobs(updatedJobs);
      setSelectedJob((prev: any) => ({ 
        ...prev, 
        status: prev.status === "Released" || prev.status === "Pending" ? "In Progress" : prev.status,
        moveQuantities: newQuantities,
        rejectionTransactions: [...existingRejections, ...newRejectionTransactions],
        moveTransactions: [...existingMoveTransactions, ...newMoveTransactions],
      }));
      setMoveQuantities(newQuantities);
      
      setIsRejectDialogOpen(false);
      setRejectReason("");
      
      toast({
        title: "Reject Transaction Completed",
        description: "Rejected quantities recorded with reason. These cannot move to next operations.",
      });
    }
  };

  // Handle Scrap Transaction - moves quantities from Running to Scrapped
  const handleScrapTransaction = () => {
    const sequences = Object.keys(moveQuantities).map(Number).sort((a, b) => a - b);
    let hasChanges = false;
    let errorMessage = "";
    
    const newQuantities = { ...moveQuantities };
    
    sequences.forEach((seq) => {
      const current = newQuantities[seq];
      const toScrapQty = current.toScrap || 0;
      
      if (toScrapQty > 0) {
        // Validate: toScrap cannot exceed running quantity
        if (toScrapQty > current.running) {
          errorMessage = `Seq ${seq}: Cannot scrap ${toScrapQty} - only ${current.running} in Running.`;
          return;
        }
        
        hasChanges = true;
        
        // Deduct from Running and add to Scrapped
        newQuantities[seq] = {
          ...newQuantities[seq],
          running: current.running - toScrapQty,
          toScrap: 0,
          scrapped: (current.scrapped || 0) + toScrapQty,
        };
      }
    });
    
    if (errorMessage) {
      toast({
        title: "Scrap Transaction Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    
    if (hasChanges) {
      setMoveQuantities(newQuantities);
      saveJobMoveQuantities(newQuantities);
      
      toast({
        title: "Scrap Transaction Completed",
        description: "Scrapped quantities recorded.",
      });
    } else {
      toast({
        title: "No Quantities to Scrap",
        description: "Enter quantities in 'To Scrap' column first.",
        variant: "destructive",
      });
    }
  };

  // Check if job is complete (all quantities in completed column of last operation)
  const checkJobCompletion = () => {
    const sequences = Object.keys(moveQuantities).map(Number).sort((a, b) => a - b);
    if (sequences.length === 0) return;
    
    const lastSeq = sequences[sequences.length - 1];
    const lastOp = moveQuantities[lastSeq];
    const totalQty = parseInt(selectedJob?.quantity) || 0;
    
    if (lastOp.completed >= totalQty) {
      const updatedJobs = jobs.map((job: any) => {
        if (job.id === selectedJob.id) {
          return { ...job, status: "Completed", moveQuantities };
        }
        return job;
      });
      
      localStorage.setItem("jobs", JSON.stringify(updatedJobs));
      setJobs(updatedJobs);
      setSelectedJob((prev: any) => ({ ...prev, status: "Completed" }));
      
      toast({
        title: "Job Completed!",
        description: `Job ${selectedJob.id} has been completed successfully.`,
      });
    }
  };

  useEffect(() => {
    if (selectedJob && Object.keys(moveQuantities).length > 0) {
      checkJobCompletion();
    }
  }, [moveQuantities]);

  const filteredJobs = jobs.filter((job: any) => {
    const matchesSearch = 
      job.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.productName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusStyles: { [key: string]: string } = {
      "Released": "bg-green-100 text-green-800 hover:bg-green-100",
      "In Progress": "bg-blue-100 text-blue-800 hover:bg-blue-100",
      "Pending": "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      "Completed": "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
    return statusStyles[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Shop Floor</h1>
              <p className="text-muted-foreground mt-1">
                Track and manage job movements on the production floor
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by job number or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Released">Released</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No jobs available. Create jobs from the Planning module.</p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job: any) => (
              <Card 
                key={job.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleOpenJobMove(job)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{job.id}</CardTitle>
                    <Badge className={getStatusBadge(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                  <CardDescription>{job.productName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="ml-2 font-medium">{job.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due:</span>
                      <span className="ml-2 font-medium">{job.dueDate}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 ${job.priority === "High" ? "border-red-500 text-red-500" : ""}`}
                      >
                        {job.priority}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Operations:</span>
                      <span className="ml-2 font-medium">{job.operations?.length || 0}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenJobMove(job);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Open Job Move
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Job Move Dialog */}
        <Dialog open={isJobMoveDialogOpen} onOpenChange={setIsJobMoveDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
            {/* ERP-style Header */}
            <div className="bg-gradient-to-r from-[#2c5282] to-[#1a365d] text-white px-4 py-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Shop Floor - Job Move</h2>
                <span className="text-xs opacity-80">Job: {selectedJob?.id}</span>
              </div>
            </div>

            {selectedJob && (
              <div className="p-4 space-y-4 bg-[#e8e8d8]">
                {/* Job Info Section */}
                <div className="grid grid-cols-4 gap-4 bg-[#f0f0e0] p-3 border border-[#b8b8a0]">
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-16 text-right">Job:</ErpLabel>
                    <ErpInput value={selectedJob.id} readOnly className="flex-1 bg-gray-100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-16 text-right">Product:</ErpLabel>
                    <ErpInput value={selectedJob.productName || ""} readOnly className="flex-1 bg-gray-100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-16 text-right">Quantity:</ErpLabel>
                    <ErpInput value={selectedJob.quantity || ""} readOnly className="flex-1 bg-gray-100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <ErpLabel className="w-16 text-right">Status:</ErpLabel>
                    <Badge 
                      className={`text-xs ${
                        selectedJob.status === "In Progress" 
                          ? "bg-blue-500 hover:bg-blue-600" 
                          : selectedJob.status === "Released"
                          ? "bg-green-500 hover:bg-green-600"
                          : selectedJob.status === "Completed"
                          ? "bg-gray-500 hover:bg-gray-600"
                          : "bg-yellow-500 hover:bg-yellow-600"
                      }`}
                    >
                      {selectedJob.status}
                    </Badge>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0] text-gray-700"
                    onClick={handleMoveTransaction}
                    disabled={selectedJob.status === "Completed"}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Move Transaction
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
                    onClick={openRejectDialog}
                    disabled={selectedJob.status === "Completed"}
                  >
                    Reject
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0] text-gray-700"
                    onClick={() => setIsHistoryDialogOpen(true)}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    View History
                  </Button>
                  {selectedJob.status === "Completed" && (
                    <Badge className="bg-green-600 ml-auto">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Job Complete
                    </Badge>
                  )}
                </div>
                
                {/* Move Table */}
                <div className="border border-[#b8b8a0] overflow-auto bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#d8d8c8] hover:bg-[#d8d8c8]">
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] w-12">Seq</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Operation</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] bg-green-50">In Queue</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Start Qty</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] bg-blue-50">Running</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] bg-yellow-50">To Move</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0] bg-red-50">To Reject</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Rejected</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 border-r border-[#b8b8a0]">Completed</TableHead>
                        <TableHead className="text-[11px] py-1 px-2 font-medium text-gray-700 w-16 text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const operations = selectedJob.operations || [];
                        const sequences = operations.length > 0 
                          ? operations.map((op: any, idx: number) => ({ seq: op.sequence || (idx + 1) * 10, op }))
                          : [10, 20, 30].map(seq => ({ seq, op: null }));
                        
                        return sequences.map(({ seq, op }: { seq: number; op: any }, index: number) => {
                          const qtyData = moveQuantities[seq] || { inQueue: 0, running: 0, toMove: 0, toReject: 0, toScrap: 0, rejected: 0, scrapped: 0, completed: 0 };
                          const startQtyId = `startQty_${seq}`;
                          
                          return (
                            <TableRow 
                              key={seq} 
                              className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 border-b border-[#b8b8a0]`}
                            >
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <div className="flex items-center">
                                  <span className="w-1 h-4 bg-blue-600 mr-1"></span>
                                  {seq}
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                {op?.name || op?.operationCode || op?.description || `Operation ${seq/10}`}
                              </TableCell>
                              {/* In Queue - Read Only */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0] bg-green-50">
                                <span className="font-medium text-green-700">{qtyData.inQueue}</span>
                              </TableCell>
                              {/* Start Qty - User enters how much to start */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <input 
                                  id={startQtyId}
                                  type="number" 
                                  min="0"
                                  max={qtyData.inQueue}
                                  defaultValue={0}
                                  className="w-full h-5 px-1 text-[11px] border border-gray-300 bg-white focus:outline-none focus:border-blue-400"
                                  disabled={selectedJob.status === "Completed" || qtyData.inQueue === 0}
                                />
                              </TableCell>
                              {/* Running - Read Only */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0] bg-blue-50">
                                <span className="font-medium text-blue-700">{qtyData.running}</span>
                              </TableCell>
                              {/* To Move - User enters how much to move to next */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0] bg-yellow-50">
                                <input 
                                  type="number" 
                                  min="0"
                                  max={qtyData.running}
                                  value={qtyData.toMove || 0}
                                  onChange={(e) => updateMoveQuantity(seq, 'toMove', Math.min(parseInt(e.target.value) || 0, qtyData.running))}
                                  className="w-full h-5 px-1 text-[11px] border border-gray-300 bg-yellow-50 focus:outline-none focus:border-blue-400"
                                  disabled={selectedJob.status === "Completed" || qtyData.running === 0}
                                />
                              </TableCell>
                              {/* To Reject - User enters how much to reject from Running */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0] bg-red-50">
                                <input 
                                  type="number" 
                                  min="0"
                                  max={qtyData.running}
                                  value={qtyData.toReject || 0}
                                  onChange={(e) => updateMoveQuantity(seq, 'toReject', Math.min(parseInt(e.target.value) || 0, qtyData.running))}
                                  className="w-full h-5 px-1 text-[11px] border border-gray-300 bg-red-50 focus:outline-none focus:border-red-400"
                                  disabled={selectedJob.status === "Completed" || qtyData.running === 0}
                                />
                              </TableCell>
                              {/* Rejected - Read Only (cumulative) */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <span className="font-medium text-red-600">{qtyData.rejected}</span>
                              </TableCell>
                              {/* Completed - Read Only */}
                              <TableCell className="text-[11px] py-1 px-2 border-r border-[#b8b8a0]">
                                <span className="font-medium text-gray-600">{qtyData.completed}</span>
                              </TableCell>
                              {/* Action Button */}
                              <TableCell className="text-[11px] py-1 px-2 text-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-5 px-2 text-[10px] bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                                  disabled={selectedJob.status === "Completed" || qtyData.inQueue === 0}
                                  onClick={() => {
                                    const inputEl = document.getElementById(startQtyId) as HTMLInputElement;
                                    const startQty = parseInt(inputEl?.value) || 0;
                                    if (startQty > 0 && startQty <= qtyData.inQueue) {
                                      handleMoveToRunning(seq, startQty);
                                      inputEl.value = "0";
                                    } else if (startQty > qtyData.inQueue) {
                                      toast({
                                        title: "Invalid Quantity",
                                        description: `Cannot start ${startQty} - only ${qtyData.inQueue} in queue.`,
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  Start
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-[#b8b8a0]">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsJobMoveDialogOpen(false)}
                    className="bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0]"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Rejection Reason Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="sm:max-w-md bg-[#e8e8d8] border-[#b8b8a0]">
            <div className="space-y-4">
              <div className="bg-[#4a5568] text-white px-4 py-2 -mx-6 -mt-6">
                <h3 className="text-sm font-semibold">Rejection Reason</h3>
              </div>
              
              <div className="space-y-3 pt-2">
                <div>
                  <ErpLabel>Reason for Rejection *</ErpLabel>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejecting the quantity..."
                    className="w-full h-24 px-2 py-1 text-sm bg-[#fffff0] text-gray-800 border border-[#b8b8a0] focus:outline-none focus:ring-1 focus:ring-[#b8b8a0] resize-none mt-1"
                  />
                </div>
                
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Note:</span> Rejected quantities will be recorded with this reason and timestamp.
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2 border-t border-[#b8b8a0]">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsRejectDialogOpen(false);
                    setRejectReason("");
                  }}
                  className="bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0]"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleRejectTransaction}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden p-0 bg-[#e8e8d8] border-[#b8b8a0]">
            <div className="bg-gradient-to-r from-[#2c5282] to-[#1a365d] text-white px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  <h2 className="text-sm font-medium">Transaction History</h2>
                </div>
                <span className="text-xs opacity-80">Job: {selectedJob?.id}</span>
              </div>
            </div>
            
            <div className="p-4">
              <ScrollArea className="h-[60vh]">
                {(() => {
                  const transactions = selectedJob?.moveTransactions || [];
                  
                  if (transactions.length === 0) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No transactions recorded yet.</p>
                        <p className="text-sm mt-2">Transactions will appear here when you move, start, reject, or complete quantities.</p>
                      </div>
                    );
                  }
                  
                  // Sort transactions by timestamp descending (most recent first)
                  const sortedTransactions = [...transactions].sort((a: MoveTransaction, b: MoveTransaction) => 
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                  );
                  
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#d8d8c8] hover:bg-[#d8d8c8]">
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Timestamp</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Type</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Operation</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Qty</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">From → To</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">Reason</TableHead>
                          <TableHead className="text-[11px] py-2 px-3 font-medium text-gray-700">User</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedTransactions.map((txn: MoveTransaction, idx: number) => {
                          const getTypeIcon = () => {
                            switch (txn.transactionType) {
                              case 'start': return <Play className="h-3 w-3 text-green-600" />;
                              case 'move': return <ArrowRight className="h-3 w-3 text-blue-600" />;
                              case 'reject': return <XCircle className="h-3 w-3 text-red-600" />;
                              case 'scrap': return <AlertTriangle className="h-3 w-3 text-orange-600" />;
                              case 'complete': return <CheckCircle className="h-3 w-3 text-green-600" />;
                              default: return <Clock className="h-3 w-3 text-gray-600" />;
                            }
                          };
                          
                          const getTypeBadge = () => {
                            const styles: Record<string, string> = {
                              start: "bg-green-100 text-green-700 border-green-300",
                              move: "bg-blue-100 text-blue-700 border-blue-300",
                              reject: "bg-red-100 text-red-700 border-red-300",
                              scrap: "bg-orange-100 text-orange-700 border-orange-300",
                              complete: "bg-emerald-100 text-emerald-700 border-emerald-300",
                            };
                            return styles[txn.transactionType] || "bg-gray-100 text-gray-700 border-gray-300";
                          };
                          
                          return (
                            <TableRow 
                              key={txn.id || idx} 
                              className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
                            >
                              <TableCell className="text-[11px] py-2 px-3">
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {new Date(txn.timestamp).toLocaleDateString()}
                                  </span>
                                  <span className="text-gray-500">
                                    {new Date(txn.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3">
                                <div className="flex items-center gap-1">
                                  {getTypeIcon()}
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] ${getTypeBadge()}`}
                                  >
                                    {txn.transactionType.charAt(0).toUpperCase() + txn.transactionType.slice(1)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-600 font-medium">Seq {txn.seq}</span>
                                  <span className="text-gray-500">-</span>
                                  <span>{txn.operationName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3 font-semibold">
                                {txn.quantity}
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3">
                                <div className="flex items-center gap-1 text-gray-600">
                                  <span>{txn.fromStatus}</span>
                                  <ArrowRight className="h-3 w-3" />
                                  <span>{txn.toStatus}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3 max-w-[150px]">
                                {txn.reason ? (
                                  <span className="text-red-600 truncate block" title={txn.reason}>
                                    {txn.reason}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-[11px] py-2 px-3 text-gray-600">
                                {txn.user}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()}
              </ScrollArea>
              
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-[#b8b8a0]">
                <span className="text-xs text-gray-600">
                  Total transactions: {(selectedJob?.moveTransactions || []).length}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsHistoryDialogOpen(false)}
                  className="bg-[#d8d8c8] hover:bg-[#c8c8b8] border-[#b8b8a0]"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ShopFloor;
