import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  

  const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    authSchema.parse({ email, password });
  } catch (err: any) {
    // If Zod error
    if (err?.issues?.length) {
      toast.error(err.issues[0].message);
      return;
    }

    // fallback error
    toast.error("Invalid input");
    return;
  }

  setLoading(true);

  const { error } = await signUp(email, password);

  setLoading(false);

  if (error) {
    const message =
      typeof error === "string"
        ? error
        : error?.message || "Registration failed";

    if (message.includes("already registered")) {
      toast.error("This email is already registered. Please sign in instead.");
    } else {
      toast.error(message);
    }
  } else {
    toast.success("Account created successfully! You can now sign in.");
    setEmail("");
    setPassword("");
  }
};


 const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    authSchema.parse({ email, password });
  } catch (err: any) {
    if (err?.issues?.length) {
      toast.error(err.issues[0].message);
      return;
    }
    toast.error("Invalid input");
    return;
  }

  setLoading(true);

  const { error } = await signIn(email, password);

  setLoading(false);

  if (error) {
    const message =
      typeof error === "string"
        ? error
        : error?.message || "Login failed";

    if (message.includes("Invalid login credentials")) {
      toast.error("Invalid email or password");
    } else {
      toast.error(message);
    }
  }
  else {
    // ✅ SUCCESS TOAST
    toast.success("Signed in successfully!");
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to ERP System</CardTitle>
          <CardDescription>Sign in to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
