import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Pencil } from "lucide-react";
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
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

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
    setEditingCompany(null);
    fetchCompanies();
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setShowForm(true);
  };

  const handleNewCompany = () => {
    setEditingCompany(null);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Empresas</h2>
        <Button onClick={handleNewCompany}>
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
              <div className="space-y-2">
                {company.cnpj && (
                  <p className="text-sm text-muted-foreground">CNPJ: {company.cnpj}</p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEdit(company)}
                  className="w-full"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) setEditingCompany(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
          </DialogHeader>
          <CompanyForm 
            companyId={editingCompany?.id}
            initialData={editingCompany}
            onSaved={handleSaved} 
            onCancel={() => {
              setShowForm(false);
              setEditingCompany(null);
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
