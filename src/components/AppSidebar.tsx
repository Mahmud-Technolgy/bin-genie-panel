import { LayoutDashboard, Shield, Settings } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Admin Panel', url: '/?tab=admin', icon: Shield },
  { title: 'Settings', url: '/?tab=settings', icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  const isActive = (url: string) => {
    if (url === '/') {
      return currentPath === '/' || currentPath === '/?tab=dashboard';
    }
    return currentPath === url;
  };

  const getNavCls = (active: boolean) =>
    active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50';

  return (
    <Sidebar className={open ? 'w-60' : 'w-14'} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={!open ? 'sr-only' : ''}>
            Admin Navigation
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={getNavCls(isActive(item.url))}
                      title={item.title}
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span className="ml-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
