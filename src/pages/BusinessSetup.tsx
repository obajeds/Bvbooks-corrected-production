import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useBusiness, useCreateBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Building2, Store, LogOut, Home, Eye, EyeOff, AlertCircle, Mail, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getEmailConfirmUrl } from "@/lib/authUrls";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import bvbooksLogo from "@/assets/bvbooks-logo.jpeg";
import { useCsrfToken } from "@/hooks/useCsrfToken";
import { loginFormSchema, signUpFormSchema, businessSetupSchema, sanitizeText } from "@/lib/validation";

const businessCategories = {
  "Retail": ["General Retail", "Supermarket", "Convenience Store", "Department Store", "Specialty Store"],
  "Wholesale": ["General Wholesale", "Distributor", "Importer/Exporter", "Cash & Carry"],
  "Food & Beverage": ["Restaurant", "Fast Food", "Cafe/Coffee Shop", "Bar/Lounge", "Bakery", "Catering", "Food Truck"],
  "Grocery": ["Grocery Store", "Mini Mart", "Provision Store", "Organic/Health Food"],
  "Electronics": ["Electronics Store", "Computer/IT Shop", "Phone/Accessories", "Home Appliances"],
  "Fashion & Apparel": ["Clothing Store", "Boutique", "Shoe Store", "Jewelry Store", "Accessories"],
  "Health & Beauty": ["Pharmacy", "Cosmetics Store", "Salon/Spa", "Fitness Center", "Optical Shop"],
  "Hardware & Construction": ["Hardware Store", "Building Materials", "Plumbing/Electrical", "Paint Store"],
  "Automotive": ["Auto Parts", "Car Dealership", "Auto Repair/Service", "Car Wash", "Fuel Station"],
  "Oil & Gas": ["Fuel Station", "LPG/Gas Distribution", "Lubricants", "Petroleum Products", "Oil & Gas Services"],
  "Agriculture": ["Farm Supply", "Agro-chemicals", "Animal Feed", "Farm Equipment"],
  "Education & Stationery": ["Bookstore", "School Supplies", "Educational Services", "Printing/Publishing"],
  "Home & Furniture": ["Furniture Store", "Home Decor", "Interior Design", "Mattress/Bedding"],
  "Services": ["Professional Services", "Consulting", "Cleaning Services", "Logistics/Courier", "Travel Agency", "Real Estate"],
  "Hospitality": ["Hotel", "Guest House", "Event Center", "Recreation/Entertainment"],
  "Manufacturing": ["Food Processing", "Textile/Garment", "Furniture Making", "Metalworks"],
  "Technology": ["Software/IT Services", "Web/App Development", "Tech Support", "Telecommunications"],
  "Others": ["General Business", "Mixed/Multi-purpose", "Unclassified", "Other"]
};

function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailBanner, setShowEmailBanner] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [authData, setAuthData] = useState({
    email: "",
    password: "",
    fullName: "",
    confirmPassword: "",
  });
  const { csrfToken, validateAndRegenerate, CsrfInput } = useCsrfToken();

  const handleResendConfirmation = async () => {
    if (!authData.email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: authData.email,
        options: { emailRedirectTo: getEmailConfirmUrl() }
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Confirmation email sent! Please check your inbox and spam folder.");
      }
    } catch (err: any) {
      toast.error("Failed to resend. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for offline state first
    if (!navigator.onLine) {
      toast.error("You're offline. Please check your internet connection and try again.");
      return;
    }
    
    // CSRF validation
    const formData = new FormData(e.target as HTMLFormElement);
    if (!validateAndRegenerate(formData.get("csrf_token") as string)) {
      toast.error("Invalid form submission. Please try again.");
      return;
    }
    
    // Validate and sanitize inputs
    const validation = loginFormSchema.safeParse({
      email: authData.email,
      password: authData.password,
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await signIn(validation.data.email, validation.data.password);
      if (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('failed to fetch')) {
          toast.error("Connection failed. Please check your internet and try again.");
        } else if (errorMsg.includes('email not confirmed')) {
          setShowEmailBanner(true);
          toast.error("Your email is not verified yet. Please check your inbox or resend the confirmation email below.");
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
      } else {
        sessionStorage.setItem('auth_method', 'signin');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for offline state first
    if (!navigator.onLine) {
      toast.error("You're offline. Please check your internet connection and try again.");
      return;
    }
    
    // CSRF validation
    const formData = new FormData(e.target as HTMLFormElement);
    if (!validateAndRegenerate(formData.get("csrf_token") as string)) {
      toast.error("Invalid form submission. Please try again.");
      return;
    }
    
    // Validate and sanitize inputs
    const validation = signUpFormSchema.safeParse({
      fullName: authData.fullName,
      email: authData.email,
      password: authData.password,
      confirmPassword: authData.confirmPassword,
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await signUp(validation.data.email, validation.data.password, validation.data.fullName);
      if (error) {
        const errorMsg = error.message?.toLowerCase() || '';
        if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('failed to fetch')) {
          toast.error("Connection failed. Please check your internet and try again.");
        } else if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please sign in.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Account created! Please check your email to verify your account, then sign in.");
        setShowEmailBanner(true);
        setAuthTab("signin");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">

      <div className="flex flex-col items-center justify-center px-4 pb-8">
        {/* Logo and Tagline */}
        <div className="text-center mb-6">
          <img 
            src={bvbooksLogo} 
            alt="BVBooks Logo" 
            className="h-24 w-auto mx-auto mb-2"
          />
          <p className="text-muted-foreground text-lg">
            Business Control System
          </p>
        </div>

        {/* Auth Card */}
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Welcome</CardTitle>
            <CardDescription className="text-base">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showEmailBanner && (
              <Alert className="mb-4 border-primary/30 bg-primary/5">
                <Mail className="h-4 w-4" />
                <AlertTitle>Check your email</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>We sent a verification link to <strong>{authData.email || "your email"}</strong>. Please check your inbox (and spam folder), click the link, then sign in.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendConfirmation}
                    disabled={isResending}
                    className="mt-1"
                  >
                    {isResending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                    Resend confirmation email
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <Tabs value={authTab} onValueChange={(v) => setAuthTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <CsrfInput />
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={authData.email}
                      onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                      disabled={isLoading}
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <Link 
                        to="/forgot-password" 
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={authData.password}
                        onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                        disabled={isLoading}
                        maxLength={100}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <CsrfInput />
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={authData.fullName}
                      onChange={(e) => setAuthData({ ...authData, fullName: e.target.value })}
                      disabled={isLoading}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={authData.email}
                      onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                      disabled={isLoading}
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={authData.password}
                        onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                        disabled={isLoading}
                        maxLength={100}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={authData.confirmPassword}
                        onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                        disabled={isLoading}
                        maxLength={100}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-center text-muted-foreground">
                Sign in to access your <span className="font-semibold text-foreground">business dashboard</span> and manage your sales, inventory, and more.
              </p>
            </div>

            {/* Terms */}
            <p className="mt-4 text-xs text-center text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="https://bvbooks.net/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="https://bvbooks.net/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function BusinessSetupForm() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: business, isLoading: businessLoading, isFetched } = useBusiness();
  const createBusiness = useCreateBusiness();
  const { csrfToken, validateAndRegenerate, CsrfInput } = useCsrfToken();
  const [formData, setFormData] = useState({
    trading_name: "",
    legal_name: "",
    category: "",
    subcategory: "",
    phone: "",
    address: "",
    description: "",
    branch_name: "",
    branch_address: "",
    branch_phone: "",
  });

  useEffect(() => {
    if (isFetched && business) {
      navigate("/dashboard", { replace: true });
    }
  }, [business, isFetched, navigate]);

  const selectedCategory = formData.category;
  const subcategories = selectedCategory ? businessCategories[selectedCategory as keyof typeof businessCategories] || [] : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CSRF validation
    const formDataEl = new FormData(e.target as HTMLFormElement);
    if (!validateAndRegenerate(formDataEl.get("csrf_token") as string)) {
      toast.error("Invalid form submission. Please try again.");
      return;
    }

    // Validate and sanitize inputs
    const validation = businessSetupSchema.safeParse(formData);
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    try {
      const newBusiness = await createBusiness.mutateAsync({
        trading_name: validation.data.trading_name,
        legal_name: validation.data.legal_name || validation.data.trading_name,
        category: validation.data.subcategory || validation.data.category,
        phone: validation.data.phone || "",
        address: validation.data.address || "",
        description: validation.data.description || "",
        branch_name: validation.data.branch_name || "",
        branch_address: validation.data.branch_address || "",
        branch_phone: validation.data.branch_phone || "",
      });
      
      // Mark setup as complete (non-blocking, best-effort)
      if (newBusiness?.id) {
        supabase.rpc('complete_business_setup', { _business_id: newBusiness.id }).then(
          () => console.log('Setup marked complete'),
          (err: unknown) => console.warn('Failed to mark setup complete:', err)
        );
      }
      
      toast.success("Business created successfully!");
      navigate("/subscription", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Failed to create business");
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (businessLoading || !isFetched) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto py-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Set Up Your Business</h1>
          <p className="text-muted-foreground mt-2">
            Let's get your business ready to manage sales and inventory
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="mt-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign out or switch account
          </Button>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>
              Enter your business information to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <CsrfInput />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="trading_name">
                    Trading Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="trading_name"
                    placeholder="My Store"
                    value={formData.trading_name}
                    onChange={(e) =>
                      setFormData({ ...formData, trading_name: e.target.value })
                    }
                    disabled={createBusiness.isPending}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_name">
                    Legal/Registered Name <span className="text-muted-foreground text-sm">(Optional)</span>
                  </Label>
                  <Input
                    id="legal_name"
                    placeholder="My Store Ltd."
                    value={formData.legal_name}
                    onChange={(e) =>
                      setFormData({ ...formData, legal_name: e.target.value })
                    }
                    disabled={createBusiness.isPending}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Business Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value, subcategory: "" })
                      }
                      disabled={createBusiness.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[40vh] overflow-y-auto">
                        {Object.keys(businessCategories).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Sub-category</Label>
                    <Select
                      value={formData.subcategory}
                      onValueChange={(value) =>
                        setFormData({ ...formData, subcategory: value })
                      }
                      disabled={createBusiness.isPending || !selectedCategory}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedCategory ? "Select sub-category" : "Select category first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[40vh] overflow-y-auto">
                        {subcategories.map((sub) => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Business Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    disabled={createBusiness.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street, Lagos"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    disabled={createBusiness.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Business Description <span className="text-muted-foreground text-sm">(Optional)</span></Label>
                  <Input
                    id="description"
                    placeholder="Briefly describe what your business does..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    maxLength={200}
                    disabled={createBusiness.isPending}
                  />
                  <p className="text-xs text-muted-foreground">{formData.description.length}/200 characters</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-medium">Main Branch Details</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Set up your first/main branch. You can add more branches later.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name</Label>
                  <Input
                    id="branch_name"
                    placeholder="Main Branch, Head Office, etc."
                    value={formData.branch_name}
                    onChange={(e) =>
                      setFormData({ ...formData, branch_name: e.target.value })
                    }
                    disabled={createBusiness.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch_address">Branch Address</Label>
                  <Input
                    id="branch_address"
                    placeholder="Branch location address"
                    value={formData.branch_address}
                    onChange={(e) =>
                      setFormData({ ...formData, branch_address: e.target.value })
                    }
                    disabled={createBusiness.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch_phone">Branch Phone</Label>
                  <Input
                    id="branch_phone"
                    type="tel"
                    placeholder="+234 801 234 5678"
                    value={formData.branch_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, branch_phone: e.target.value })
                    }
                    disabled={createBusiness.isPending}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createBusiness.isPending}
              >
                {createBusiness.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Business...
                  </>
                ) : (
                  "Create Business"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function BusinessSetup() {
  const { user, loading, signOut } = useAuth();
  const { data: business, isLoading: businessLoading, isFetched, refetch } = useBusiness();
  const navigate = useNavigate();
  const [isStaffElsewhere, setIsStaffElsewhere] = useState<boolean | null>(null);
  const [hasSettled, setHasSettled] = useState(false);

  // Redirect authenticated users with a completed business straight to dashboard
  useEffect(() => {
    if (user && isFetched && business) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isFetched, business, navigate]);

  // PWA race condition guard: if business is null after first fetch, refetch
  // multiple times with backoff to handle RLS propagation delays after login.
  useEffect(() => {
    if (!user || !isFetched || business) return;
    
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 3;
    const delays = [800, 1500, 2500];

    const retryLoop = async () => {
      while (attempt < maxAttempts && !cancelled) {
        await new Promise(r => setTimeout(r, delays[attempt]));
        if (cancelled) return;
        attempt++;
        try {
          const { data } = await refetch();
          if (data) return; // redirect effect will handle navigation
        } catch {
          // continue retrying
        }
      }
      if (!cancelled) setHasSettled(true);
    };

    retryLoop();

    // Safety timeout
    const safetyTimer = setTimeout(() => {
      if (!cancelled) setHasSettled(true);
    }, 6000);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, [user, isFetched, business, refetch]);

  // Check if user is active staff elsewhere (must be before early returns)
  useEffect(() => {
    async function checkStaffStatus() {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("staff")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (data) {
          // Staff found but business query returned null — likely a race condition
          // Retry business fetch since session should be ready by now
          const { data: retryBusiness } = await refetch();
          if (retryBusiness) {
            // redirect effect will handle navigation to dashboard
            return;
          }
          setIsStaffElsewhere(true);
        } else {
          setIsStaffElsewhere(false);
        }
      } catch (error) {
        console.error("Failed to check staff status:", error);
        setIsStaffElsewhere(false);
      }
    }
    // Only check staff status after settling (retry completed)
    if (user && isFetched && !business && hasSettled) {
      checkStaffStatus();

      const timeout = setTimeout(() => {
        setIsStaffElsewhere(prev => prev === null ? false : prev);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [user?.id, isFetched, business, hasSettled]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return <AuthForm />;
  }

  // While checking for existing business or waiting for session to settle, show loader
  if (businessLoading || !isFetched || (!business && !hasSettled)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If business exists and setup is complete, wait for redirect effect
  if (business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Still checking staff status
  if (isStaffElsewhere === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User is active staff somewhere but business could not be resolved.
  // This is likely a transient issue — show a recovery screen with prominent retry.
  if (isStaffElsewhere) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <RefreshCw className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Reconnecting to your business...</CardTitle>
            <CardDescription className="text-base">
              Your account <span className="font-medium text-foreground">{user.email}</span> is linked to a business but we're having trouble loading it.
              This usually resolves in a moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              variant="default"
              className="w-full"
              onClick={async () => {
                const { data: retryBusiness } = await refetch();
                if (retryBusiness) {
                  toast.success("Business found! Redirecting...");
                } else {
                  toast.error("Still loading. Please wait a moment and try again.");
                }
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Now
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                signOut();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show business setup form for new users
  return <BusinessSetupForm />;
}
