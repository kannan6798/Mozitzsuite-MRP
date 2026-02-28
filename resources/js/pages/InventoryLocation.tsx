import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const InventoryLocation = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Inventory Location</h1>
          <p className="text-muted-foreground mt-2">Manage warehouse locations and zones</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Location Management</CardTitle>
            <CardDescription>Configure and track inventory across different locations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Inventory Location module coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default InventoryLocation;
