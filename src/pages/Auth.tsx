import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { Gem } from 'lucide-react';

interface SignUpForm {
  email: string;
  password: string;
  full_name: string;
  trader_name: string;
}

interface SignInForm {
  email: string;
  password: string;
}

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const signUpForm = useForm<SignUpForm>();
  const signInForm = useForm<SignInForm>();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (data: SignUpForm) => {
    setLoading(true);
    try {
      // Add timeout for auth requests
      const signUpPromise = supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.full_name,
            trader_name: data.trader_name,
          }
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please check your connection')), 15000)
      );

      const { data: authData, error } = await Promise.race([signUpPromise, timeoutPromise]) as any;

      if (error) throw error;

      // For now, set is_active to false to require admin approval
      // Once the admin_notifications table is created, this will be enhanced
      if (authData?.user) {
        try {
          await supabase
            .from('profiles')
            .update({ is_active: false })
            .eq('user_id', authData.user.id);
        } catch (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      toast({
        title: t('success'),
        description: 'Registration submitted! Your account is pending admin approval. You will be notified once approved.',
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Check if it's a connection error
      if (error.message.includes('Failed to fetch') || error.message.includes('timeout') || error.message.includes('fetch')) {
        toast({
          title: 'Connection Error',
          description: 'Unable to connect to authentication server. Please check your internet connection and try again.',
          variant: "destructive",
        });
      } else {
        toast({
          title: t('error'),
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (data: SignInForm) => {
    setLoading(true);
    try {
      // Add timeout for auth requests
      const signInPromise = supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please check your connection')), 15000)
      );

      const { error } = await Promise.race([signInPromise, timeoutPromise]) as any;

      if (error) throw error;

      navigate('/');
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Check if it's a connection error
      if (error.message.includes('Failed to fetch') || error.message.includes('timeout') || error.message.includes('fetch')) {
        toast({
          title: 'Connection Error', 
          description: 'Unable to connect to authentication server. Please check your internet connection and try again.',
          variant: "destructive",
        });
      } else {
        toast({
          title: t('error'),
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Gem className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-wider">MoneyX v8.2</h1>
          <p className="text-muted-foreground tracking-wide">{t('tradingSystem')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('welcome')}</CardTitle>
            <CardDescription>{t('signInToAccount')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('signin')}</TabsTrigger>
                <TabsTrigger value="signup">{t('signup')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      {...signInForm.register('email', { required: true })}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t('password')}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      {...signInForm.register('password', { required: true })}
                      placeholder={t('password')}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('signingIn') : t('signInButton')}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      {...signUpForm.register('email', { required: true })}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      {...signUpForm.register('password', { required: true })}
                      placeholder={t('password')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full-name">{t('fullName')}</Label>
                    <Input
                      id="full-name"
                      {...signUpForm.register('full_name', { required: true })}
                      placeholder={t('fullName')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trader-name">{t('traderName')}</Label>
                    <Input
                      id="trader-name"
                      {...signUpForm.register('trader_name', { required: true })}
                      placeholder={t('traderName')}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('creatingAccount') : t('createAccount')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;