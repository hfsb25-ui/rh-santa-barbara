import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Administradores promovidos (admin_parcial) não podem visualizar
 * salários de outros colaboradores.
 */
export function useCanViewSalary() {
  const [canView, setCanView] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) { setCanView(false); setLoading(false); }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setCanView(data?.role !== "admin_parcial");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { canViewSalary: canView, loading };
}
