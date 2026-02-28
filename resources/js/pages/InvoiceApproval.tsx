import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const InvoiceApproval = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Invoice Approval</h1>
          <p className="text-muted-foreground mt-2">Approve or reject invoices</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Approvals</CardTitle>
            <CardDescription>Review and approve pending invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Invoice Approval module coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default InvoiceApproval;
