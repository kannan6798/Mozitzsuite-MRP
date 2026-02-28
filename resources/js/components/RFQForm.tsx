import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

const rfqSchema = z.object({
  title: z.string().min(1, "Title is required"),
  payment_terms: z.string().optional(),
  delivery_location: z.string().optional(),
  notes: z.string().optional(),
});

type RFQFormValues = z.infer<typeof rfqSchema>;

interface RFQFormProps {
  initialItem?: {
    item_code: string;
    item_name: string;
    description?: string;
    quantity: number;
  };
  onSuccess?: () => void;
}

export default function RFQForm({ initialItem, onSuccess }: RFQFormProps) {
  const [vendors, setVendors] = useState([{ vendor_name: "", vendor_email: "", vendor_contact: "" }]);
  const [items, setItems] = useState(
    initialItem
      ? [{
          item_code: initialItem.item_code,
          item_name: initialItem.item_name,
          description: initialItem.description || "",
          quantity: initialItem.quantity.toString(),
          required_date: new Date().toISOString().split('T')[0],
        }]
      : [{ item_code: "", item_name: "", description: "", quantity: "", required_date: "" }]
  );
  const { toast } = useToast();

  const form = useForm<RFQFormValues>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      title: initialItem ? `RFQ for ${initialItem.item_name}` : "",
      payment_terms: "",
      delivery_location: "",
      notes: "",
    },
  });

  const generateRFQNumber = () => {
    const timestamp = Date.now();
    return `RFQ-${timestamp}`;
  };

 const onSubmit = async (values: RFQFormValues) => {
  try {
    const payload = {
      rfq_number: generateRFQNumber(),
      title: values.title,
      status: "Draft",
      payment_terms: values.payment_terms || null,
      delivery_location: values.delivery_location || null,
      notes: values.notes || null,
      items: items
        .filter(item => item.item_code && item.item_name && item.quantity)
        .map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          description: item.description || null,
          quantity: parseInt(item.quantity),
          required_date: item.required_date || null,
        })),
      vendors: vendors
        .filter(v => v.vendor_name)
        .map(v => ({
          vendor_name: v.vendor_name,
          vendor_email: v.vendor_email || null,
          vendor_contact: v.vendor_contact || null,
          status: "Pending",
        })),
    };

    const response = await fetch("/api/rfqs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create RFQ");
    }

    toast({
      title: "Success",
      description: "RFQ created successfully",
    });

    form.reset();
    setVendors([{ vendor_name: "", vendor_email: "", vendor_contact: "" }]);
    setItems([{ item_code: "", item_name: "", description: "", quantity: "", required_date: "" }]);

    if (onSuccess) onSuccess();

  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  }
};


  const addVendor = () => {
    setVendors([...vendors, { vendor_name: "", vendor_email: "", vendor_contact: "" }]);
  };

  const removeVendor = (index: number) => {
    setVendors(vendors.filter((_, i) => i !== index));
  };

  const updateVendor = (index: number, field: string, value: string) => {
    const updated = [...vendors];
    updated[index] = { ...updated[index], [field]: value };
    setVendors(updated);
  };

  const addItem = () => {
    setItems([...items, { item_code: "", item_name: "", description: "", quantity: "", required_date: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RFQ Title *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Raw Materials for Q1 2025" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Net 30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="delivery_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Location</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>RFQ Items</FormLabel>
            <Button type="button" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-2">
                <Input
                  placeholder="Item Code"
                  value={item.item_code}
                  onChange={(e) => updateItem(index, "item_code", e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Input
                  placeholder="Item Name"
                  value={item.item_name}
                  onChange={(e) => updateItem(index, "item_name", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="date"
                  placeholder="Required Date"
                  value={item.required_date}
                  onChange={(e) => updateItem(index, "required_date", e.target.value)}
                />
              </div>
              <div className="col-span-1">
                {items.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <FormLabel>Vendors *</FormLabel>
            <Button type="button" size="sm" onClick={addVendor}>
              <Plus className="h-4 w-4 mr-1" />
              Add Vendor
            </Button>
          </div>
          {vendors.map((vendor, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Input
                  placeholder="Vendor Name"
                  value={vendor.vendor_name}
                  onChange={(e) => updateVendor(index, "vendor_name", e.target.value)}
                />
              </div>
              <div className="col-span-4">
                <Input
                  type="email"
                  placeholder="Vendor Email"
                  value={vendor.vendor_email}
                  onChange={(e) => updateVendor(index, "vendor_email", e.target.value)}
                />
              </div>
              <div className="col-span-3">
                <Input
                  placeholder="Contact Number"
                  value={vendor.vendor_contact}
                  onChange={(e) => updateVendor(index, "vendor_contact", e.target.value)}
                />
              </div>
              <div className="col-span-1">
                {vendors.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeVendor(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit">Create RFQ</Button>
        </div>
      </form>
    </Form>
  );
}
