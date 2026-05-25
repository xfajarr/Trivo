import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Compass, Rocket, Wallet, Home } from "lucide-react";

const items = [
  { title: "Home", url: "/", icon: Home },
  { title: "Feed", url: "/feed", icon: Activity },
  { title: "Launch", url: "/launch", icon: Rocket, primary: true },
  { title: "Discover", url: "/discover", icon: Compass },
  { title: "Agents", url: "/my-agents", icon: Wallet },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur-md md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => {
          const active =
            it.url === "/" ? location.pathname === "/" : location.pathname.startsWith(it.url);
          if (it.primary) {
            return (
              <li key={it.url} className="flex items-center justify-center">
                <Link
                  to={it.url}
                  className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-neon text-primary-foreground glow-neon"
                >
                  <it.icon className="h-5 w-5" strokeWidth={2.5} />
                </Link>
              </li>
            );
          }
          return (
            <li key={it.url}>
              <Link
                to={it.url}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 ticker text-[10px] uppercase ${
                  active ? "text-neon" : "text-muted-foreground"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
