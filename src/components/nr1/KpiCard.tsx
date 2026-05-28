import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  variant?: "default" | "warning" | "danger" | "success";
}

const variantClasses: Record<string, string> = {
  default: "text-primary bg-primary/10",
  warning: "text-yellow-600 bg-yellow-100",
  danger: "text-red-600 bg-red-100",
  success: "text-green-600 bg-green-100",
};

export function KpiCard({ title, value, icon: Icon, subtitle, variant = "default" }: KpiCardProps) {
  return (
    <Card className="p-5 shadow-elegant border-border/50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${variantClasses[variant]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
