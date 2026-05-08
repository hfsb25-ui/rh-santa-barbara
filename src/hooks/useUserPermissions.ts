import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserPermissions {
  role: string | null;
  allowedModules: Set<string>; // somente relevante quando role === 'admin_parcial'
  loading: boolean;
}

export function useUserPermissions(userId: string | undefined): UserPermissions {
  const [role, setRole] = useState<string | null>(null);
  const [allowedModules, setAllowedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      const r = roleData?.role || null;
      setRole(r);

      if (r === "admin_parcial") {
        const { data: perms } = await supabase
          .from("admin_module_permissions")
          .select("module_key")
          .eq("user_id", userId);
        if (!cancelled) {
          setAllowedModules(new Set((perms || []).map((p: any) => p.module_key)));
        }
      } else {
        setAllowedModules(new Set());
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { role, allowedModules, loading };
}
