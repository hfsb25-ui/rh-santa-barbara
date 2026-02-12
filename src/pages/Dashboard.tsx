import GestorDashboard from "@/components/dashboard/GestorDashboard";
import FuncionarioDashboard from "@/components/dashboard/FuncionarioDashboard";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      setUserRole(data?.role || null);
      setLoading(false);
    };
    fetchRole();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Acesso não autorizado</h1>
          <p className="text-muted-foreground">
            Seu usuário ainda não possui uma função atribuída.
          </p>
        </div>
      </div>
    );
  }

  if (userRole === "gestor") {
    return <GestorDashboard user={user!} />;
  }

  return <FuncionarioDashboard user={user!} />;
};

export default Dashboard;
