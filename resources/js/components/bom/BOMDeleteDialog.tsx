import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "@/components/ui/use-toast";

interface BOMDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bom: any;
  onDeleteSuccess: () => void;
}

interface ValidationResult {
  isValid: boolean;
  activeJobsCount: number;
  openOrdersCount: number;
  isLoading: boolean;
}

const BOMDeleteDialog = ({ isOpen, onClose, bom, onDeleteSuccess }: BOMDeleteDialogProps) => {
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: false,
    activeJobsCount: 0,
    openOrdersCount: 0,
    isLoading: true,
  });

  useEffect(() => {
    if (isOpen && bom) {
      validateBOMDeletion();
    }
  }, [isOpen, bom]);

  const validateBOMDeletion = async () => {
  if (!bom) return;

  setValidation((prev) => ({ ...prev, isLoading: true }));

  try {
    // Fetch active job allocations linked to this BOM's item_code
    const response = await axios.get(`/api/job-allocations`, {
      params: {
        item_code: bom.itemCode,
        status: ["allocated", "released"], // Assuming your API supports filtering by array
      },
    });

    const activeJobs = response.data || [];
    const activeJobsCount = activeJobs.length;

    // For now, open orders count is 0 (update when orders table/API exists)
    const openOrdersCount = 0;

    setValidation({
      isValid: activeJobsCount === 0 && openOrdersCount === 0,
      activeJobsCount,
      openOrdersCount,
      isLoading: false,
    });
  } catch (error: any) {
    console.error("Validation error:", error?.response?.data?.message || error.message);
    setValidation({
      isValid: false,
      activeJobsCount: 0,
      openOrdersCount: 0,
      isLoading: false,
    });
  }
};


const handleDelete = async () => {
  if (!bom || !deleteReason?.trim()) {
    toast({
      title: "Deletion reason required",
      description: "Please provide a reason before deleting this BOM.",
    });
    return;
  }

  setIsDeleting(true);

  try {
    // 1️⃣ Get current user (adjust endpoint to your auth API)
    const { data: userData } = await axios.get("/api/user");
    const user = userData?.user;
    

    // 2️⃣ Log the deletion
    await axios.post("/api/bom-deletion-logs", {
      bom_id: bom.id,
      item_code: bom.itemCode,
      item_name: bom.itemName,
      revision: bom.revision,
      deleted_by: user ? `${user.name} (${user.email})` : "User",
      reason: deleteReason,
    });

    // 3️⃣ Delete BOM components
    await axios.delete("/api/bom-components", {
      data: { bom_id: bom.id }, // Laravel prefers DELETE with JSON body
    });

    // 4️⃣ Delete BOM operations
    await axios.delete("/api/bom-operations", {
      data: { bom_id: bom.id },
    });

    // 5️⃣ Delete BOM header
    await axios.delete(`/api/bom-headers/${bom.id}`);

    // ✅ Success
    toast({
      title: "BOM Deleted",
      description: `${bom.itemCode} - ${bom.itemName} has been deleted successfully.`,
    });

    onDeleteSuccess();
    onClose();
    setDeleteReason("");
  } catch (error: any) {
    console.error("Delete error:", error?.response?.data?.message || error.message);
    toast({
      title: "Deletion Failed",
      description: error?.response?.data?.message || "Something went wrong.",
    });
  } finally {
    setIsDeleting(false);
  }
};


  const ValidationItem = ({ label, isValid, count }: { label: string; isValid: boolean; count?: number }) => (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        {count !== undefined && count > 0 && (
          <Badge variant="destructive" className="text-xs">
            {count} found
          </Badge>
        )}
        {isValid ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-destructive" />
        )}
      </div>
    </div>
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete BOM</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete BOM for "{bom?.itemCode} - {bom?.itemName}"?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Validation Checklist */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-medium text-sm mb-3">Validation Checklist</h4>
            {validation.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Checking...</span>
              </div>
            ) : (
              <div className="space-y-1">
                <ValidationItem
                  label="No Active Jobs"
                  isValid={validation.activeJobsCount === 0}
                  count={validation.activeJobsCount}
                />
                <ValidationItem
                  label="No Open Orders"
                  isValid={validation.openOrdersCount === 0}
                  count={validation.openOrdersCount}
                />
              </div>
            )}
          </div>

          {/* Validation Result */}
          {!validation.isLoading && !validation.isValid && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                Cannot delete this BOM. Please resolve the issues above first.
              </p>
            </div>
          )}

          {/* Deletion Reason */}
          {validation.isValid && (
            <div className="space-y-2">
              <Label htmlFor="deleteReason">Reason for Deletion (Optional)</Label>
              <Textarea
                id="deleteReason"
                placeholder="Enter reason for deletion..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!validation.isValid || validation.isLoading || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete BOM"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BOMDeleteDialog;
