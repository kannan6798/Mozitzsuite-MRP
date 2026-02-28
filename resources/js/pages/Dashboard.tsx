import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import FilterBar from "@/components/FilterBar";
import StatCard from "@/components/StatCard";
import InventoryAlertsWidget from "@/components/dashboard/InventoryAlertsWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, DollarSign, Users, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import axios from "axios"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const [activeFilter, setActiveFilter] = useState("Open");
  const navigate = useNavigate();
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  const recentOrders = [
    { id: "ORD-001", customer: "Acme Corp", items: 12, status: "Processing", date: "2025-10-01", amount: 41300 },
    { id: "ORD-002", customer: "TechStart Inc", items: 8, status: "Shipped", date: "2025-10-01", amount: 33040 },
    { id: "ORD-003", customer: "Global Retail", items: 24, status: "Delivered", date: "2025-09-30", amount: 61360 },
    { id: "ORD-004", customer: "Smart Solutions", items: 15, status: "Processing", date: "2025-10-02", amount: 28900 },
  ];

  const revenueData = [
    { month: "Jan", revenue: 245000, orders: 45 },
    { month: "Feb", revenue: 285000, orders: 52 },
    { month: "Mar", revenue: 310000, orders: 58 },
    { month: "Apr", revenue: 295000, orders: 54 },
    { month: "May", revenue: 340000, orders: 62 },
    { month: "Jun", revenue: 380000, orders: 71 },
  ];

  const productionData = [
    { week: "Week 1", produced: 1200, target: 1000 },
    { week: "Week 2", produced: 1400, target: 1200 },
    { week: "Week 3", produced: 1100, target: 1300 },
    { week: "Week 4", produced: 1600, target: 1400 },
  ];

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--primary))",
    },
    orders: {
      label: "Orders",
      color: "hsl(var(--chart-2))",
    },
    produced: {
      label: "Produced",
      color: "hsl(var(--chart-3))",
    },
    target: {
      label: "Target",
      color: "hsl(var(--chart-4))",
    },
  };

useEffect(() => {
  const fetchLowStockItems = async () => {
    try {
      const { data } = await axios.get("/inventory-stock");

      // if API returns {data: [...]}
      const items = Array.isArray(data) ? data : data?.data ?? [];

      const lowStock = items
        .filter((item: any) => {
          const available =
            item.available_quantity ??
            (item.quantity_on_hand ?? 0) -
              (item.allocated_quantity ?? 0) -
              (item.committed_quantity ?? 0);

          const reorderPoint = item.reorder_point ?? 0;
          return available <= reorderPoint;
        })
        .map((item: any) => {
          const available =
            item.available_quantity ??
            (item.quantity_on_hand ?? 0) -
              (item.allocated_quantity ?? 0) -
              (item.committed_quantity ?? 0);

          return {
            sku: item.item_code,
            name: item.item_name,
            current: available,
            minimum: item.reorder_point ?? 0,
            status:
              available < ((item.reorder_point ?? 0) * 0.25)
                ? "critical"
                : "warning",
            itemType: item.item_type,
            id: item.id,
          };
        });

      setLowStockItems(lowStock);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
    }
  };

  fetchLowStockItems();
}, []);


  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      Processing: "secondary",
      Shipped: "default",
      Delivered: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <Layout>
      <FilterBar 
        filters={["Open", "Done"]}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your warehouse operations
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value="₹1.9M"
            icon={DollarSign}
            trend={{ value: "12.5%", isPositive: true }}
            variant="success"
          />
          <StatCard
            title="Total Orders"
            value="342"
            icon={ShoppingCart}
            trend={{ value: "8.2%", isPositive: true }}
            variant="accent"
          />
          <StatCard
            title="Active Customers"
            value="68"
            icon={Users}
            trend={{ value: "5 new", isPositive: true }}
            variant="default"
          />
          <StatCard
            title="Pending Invoices"
            value="12"
            icon={Clock}
            trend={{ value: "₹2.4L", isPositive: false }}
            variant="warning"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="var(--color-revenue)" 
                      strokeWidth={2}
                      name="Revenue (₹)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Production Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="produced" fill="var(--color-produced)" name="Produced" />
                    <Bar dataKey="target" fill="var(--color-target)" name="Target" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Alerts Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InventoryAlertsWidget />
        </div>

        {/* Recent Orders & Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.customer}</TableCell>
                      <TableCell>{order.items}</TableCell>
                      <TableCell className="font-semibold">₹{order.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-warning" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Min</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.length > 0 ? (
                    lowStockItems.map((item) => (
                      <TableRow key={item.sku}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>
                          <span
                            className={
                              item.status === "critical"
                                ? "text-destructive font-semibold"
                                : "text-warning font-semibold"
                            }
                          >
                            {item.current}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.minimum}
                        </TableCell>
                        <TableCell>
                          {item.itemType === "Product" ? (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => navigate("/planning")}
                            >
                              Make
                            </Button>
                          ) : (item.itemType === "Raw Material" || item.itemType === "Semi Finished") ? (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => navigate("/purchase/rfq-management")}
                            >
                              Buy
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No low stock items
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
