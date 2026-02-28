import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

const POApproval = () => {
  const [pendingPOs, setPendingPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    poNumber: string;
    action: "Approved" | "Cancel";
  }>({ open: false, poNumber: "", action: "Approved" });
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingPOs();

    // Set up real-time subscription for purchase_orders changes
    const channel = supabase
      .channel('po-approval-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
          filter: 'status=eq.Awaiting Approval'
        },
        () => {
          // Refetch when any change occurs to pending approval POs
          fetchPendingPOs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingPOs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items(*)
        `)
        .eq('status', 'Awaiting Approval')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedPOs = data?.map(po => {
        const totalAmount = po.purchase_order_items?.reduce((sum: number, item: any) => 
          sum + Number(item.total || 0), 0
        ) || 0;

        const itemCount = po.purchase_order_items?.length || 0;

        return {
          id: po.id,
          poNumber: po.po_number,
          vendor: po.vendor,
          date: new Date(po.po_date).toISOString().split('T')[0],
          amount: `$${totalAmount.toFixed(2)}`,
          status: po.status,
          items: itemCount,
          deliveryDate: po.delivery_date ? new Date(po.delivery_date).toISOString().split('T')[0] : '-',
        };
      }) || [];

      setPendingPOs(formattedPOs);
    } catch (error: any) {
      toast({
        title: "Error Fetching POs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (poNumber: string, action: "Approved" | "Cancel") => {
    setConfirmDialog({ open: true, poNumber, action });
  };

  const handleConfirmAction = async () => {
    const { poNumber, action } = confirmDialog;
    setConfirmDialog({ open: false, poNumber: "", action: "Approved" });

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: action })
        .eq('po_number', poNumber);

      if (error) throw error;

      const statusMessages: Record<string, string> = {
        "Approved": "approved successfully",
        "Cancel": "cancelled",
      };

      toast({
        title: "Status Updated",
        description: `PO ${poNumber} has been ${statusMessages[action] || 'updated'}`,
      });

      fetchPendingPOs();
    } catch (error: any) {
      toast({
        title: "Error Updating Status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      "Awaiting Approval": "outline",
      "Approved": "default",
      "Cancel": "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">PO Approval</h1>
            <p className="text-muted-foreground mt-2">Review and approve pending purchase orders</p>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchPendingPOs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders Awaiting Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Loading pending purchase orders...
                    </TableCell>
                  </TableRow>
                ) : pendingPOs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No purchase orders pending approval.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingPOs.map((po) => (
                    <TableRow key={po.poNumber}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.vendor}</TableCell>
                      <TableCell>{po.date}</TableCell>
                      <TableCell>{po.deliveryDate}</TableCell>
                      <TableCell>{po.items}</TableCell>
                      <TableCell>{po.amount}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openConfirmDialog(po.poNumber, "Approved")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openConfirmDialog(po.poNumber, "Cancel")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "Approved" ? "Approve Purchase Order" : "Cancel Purchase Order"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "Approved" 
                ? `Are you sure you want to approve PO ${confirmDialog.poNumber}? This will allow the order to proceed.`
                : `Are you sure you want to cancel PO ${confirmDialog.poNumber}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmDialog.action === "Cancel" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmDialog.action === "Approved" ? "Yes, approve" : "Yes, cancel PO"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default POApproval;
