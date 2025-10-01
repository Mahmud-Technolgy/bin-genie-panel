import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Dashboard from '@/components/Dashboard';
import AdminPanel from '@/components/AdminPanel';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useSearchParams } from 'react-router-dom';

interface UserProfile {
  is_admin: boolean;
}

const Index = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-background">
      {profile?.is_admin ? (
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            
            <div className="flex-1 flex flex-col">
              <header className="h-14 border-b border-border bg-gradient-card flex items-center px-4">
                <SidebarTrigger />
              </header>

              <main className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {activeTab === 'admin' && <AdminPanel />}
                  {activeTab === 'settings' && (
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold">Settings</h2>
                      <p className="text-muted-foreground mt-2">Coming soon...</p>
                    </div>
                  )}
                  {(activeTab === 'dashboard' || !activeTab) && <Dashboard />}
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      ) : (
        <Dashboard />
      )}
    </div>
  );
};

export default Index;
