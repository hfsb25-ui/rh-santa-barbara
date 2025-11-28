import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Cake, Calendar, ChevronRight } from "lucide-react";
import { useBirthdays } from "@/hooks/useBirthdays";

interface BirthdayCardProps {
  empresaId?: string;
  onViewAll: () => void;
}

export const BirthdayCard = ({ empresaId, onViewAll }: BirthdayCardProps) => {
  const { birthdaysToday, birthdaysThisMonth, loading } = useBirthdays(empresaId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cake className="w-5 h-5" />
            Aniversariantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const upcomingBirthdays = birthdaysThisMonth.slice(0, 5);

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cake className="w-5 h-5 text-amber-500" />
            Aniversariantes
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Birthdays */}
        {birthdaysToday.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500 hover:bg-green-600 text-white">
                🎉 HOJE
              </Badge>
              <span className="text-sm text-muted-foreground">
                {birthdaysToday.length} {birthdaysToday.length === 1 ? "aniversariante" : "aniversariantes"}
              </span>
            </div>
            <div className="space-y-2">
              {birthdaysToday.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={employee.foto_url || undefined} />
                    <AvatarFallback className="bg-green-500 text-white">
                      {getInitials(employee.nome_completo)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{employee.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      {employee.cargo} • {employee.age} anos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* This Month's Birthdays */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">
              Este Mês: {birthdaysThisMonth.length}
            </span>
          </div>
          
          {upcomingBirthdays.length > 0 ? (
            <div className="space-y-1.5">
              {upcomingBirthdays.map((employee) => {
                const isToday = birthdaysToday.some((b) => b.id === employee.id);
                if (isToday) return null;

                return (
                  <div
                    key={employee.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={employee.foto_url || undefined} />
                      <AvatarFallback className="text-xs bg-amber-500 text-white">
                        {getInitials(employee.nome_completo)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{employee.nome_completo}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.dayOfMonth.toString().padStart(2, "0")}/
                        {(employee.monthNumber + 1).toString().padStart(2, "0")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum aniversariante este mês
            </p>
          )}

          {birthdaysThisMonth.length > 5 && (
            <Button
              variant="link"
              size="sm"
              onClick={onViewAll}
              className="w-full text-amber-600 hover:text-amber-700"
            >
              Ver todos ({birthdaysThisMonth.length})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
