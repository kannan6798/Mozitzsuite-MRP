import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import LedgerEntryForm from "@/components/ledger/LedgerEntryForm";
import LedgerView from "@/components/ledger/LedgerView";

const Ledger = () => {
  const [activeTab, setActiveTab] = useState("view");

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ledger</h1>
            <p className="text-muted-foreground mt-2">Track debit and credit entries</p>
          </div>
          <Button 
            onClick={() => setActiveTab("entry")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="view">View Entries</TabsTrigger>
            <TabsTrigger value="entry">New Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="mt-6">
            <LedgerView />
          </TabsContent>

          <TabsContent value="entry" className="mt-6">
            <LedgerEntryForm onSuccess={() => setActiveTab("view")} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Ledger;
