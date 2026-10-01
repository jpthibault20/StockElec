import { Ellipsis, House, MapPin, Package, ShoppingCart, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

// Main destinations, shared by the mobile bottom bar and the desktop sidebar.
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/items", label: "Articles", icon: Package },
  { href: "/locations", label: "Emplacements", icon: MapPin },
  { href: "/shopping", label: "Courses", icon: ShoppingCart },
  { href: "/more", label: "Plus", icon: Ellipsis },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
