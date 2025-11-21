import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ManagerForm from "./ManagerForm";

export default function ManagerList() {
  const [showForm, setShowForm] = useState(false);

  const { data: managers, isLoading, refetch } = useQuery({
    queryKey: ["managers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles:user_id (
            nome_completo,
            email
          )
        `)
        .eq("role", "gestor");

      if (error) throw error;
      return data;
    },
  });

  if (showForm) {
    return (
      <ManagerForm
        onSaved={() => {
          setShowForm(false);
          refetch();
        }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestores</h2>
        <Button onClick={() => setShowForm(true)}>
          <UserCog className="mr-2 h-4 w-4" />
          Novo Gestor
        </Button>
      </div>

      <div className="grid gap-4">
        {managers?.map((manager) => (
          <Card key={manager.user_id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    {manager.profiles?.nome_completo}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {manager.profiles?.email}
                  </p>
                </div>
                <Badge variant="secondary">Gestor</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
