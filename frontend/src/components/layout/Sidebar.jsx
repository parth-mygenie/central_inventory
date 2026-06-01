import { NavLink, useLocation } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import {
  LayoutDashboard,
  Network,
  Inbox,
  BarChart3,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Package,
  Building2,
  Settings,
  Beaker,
  UtensilsCrossed,
  BookOpen,
  Link2,
  GitBranch,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  LayoutDashboard,
  Network,
  Inbox,
  BarChart3,
  ScrollText,
  Package,
  Building2,
  Settings,
  Beaker,
  UtensilsCrossed,
  BookOpen,
  Link2,
  GitBranch,
};

export default function Sidebar() {
  const { visibleNav, isAuthenticated } = useLoginContext();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  if (!isAuthenticated) return null;

  return (
    <aside
      data-testid="app-sidebar"
      className={cn(
        "h-full border-r border-border bg-card flex flex-col transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-56"
      )}
    >
      {/* Logo area */}
      <div className="h-14 flex items-center px-3 border-b border-border gap-2">
        <Package className="h-6 w-6 text-foreground shrink-0" />
        {!collapsed && (
          <span className="font-bold text-sm tracking-tight whitespace-nowrap">
            Central Inventory
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.id}
              to={item.path}
              data-testid={`nav-${item.id}`}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="truncate">
                  {item.label}
                  {item.comingSoon && (
                    <span className="ml-1.5 text-[9px] opacity-60">(soon)</span>
                  )}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        data-testid="sidebar-collapse-toggle"
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 flex items-center justify-center border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
