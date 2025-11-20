import { cn } from "@/lib/utils";

interface VacationProgressProps {
  totalDays: number;
  daysPassed: number;
  vacationDays: number; // dias de férias normais
  timeOffDays: number; // dias de folgas utilizados
  className?: string;
}

export const VacationProgress = ({
  totalDays,
  daysPassed,
  vacationDays,
  timeOffDays,
  className,
}: VacationProgressProps) => {
  const totalProgress = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
  
  // Calcular a porcentagem que cada segmento ocupa do total
  const vacationPercentage = (vacationDays / totalDays) * 100;
  const timeOffPercentage = (timeOffDays / totalDays) * 100;
  
  // Calcular quanto já foi consumido de cada segmento
  const vacationConsumed = Math.min(daysPassed, vacationDays);
  const timeOffConsumed = Math.max(0, daysPassed - vacationDays);
  
  const vacationProgressPercentage = (vacationConsumed / vacationDays) * vacationPercentage;
  const timeOffProgressPercentage = (timeOffConsumed / timeOffDays) * timeOffPercentage;

  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary/20", className)}>
      {/* Barra de férias normais (verde) */}
      <div
        className="absolute left-0 h-full bg-secondary transition-all"
        style={{ width: `${Math.min(vacationProgressPercentage, vacationPercentage)}%` }}
      />
      {/* Barra de folgas (amarelo) */}
      {timeOffDays > 0 && (
        <div
          className="absolute h-full bg-warning transition-all"
          style={{ 
            left: `${vacationPercentage}%`,
            width: `${Math.min(timeOffProgressPercentage, timeOffPercentage)}%`
          }}
        />
      )}
    </div>
  );
};
