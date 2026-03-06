import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Copy,
  Clock,
  Zap,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface CashFlowPeriod {
  expected_inflows: number;
  expected_outflows: number;
  net_cash_flow: number;
}

interface Anomaly {
  severity: "high" | "medium" | "low";
  type: "unusual_amount" | "duplicate" | "timing" | "pattern";
  title: string;
  description: string;
  entity?: string;
  amount?: number;
}

interface PaymentPattern {
  entity: string;
  entity_type: "customer" | "vendor";
  pattern: string;
  risk_level: "high" | "medium" | "low";
  recommendation: string;
}

interface AIInsights {
  anomalies: Anomaly[];
  payment_patterns: PaymentPattern[];
  cash_flow_forecast: {
    forecast_30_days: CashFlowPeriod;
    forecast_60_days: CashFlowPeriod;
    forecast_90_days: CashFlowPeriod;
    summary: string;
  };
  overall_health: "good" | "warning" | "critical";
  summary: string;
}

const severityConfig = {
  high: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", badge: "destructive" as const },
  medium: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", badge: "secondary" as const },
  low: { color: "text-muted-foreground", bg: "bg-muted", border: "border-border", badge: "outline" as const },
};

const typeIcons = {
  unusual_amount: AlertTriangle,
  duplicate: Copy,
  timing: Clock,
  pattern: Activity,
};

const healthConfig = {
  good: { label: "Healthy", color: "text-green-600", bg: "bg-green-50", icon: Shield },
  warning: { label: "Needs Attention", color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-destructive", bg: "bg-destructive/10", icon: Zap },
};

const AccountingAI = () => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("accounting-ai-insights");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data);
      toast.success("AI analysis complete");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to run AI analysis");
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    inflows: { label: "Inflows", color: "hsl(var(--chart-3))" },
    outflows: { label: "Outflows", color: "hsl(var(--chart-1))" },
    net: { label: "Net", color: "hsl(var(--primary))" },
  };

  const cashFlowChartData = insights
    ? [
        {
          period: "30 Days",
          inflows: insights.cash_flow_forecast.forecast_30_days.expected_inflows,
          outflows: insights.cash_flow_forecast.forecast_30_days.expected_outflows,
          net: insights.cash_flow_forecast.forecast_30_days.net_cash_flow,
        },
        {
          period: "60 Days",
          inflows: insights.cash_flow_forecast.forecast_60_days.expected_inflows,
          outflows: insights.cash_flow_forecast.forecast_60_days.expected_outflows,
          net: insights.cash_flow_forecast.forecast_60_days.net_cash_flow,
        },
        {
          period: "90 Days",
          inflows: insights.cash_flow_forecast.forecast_90_days.expected_inflows,
          outflows: insights.cash_flow_forecast.forecast_90_days.expected_outflows,
          net: insights.cash_flow_forecast.forecast_90_days.net_cash_flow,
        },
      ]
    : [];

  const formatCurrency = (val: number) =>
    `₹${Math.abs(val).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
              <Brain className="h-9 w-9 text-primary" />
              AI Financial Insights
            </h1>
            <p className="text-muted-foreground mt-2">
              Anomaly detection, duplicate flagging & cash flow forecasting
            </p>
          </div>
          <Button onClick={runAnalysis} disabled={loading} size="lg">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analyzing..." : "Run AI Analysis"}
          </Button>
        </div>

        {!insights && !loading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Analysis Yet
              </h3>
              <p className="text-muted-foreground max-w-md">
                Click "Run AI Analysis" to scan your invoices, payables, ledger entries, and credit notes for anomalies, duplicates, and cash flow forecasts.
              </p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Analyzing your financial data with AI...</p>
            </CardContent>
          </Card>
        )}

        {insights && !loading && (
          <>
            {/* Overall Health + Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className={`${healthConfig[insights.overall_health].bg} border-none`}>
                <CardContent className="flex items-center gap-4 py-6">
                  {(() => {
                    const Icon = healthConfig[insights.overall_health].icon;
                    return <Icon className={`h-10 w-10 ${healthConfig[insights.overall_health].color}`} />;
                  })()}
                  <div>
                    <p className="text-sm text-muted-foreground">Financial Health</p>
                    <p className={`text-2xl font-bold ${healthConfig[insights.overall_health].color}`}>
                      {healthConfig[insights.overall_health].label}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardContent className="py-6">
                  <p className="text-sm font-medium text-muted-foreground mb-1">AI Summary</p>
                  <p className="text-foreground">{insights.summary}</p>
                </CardContent>
              </Card>
            </div>

            {/* Cash Flow Forecast */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Cash Flow Forecast (30 / 60 / 90 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlowChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="inflows" fill="var(--color-inflows)" name="Inflows" />
                        <Bar dataKey="outflows" fill="var(--color-outflows)" name="Outflows" />
                        <Bar dataKey="net" fill="var(--color-net)" name="Net" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>

                  <div className="space-y-4">
                    {[
                      { label: "30 Days", data: insights.cash_flow_forecast.forecast_30_days },
                      { label: "60 Days", data: insights.cash_flow_forecast.forecast_60_days },
                      { label: "90 Days", data: insights.cash_flow_forecast.forecast_90_days },
                    ].map(({ label, data }) => (
                      <div key={label} className="rounded-lg border p-4 space-y-2">
                        <p className="font-semibold text-foreground">{label}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-green-600">
                            <ArrowUpRight className="h-3 w-3" /> Inflows
                          </span>
                          <span className="font-medium">{formatCurrency(data.expected_inflows)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1 text-destructive">
                            <ArrowDownRight className="h-3 w-3" /> Outflows
                          </span>
                          <span className="font-medium">{formatCurrency(data.expected_outflows)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm border-t pt-2">
                          <span className="font-semibold">Net Cash Flow</span>
                          <span className={`font-bold ${data.net_cash_flow >= 0 ? "text-green-600" : "text-destructive"}`}>
                            {data.net_cash_flow >= 0 ? "+" : "-"}{formatCurrency(data.net_cash_flow)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <p className="text-sm text-muted-foreground italic">{insights.cash_flow_forecast.summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anomalies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Anomalies Detected
                  <Badge variant="secondary" className="ml-2">{insights.anomalies.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.anomalies.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No anomalies detected — your data looks clean!</p>
                ) : (
                  <div className="space-y-3">
                    {insights.anomalies.map((a, i) => {
                      const config = severityConfig[a.severity];
                      const Icon = typeIcons[a.type] || AlertTriangle;
                      return (
                        <div key={i} className={`rounded-lg border ${config.border} ${config.bg} p-4 flex items-start gap-4`}>
                          <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">{a.title}</span>
                              <Badge variant={config.badge}>{a.severity}</Badge>
                              <Badge variant="outline" className="capitalize">{a.type.replace("_", " ")}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                            {(a.entity || a.amount) && (
                              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                                {a.entity && <span>Entity: <strong>{a.entity}</strong></span>}
                                {a.amount != null && <span>Amount: <strong>{formatCurrency(a.amount)}</strong></span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Payment Pattern Analysis
                  <Badge variant="secondary" className="ml-2">{insights.payment_patterns.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {insights.payment_patterns.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No significant payment patterns to report.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.payment_patterns.map((p, i) => (
                      <div key={i} className={`rounded-lg border p-4 ${severityConfig[p.risk_level].bg} ${severityConfig[p.risk_level].border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground">{p.entity}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="capitalize">{p.entity_type}</Badge>
                            <Badge variant={severityConfig[p.risk_level].badge}>{p.risk_level} risk</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{p.pattern}</p>
                        <p className="text-sm text-primary mt-2 font-medium">💡 {p.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default AccountingAI;