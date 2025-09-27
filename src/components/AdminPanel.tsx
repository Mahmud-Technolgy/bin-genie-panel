import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, Activity, CreditCard, Plus } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  credits: number;
  is_admin: boolean;
  created_at: string;
}

interface ApiCallStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_credits_used: number;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<ApiCallStats | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [creditsToAdd, setCreditsToAdd] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('api_calls')
        .select('success, credits_used');

      if (error) throw error;

      const stats = data?.reduce((acc, call) => {
        acc.total_calls++;
        acc.total_credits_used += call.credits_used;
        if (call.success) {
          acc.successful_calls++;
        } else {
          acc.failed_calls++;
        }
        return acc;
      }, {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        total_credits_used: 0,
      }) || {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        total_credits_used: 0,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const addCredits = async () => {
    if (!selectedUser || creditsToAdd <= 0) {
      toast({
        title: "Invalid input",
        description: "Please select a user and enter a valid credit amount",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const userToUpdate = users.find(u => u.user_id === selectedUser);
      if (!userToUpdate) throw new Error('User not found');

      const { error } = await supabase
        .from('profiles')
        .update({ credits: userToUpdate.credits + creditsToAdd })
        .eq('user_id', selectedUser);

      if (error) throw error;

      toast({
        title: "Credits added",
        description: `Successfully added ${creditsToAdd} credits to user`,
      });

      fetchUsers(); // Refresh the user list
      setSelectedUser('');
      setCreditsToAdd(0);
    } catch (error) {
      console.error('Error adding credits:', error);
      toast({
        title: "Error",
        description: "Failed to add credits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentAdminStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Admin status updated",
        description: `User ${!currentAdminStatus ? 'granted' : 'removed'} admin access`,
      });

      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Admin Panel</h2>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total API Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.total_calls}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Successful Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.successful_calls}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.failed_calls}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credits Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.total_credits_used}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Credit Management */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add Credits
          </CardTitle>
          <CardDescription>
            Add credits to user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="user-select">Select User</Label>
              <select
                id="user-select"
                className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Choose a user...</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.full_name || user.email} ({user.credits} credits)
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                min="1"
                value={creditsToAdd}
                onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)}
                placeholder="Amount"
              />
            </div>
            <Button
              onClick={addCredits}
              disabled={isLoading || !selectedUser || creditsToAdd <= 0}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              {isLoading ? "Adding..." : "Add Credits"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userProfile) => (
                <TableRow key={userProfile.user_id}>
                  <TableCell className="font-medium">
                    {userProfile.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{userProfile.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {userProfile.credits}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={userProfile.is_admin ? "default" : "secondary"}>
                      {userProfile.is_admin ? "Admin" : "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(userProfile.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleAdmin(userProfile.user_id, userProfile.is_admin)}
                      disabled={userProfile.user_id === user?.id}
                    >
                      {userProfile.is_admin ? "Remove Admin" : "Make Admin"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;