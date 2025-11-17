import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import EmployeeInfo from "@/components/employees/EmployeeInfo";
import EmployeeForm from "@/components/forms/EmployeeForm";
import EpiTab from "@/components/employees/tabs/EpiTab";
import UniformTab from "@/components/employees/tabs/UniformTab";
import VacationTab from "@/components/employees/tabs/VacationTab";
import AbsenceTab from "@/components/employees/tabs/AbsenceTab";
import FaultTab from "@/components/employees/tabs/FaultTab";
import TimeOffTab from "@/components/employees/tabs/TimeOffTab";

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setEmployee(data);
    } catch (error) {
      console.error("Error fetching employee:", error);
      toast.error("Erro ao carregar funcionário");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Funcionário não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Funcionário</DialogTitle>
              </DialogHeader>
              <EmployeeForm
                employeeId={id}
                initialData={employee}
                onSaved={() => {
                  setShowEditDialog(false);
                  fetchEmployee();
                }}
                onCancel={() => setShowEditDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <EmployeeInfo employee={employee} onUpdate={fetchEmployee} />

        <Tabs defaultValue="epis" className="mt-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="epis">EPIs</TabsTrigger>
            <TabsTrigger value="uniformes">Uniformes</TabsTrigger>
            <TabsTrigger value="ferias">Férias</TabsTrigger>
            <TabsTrigger value="afastamentos">Afastamentos</TabsTrigger>
            <TabsTrigger value="folgas">Folgas</TabsTrigger>
            <TabsTrigger value="faltas">Faltas</TabsTrigger>
          </TabsList>

          <TabsContent value="epis">
            <EpiTab employeeId={id!} />
          </TabsContent>

          <TabsContent value="uniformes">
            <UniformTab employeeId={id!} />
          </TabsContent>

          <TabsContent value="ferias">
            <VacationTab employeeId={id!} />
          </TabsContent>

          <TabsContent value="afastamentos">
            <AbsenceTab employeeId={id!} />
          </TabsContent>

          <TabsContent value="folgas">
            <TimeOffTab employeeId={id!} />
          </TabsContent>

          <TabsContent value="faltas">
            <FaultTab employeeId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EmployeeDetails;
