import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const StockTransferApproval = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Stock Transfer Approval</h1>
          <p className="text-muted-foreground mt-2">Approve or reject stock transfers</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stock Transfer Approvals</CardTitle>
            <CardDescription>Review and approve pending stock transfers</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Stock Transfer Approval module coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StockTransferApproval;
