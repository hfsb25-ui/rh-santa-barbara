import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompanyForm from "./CompanyForm";

interface Company {
  id: string;
  nome: string;
  cnpj: string | null;
}

export default function CompanyList() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showForm, setShowForm] = useState(false);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from("empresas")
      .select("*")
      .order("nome");

    if (data) setCompanies(data);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSaved = () => {
    setShowForm(false);
    fetchCompanies();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Empresas</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {company.nome}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.cnpj && (
                <p className="text-sm text-muted-foreground">CNPJ: {company.cnpj}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Empresa</DialogTitle>
          </DialogHeader>
          <CompanyForm onSaved={handleSaved} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
