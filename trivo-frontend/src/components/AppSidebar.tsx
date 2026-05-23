import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Compass, Rocket, Wallet, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const nav = [
  { title: "Feed", url: "/feed", icon: Activity },
  { title: "Discover", url: "/discover", icon: Compass },
  { title: "Launch Agent", url: "/launch", icon: Rocket },
  { title: "My Agents", url: "/my-agents", icon: Wallet },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { userId } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-neon glow-neon">
            <Zap className="h-4 w-4 text-background" strokeWidth={3} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-sm font-bold tracking-tight">TRIVO</span>
            <span className="ticker text-[10px] text-muted-foreground">v0.1 · testnet</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="ticker text-[10px] uppercase tracking-widest">
            Terminal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active =
                  pathname === item.url || (item.url !== "/" && pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-md bg-sidebar-accent px-2 py-2">
          <span className="pulse-dot h-2 w-2 rounded-full bg-neon" />
          <div className="flex flex-col leading-tight">
            <span className="ticker text-[10px] text-muted-foreground">CONNECTED</span>
            <span className="ticker text-xs">
              {userId ? `${userId.slice(0, 6)}…` : "Connect wallet"}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
