import { Card, CardContent } from "@/components/ui/card";
import { Users, TrendingUp, TrendingDown, UserCheck, UserX } from "lucide-react";

interface HRKPIsProps {
  totalEmployees: number;
  activeEmployees: number;
  onVacation: number;
  onLeave: number;
  growthRate: number;
}

const HRKPIs = ({ totalEmployees, activeEmployees, onVacation, onLeave, growthRate }: HRKPIsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <h3 className="text-2xl font-bold">{totalEmployees}</h3>
            </div>
            <Users className="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ativos</p>
              <h3 className="text-2xl font-bold text-secondary">{activeEmployees}</h3>
            </div>
            <UserCheck className="w-8 h-8 text-secondary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Em Férias</p>
              <h3 className="text-2xl font-bold text-primary">{onVacation}</h3>
            </div>
            <UserX className="w-8 h-8 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Afastados</p>
              <h3 className="text-2xl font-bold text-warning">{onLeave}</h3>
            </div>
            <UserX className="w-8 h-8 text-warning" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Crescimento</p>
              <h3 className={`text-2xl font-bold ${growthRate >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </h3>
            </div>
            {growthRate >= 0 ? (
              <TrendingUp className="w-8 h-8 text-secondary" />
            ) : (
              <TrendingDown className="w-8 h-8 text-destructive" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRKPIs;
