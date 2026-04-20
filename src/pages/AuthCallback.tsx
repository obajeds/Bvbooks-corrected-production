import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigate("/", { replace: true });
    }, 8000);

    // Listen for auth state change - fires AFTER Supabase processes the URL hash token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        clearTimeout(timeout);
        navigate("/dashboard", { replace: true });
      }
    });

    // Also check if session already exists
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        clearTimeout(timeout);
        navigate("/dashboard", { replace: true });
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Verifying your email and signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
