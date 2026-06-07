import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileSignature } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PendingHoleritesAlert = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!emp) return;
      const { data: pags } = await supabase
        .from("folha_pagamento")
        .select("id")
        .eq("employee_id", emp.id);
      if (!pags?.length) return;
      const { data: ass } = await supabase
        .from("holerite_assinaturas")
        .select("folha_pagamento_id, status")
        .in("folha_pagamento_id", pags.map((p) => p.id));
      const assinados = new Set(
        (ass || []).filter((a) => a.status === "assinado").map((a) => a.folha_pagamento_id)
      );
      setCount(pags.filter((p) => !assinados.has(p.id)).length);
    })();
  }, []);

  if (count === 0) return null;

  return (
    <div className="container mx-auto px-4 pt-4">
      <Alert className="border-orange-300 bg-orange-50">
        <FileSignature className="h-4 w-4 text-orange-600" />
        <AlertTitle className="text-orange-900">
          Você tem {count} holerite{count > 1 ? "s" : ""} pendente{count > 1 ? "s" : ""} de assinatura
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3 mt-2">
          <span className="text-orange-800 text-sm">
            Assine digitalmente para confirmar o recebimento.
          </span>
          <Button size="sm" onClick={() => navigate("/meus-holerites")}>
            Assinar agora
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PendingHoleritesAlert;
