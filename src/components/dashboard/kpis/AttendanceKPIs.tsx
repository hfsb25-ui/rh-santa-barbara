import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, XCircle, Percent } from "lucide-react";

interface AttendanceKPIsProps {
  totalAbsences: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  absenteeismRate: number;
}

const AttendanceKPIs = ({ totalAbsences, justifiedAbsences, unjustifiedAbsences, absenteeismRate }: AttendanceKPIsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Faltas</p>
              <h3 className="text-2xl font-bold">{totalAbsences}</h3>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Justificadas</p>
              <h3 className="text-2xl font-bold text-secondary">{justifiedAbsences}</h3>
            </div>
            <CheckCircle2 className="w-8 h-8 text-secondary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Injustificadas</p>
              <h3 className="text-2xl font-bold text-destructive">{unjustifiedAbsences}</h3>
            </div>
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taxa de Absenteísmo</p>
              <h3 className="text-2xl font-bold">{absenteeismRate.toFixed(1)}%</h3>
            </div>
            <Percent className="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceKPIs;
