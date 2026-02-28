import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import axios from "axios";

import { 
  AlertTriangle, 
  ArrowDown, 
  TrendingDown, 
  Package,
  ArrowRight
} from "lucide-react";

interface AlertCounts {
  belowReorder: number;
  shortage: number;
  products: number;
}

export default function InventoryAlertsWidget() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<AlertCounts>({ belowReorder: 0, shortage: 0, products: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const { data } = await axios.get("/inventory-stock");

      setCounts({
        belowReorder: data.belowReorder,
        shortage: data.shortage,
        products: data.products,
      });
    } catch (error) {
      console.error("Error loading inventory alert counts:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalAlerts = counts.belowReorder + counts.shortage + counts.products;

  const alertCategories = [
    {
      label: "Below Reorder",
      count: counts.belowReorder,
      icon: ArrowDown,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      label: "Shortage",
      count: counts.shortage,
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-50",
    },
    {
      label: "Products",
      count: counts.products,
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Inventory Alerts
          </div>
          {totalAlerts > 0 && (
            <Badge variant="destructive" className="text-sm">
              {totalAlerts} Total
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalAlerts === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>All inventory levels are healthy</p>
          </div>
        ) : (
          <>
            {alertCategories.map((category) => (
              <div
                key={category.label}
                className={`flex items-center justify-between p-3 rounded-lg ${category.bgColor}`}
              >
                <div className="flex items-center gap-3">
                  <category.icon className={`h-5 w-5 ${category.color}`} />
                  <span className="font-medium">{category.label}</span>
                </div>
                <Badge
                  variant={category.count > 0 ? "default" : "secondary"}
                  className={category.count > 0 ? "" : "opacity-50"}
                >
                  {category.count}
                </Badge>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate("/purchase/item-demands")}
            >
              View All Alerts
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
