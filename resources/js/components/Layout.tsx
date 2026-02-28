import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  GitBranch,
  Users,
  Settings,
  Clipboard,
  FileText,
  DollarSign,
  CheckSquare,
  Wallet,
  MapPin,
  Upload,
  Calculator,
  Building2,
  HelpCircle,
  UserCircle,
  PackageCheck,
  Receipt,
  LogOut,
  CreditCard,
  UsersIcon,
  ChevronDown,
  FileOutput,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  items?: NavItem[];
}

interface NavGroup {
  name: string;
  icon: any;
  items: NavItem[];
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { signOut, user, loading } = useAuth();

    if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  const navigationGroups: NavGroup[] = [
    {
      name: "Accounting and Transaction",
      icon: FileText,
      items: [
        { name: "Customers", href: "/accounting/customers", icon: Users },
        { name: "Vendors", href: "/purchase/vendors", icon: Building2 },
        { name: "Orders", href: "/orders", icon: ShoppingCart },
        { name: "Invoices", href: "/accounting/invoices", icon: FileText },
        { name: "Ledger", href: "/accounting/ledger", icon: FileText },
        { name: "Credit Notes", href: "/accounting/credit-notes", icon: FileOutput },
        { name: "Tax Configuration", href: "/tax-configuration", icon: Calculator },
      ],
    },
    {
      name: "Procurement Module",
      icon: ShoppingCart,
      items: [
        { 
          name: "Store Keeper", 
          icon: PackageCheck,
          items: [
            { name: "GRN", href: "/purchase/grn", icon: Clipboard },
            { name: "Debit Note", href: "/purchase/debit-note", icon: Package },
            { name: "Supplier Payable", href: "/accounting/supplier-payables", icon: DollarSign },
          ]
        },
        { name: "MRP", href: "/purchase/mrp-run", icon: Clipboard },
        { name: "Purchase Order", href: "/purchase/purchase-orders", icon: FileText },
        { 
          name: "Vendor Management", 
          icon: Building2,
          items: [
            { name: "Vendor Onboarding", href: "/purchase/vendors", icon: Users },
            { name: "RFQ Management", href: "/purchase/rfq-management", icon: FileText },
            { name: "Award Quotation", href: "/purchase/vendor-quotations", icon: Receipt },
            { name: "E-Auction Vendors", href: "/purchase/e-auction", icon: Wallet },
          ]
        },
      ],
    },
    {
      name: "Inventory",
      icon: Package,
      items: [
        { name: "Stock", href: "/inventory", icon: Package },
        { name: "Warehouse", href: "/inventory-location", icon: MapPin },
        { name: "Stock Transfer", href: "/stock-transfer", icon: GitBranch },
        { name: "Approvals", href: "/approvals/inventory-approvals", icon: CheckSquare },
        { name: "Import from Tally", href: "/import-tally", icon: Upload },
      ],
    },
    {
      name: "Production",
      icon: Clipboard,
      items: [
        { name: "BOM", href: "/bom", icon: GitBranch },
        { name: "Planning", href: "/planning", icon: FileText },
        { name: "Shopfloor", href: "/shopfloor", icon: Clipboard },
      ],
    },
    {
      name: "Approvals",
      icon: CheckSquare,
      items: [
        { name: "PO Approval", href: "/approvals/po-approval", icon: CheckSquare },
        { name: "Invoice Approval", href: "/approvals/invoice-approval", icon: CheckSquare },
      ],
    },
  ];

  // Helper to check if a nav item or its children match a path
  const isItemActive = (item: NavItem, path: string): boolean => {
    if (item.href && item.href === path) return true;
    if (item.items) {
      return item.items.some(child => isItemActive(child, path));
    }
    return false;
  };

  // Get first href from a nav item (for navigation)
  const getFirstHref = (item: NavItem): string => {
    if (item.href) return item.href;
    if (item.items && item.items.length > 0) {
      return getFirstHref(item.items[0]);
    }
    return "/";
  };

  // Get active group based on current route
  const getActiveGroup = () => {
    for (const group of navigationGroups) {
      if (group.items.some(item => isItemActive(item, location.pathname))) {
        return group;
      }
    }
    return null;
  };

  const currentGroup = getActiveGroup();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="Mozizsuite Logo" className="h-10 w-10 rounded-lg" />
            <h1 className="text-xl font-bold text-primary">
              Moziz<span className="text-accent">suite</span>
            </h1>
          </div>

          {/* Main Navigation Categories */}
          <nav className="flex items-center gap-1">
            {navigationGroups.map((group) => {
              const hasActiveItem = group.items.some(item => isItemActive(item, location.pathname));
              
              return (
                <Link
                  key={group.name}
                  to={getFirstHref(group.items[0])}
                  className={cn(
                    "flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-all font-bold",
                    hasActiveItem
                      ? "bg-primary/10 text-primary"
                      : "text-primary/70 hover:text-primary hover:bg-primary/5"
                  )}
                >
                  <group.icon className="h-5 w-5" />
                  <span className="text-xs">{group.name}</span>
                </Link>
              );
            })}

            <Link
              to="/settings"
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-all font-bold",
                location.pathname === "/settings"
                  ? "bg-primary/10 text-primary"
                  : "text-primary/70 hover:text-primary hover:bg-primary/5"
              )}
            >
              <Settings className="h-5 w-5" />
              <span className="text-xs">Settings</span>
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button className="text-primary/70 hover:text-primary transition-colors">
              <HelpCircle className="h-5 w-5" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto px-3 py-2 hover:bg-primary/10">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {user?.email?.substring(0, 2).toUpperCase() || "VW"}
                  </div>
                  <ChevronDown className="h-4 w-4 text-primary/70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background z-50">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">MOZITZSOFTECH</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email?.split('@')[0] || "vignesh waran"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Account</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <UsersIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Team</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Subscription</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Subcategories Tabs */}
        {currentGroup && (
          <div className="bg-white border-t border-border">
            <div className="flex items-center gap-2 px-6 py-0">
              {currentGroup.items.map((item) => {
                const Icon = item.icon;
                const hasChildren = item.items && item.items.length > 0;
                const isActive = isItemActive(item, location.pathname);

                if (hasChildren) {
                  return (
                    <DropdownMenu key={item.name}>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2",
                            isActive
                              ? "text-primary border-primary"
                              : "text-primary/70 hover:text-primary border-transparent"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.name}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="bg-background z-50">
                        {item.items?.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = child.href === location.pathname;
                          return (
                            <DropdownMenuItem key={child.name} asChild>
                              <Link
                                to={child.href || "/"}
                                className={cn(
                                  "flex items-center gap-2 cursor-pointer",
                                  isChildActive && "bg-primary/10 text-primary"
                                )}
                              >
                                <ChildIcon className="h-4 w-4" />
                                {child.name}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.href || "/"}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2",
                      isActive
                        ? "text-primary border-primary"
                        : "text-primary/70 hover:text-primary border-transparent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};

export default Layout;
