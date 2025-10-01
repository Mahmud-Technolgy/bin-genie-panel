import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CreditCard, TrendingUp, Activity, Zap } from 'lucide-react';
import { z } from 'zod';

const binSchema = z.string().regex(/^\d{6,}$/, "BIN must be at least 6 digits");
const quantitySchema = z.number().min(1, "Quantity must be at least 1").max(50, "Quantity cannot exceed 50");
const monthSchema = z.number().min(1, "Month must be between 1-12").max(12, "Month must be between 1-12");
const yearSchema = z.number().min(2025, "Year must be 2025 or later").max(2035, "Year cannot exceed 2035");

interface UserProfile {
  id: string;
  credits: number;
  full_name: string | null;
  is_admin: boolean;
}

interface ApiCall {
  id: string;
  bin: string;
  quantity: number;
  credits_used: number;
  success: boolean;
  response_data: any;
  error_message: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentCalls, setRecentCalls] = useState<ApiCall[]>([]);
  const [bin, setBin] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [month, setMonth] = useState(12);
  const [year, setYear] = useState(2028);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiUrl, setApiUrl] = useState('https://cc.yeasirar.xyz/gen');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRecentCalls();
      fetchApiUrl();
    }
  }, [user]);

  const fetchApiUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('api_settings')
        .select('setting_value')
        .eq('setting_key', 'api_base_url')
        .maybeSingle();

      if (error) throw error;
      if (data?.setting_value) {
        setApiUrl(data.setting_value);
      }
    } catch (error) {
      console.error('Error fetching API URL:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              user_id: user?.id,
              email: user?.email,
              full_name: user?.user_metadata?.full_name || null,
              credits: 0,
            }
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  };

  const fetchRecentCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('api_calls')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCalls(data || []);
    } catch (error) {
      console.error('Error fetching recent calls:', error);
    }
  };

  const validateInputs = () => {
    const newErrors: Record<string, string> = {};

    const binResult = binSchema.safeParse(bin);
    if (!binResult.success) {
      newErrors.bin = binResult.error.errors[0].message;
    }

    const quantityResult = quantitySchema.safeParse(quantity);
    if (!quantityResult.success) {
      newErrors.quantity = quantityResult.error.errors[0].message;
    }

    const monthResult = monthSchema.safeParse(month);
    if (!monthResult.success) {
      newErrors.month = monthResult.error.errors[0].message;
    }

    const yearResult = yearSchema.safeParse(year);
    if (!yearResult.success) {
      newErrors.year = yearResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const makeApiCall = async () => {
    if (!validateInputs()) return;

    if (!profile || profile.credits < 1) {
      toast({
        title: "Insufficient credits",
        description: "You need at least 1 credit to make an API call",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Make API call to external service
      const response = await fetch(`${apiUrl}?bin=${bin}&qty=${quantity}&mon=${month}&yr=${year}`);
      const responseData = await response.json();

      const success = response.ok;

      // Log the API call
      await supabase
        .from('api_calls')
        .insert([
          {
            user_id: user?.id,
            bin,
            quantity,
            credits_used: 1,
            success,
            response_data: success ? responseData : null,
            error_message: success ? null : responseData?.error || 'Unknown error',
          }
        ]);

      if (success) {
        // Deduct credit
        await supabase
          .from('profiles')
          .update({ credits: profile.credits - 1 })
          .eq('user_id', user?.id);

        setProfile(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);

        toast({
          title: "Success!",
          description: `Generated ${responseData.live_cards_found || quantity} cards successfully`,
        });
      } else {
        toast({
          title: "API call failed",
          description: responseData?.error || "Unknown error occurred",
          variant: "destructive",
        });
      }

      fetchRecentCalls();
    } catch (error) {
      console.error('API call error:', error);
      toast({
        title: "Request failed",
        description: "Failed to make API call",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-gradient-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                BinGenie API
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {profile.full_name || user?.email}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="px-4 py-2">
                <CreditCard className="w-4 h-4 mr-2" />
                {profile.credits} Credits
              </Badge>
              {profile.is_admin && (
                <Badge variant="default" className="px-4 py-2">
                  Admin
                </Badge>
              )}
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* API Interface */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  API Generator
                </CardTitle>
                <CardDescription>
                  Generate test cards using BIN and quantity parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bin">BIN (Bank Identification Number)</Label>
                    <Input
                      id="bin"
                      type="text"
                      placeholder="e.g., 401658"
                      value={bin}
                      onChange={(e) => setBin(e.target.value)}
                      className={errors.bin ? "border-destructive" : ""}
                    />
                    {errors.bin && (
                      <p className="text-sm text-destructive">{errors.bin}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max="50"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className={errors.quantity ? "border-destructive" : ""}
                    />
                    {errors.quantity && (
                      <p className="text-sm text-destructive">{errors.quantity}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="month">Expiry Month</Label>
                    <Input
                      id="month"
                      type="number"
                      min="1"
                      max="12"
                      value={month}
                      onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
                      className={errors.month ? "border-destructive" : ""}
                      placeholder="1-12"
                    />
                    {errors.month && (
                      <p className="text-sm text-destructive">{errors.month}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Expiry Year</Label>
                    <Input
                      id="year"
                      type="number"
                      min="2025"
                      max="2035"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value) || 2025)}
                      className={errors.year ? "border-destructive" : ""}
                      placeholder="e.g., 2028"
                    />
                    {errors.year && (
                      <p className="text-sm text-destructive">{errors.year}</p>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={makeApiCall}
                  disabled={isLoading || profile.credits < 1}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 mr-2" />
                      Generate Cards (1 Credit)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stats & Recent Activity */}
          <div className="space-y-6">
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentCalls.length > 0 ? (
                  <div className="space-y-4">
                    {recentCalls.map((call, index) => (
                      <div key={call.id}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">BIN: {call.bin}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {call.quantity} | Credits: {call.credits_used}
                            </p>
                          </div>
                          <Badge variant={call.success ? "default" : "destructive"}>
                            {call.success ? "Success" : "Failed"}
                          </Badge>
                        </div>
                        {index < recentCalls.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No API calls yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;