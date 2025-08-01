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
import { Gem, Star } from 'lucide-react';

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
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (data: SignUpForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
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

      if (error) throw error;

      toast({
        title: t('success'),
        description: t('checkEmail'),
      });
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (data: SignInForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      navigate('/');
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
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
            <Gem className="h-8 w-8 text-primary" />
            <Star className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold">Moneyx v8.2</h1>
          <p className="text-muted-foreground">{t('tradingSystem')}</p>
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