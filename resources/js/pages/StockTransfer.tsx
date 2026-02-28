import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const StockTransfer = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Stock Transfer</h1>
          <p className="text-muted-foreground mt-2">Transfer stock between locations</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stock Transfer Management</CardTitle>
            <CardDescription>Create and track stock transfers between warehouses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Stock Transfer module coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StockTransfer;
