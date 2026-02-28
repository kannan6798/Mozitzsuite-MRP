import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const InventoryApprovals = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Inventory Approvals</h1>
          <p className="text-muted-foreground mt-2">Approve or reject inventory transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Approval Management</CardTitle>
            <CardDescription>Review and approve pending inventory transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Inventory Approvals module coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default InventoryApprovals;
