import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Barcode = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Barcode Management</h1>
          <p className="text-muted-foreground mt-2">Generate and scan barcodes for inventory</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Barcode System</CardTitle>
            <CardDescription>Create, print, and scan barcodes for efficient inventory tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Barcode module coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Barcode;
