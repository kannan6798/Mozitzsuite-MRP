import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, GripVertical, Info } from "lucide-react";

interface TaxRate {
  id: string;
  rate: string;
  name: string;
}

const TaxConfiguration = () => {
  const { toast } = useToast();
  const [taxes, setTaxes] = useState<TaxRate[]>([
    { id: "1", rate: "20", name: "Sales Tax" }
  ]);
  const [newTaxRate, setNewTaxRate] = useState("");
  const [newTaxName, setNewTaxName] = useState("");
  const [defaultSalesTax, setDefaultSalesTax] = useState("1");
  const [defaultPurchaseTax, setDefaultPurchaseTax] = useState("1");

  const handleAddTax = () => {
    if (newTaxRate.trim() && newTaxName.trim()) {
      const newTax: TaxRate = {
        id: Date.now().toString(),
        rate: newTaxRate.trim(),
        name: newTaxName.trim()
      };
      setTaxes([...taxes, newTax]);
      setNewTaxRate("");
      setNewTaxName("");
      toast({
        title: "Tax Added",
        description: `${newTaxRate}% - ${newTaxName} has been added`,
      });
    }
  };

  const handleDeleteTax = (id: string) => {
    const tax = taxes.find(t => t.id === id);
    setTaxes(taxes.filter(t => t.id !== id));
    toast({
      title: "Tax Removed",
      description: `${tax?.rate}% - ${tax?.name} has been removed`,
    });
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Tax rates</h2>
            <p className="text-sm text-muted-foreground">
              Set and edit tax rates for products and transactions to ensure accurate tax calculations and compliance. Tax rates are applied to items on sales and purchase orders to calculate the total price or cost of items on the order with taxes.{" "}
              <a href="#" className="text-primary hover:underline">Learn more</a>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-0">
                  <div className="border-b bg-muted/50">
                    <div className="grid grid-cols-12 gap-4 px-4 py-3">
                      <div className="col-span-1"></div>
                      <div className="col-span-4">
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          Rate <Info className="h-3 w-3" />
                        </span>
                      </div>
                      <div className="col-span-6">
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          Tax name <Info className="h-3 w-3" />
                        </span>
                      </div>
                      <div className="col-span-1"></div>
                    </div>
                  </div>
                  
                  <div className="divide-y">
                    {taxes.map((tax) => (
                      <div key={tax.id} className="grid grid-cols-12 gap-4 items-center px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="col-span-1 flex items-center">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        </div>
                        <div className="col-span-4">
                          <div className="flex items-center gap-1">
                            <Input
                              value={tax.rate}
                              onChange={(e) => {
                                const updated = taxes.map(t => 
                                  t.id === tax.id ? { ...t, rate: e.target.value } : t
                                );
                                setTaxes(updated);
                              }}
                              className="h-9"
                            />
                            <span className="text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                        <div className="col-span-6">
                          <Input
                            value={tax.name}
                            onChange={(e) => {
                              const updated = taxes.map(t => 
                                t.id === tax.id ? { ...t, name: e.target.value } : t
                              );
                              setTaxes(updated);
                            }}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTax(tax.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-12 gap-4 items-center px-4 py-3 border-t-2 border-orange-500">
                      <div className="col-span-1 flex items-center">
                        <GripVertical className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                      <div className="col-span-4">
                        <div className="flex items-center gap-1">
                          <Input
                            placeholder="Rate"
                            value={newTaxRate}
                            onChange={(e) => setNewTaxRate(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddTax();
                              }
                            }}
                            className="h-9"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="col-span-6">
                        <Input
                          placeholder="Tax name"
                          value={newTaxName}
                          onChange={(e) => setNewTaxName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddTax();
                            }
                          }}
                          className="h-9"
                        />
                      </div>
                      <div className="col-span-1"></div>
                    </div>
                  </div>

                  <div className="px-4 py-3">
                    <Button
                      variant="link"
                      onClick={handleAddTax}
                      className="text-primary px-0"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add row
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Default tax on Sales order
                </label>
                <Select value={defaultSalesTax} onValueChange={setDefaultSalesTax}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taxes.map((tax) => (
                      <SelectItem key={tax.id} value={tax.id}>
                        {tax.rate}% - {tax.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Default tax on Purchase order
                </label>
                <Select value={defaultPurchaseTax} onValueChange={setDefaultPurchaseTax}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taxes.map((tax) => (
                      <SelectItem key={tax.id} value={tax.id}>
                        {tax.rate}% - {tax.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TaxConfiguration;
