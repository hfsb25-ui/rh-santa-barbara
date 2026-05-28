import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface AlertaCardProps {
  titulo: string;
  descricao: string;
  nivel?: "alto" | "medio" | "info";
}

const cfg = {
  alto: { icon: AlertCircle, class: "border-red-300 bg-red-50 text-red-800" },
  medio: { icon: AlertTriangle, class: "border-yellow-300 bg-yellow-50 text-yellow-800" },
  info: { icon: Info, class: "border-blue-300 bg-blue-50 text-blue-800" },
};

export function AlertaCard({ titulo, descricao, nivel = "medio" }: AlertaCardProps) {
  const { icon: Icon, class: cls } = cfg[nivel];
  return (
    <Card className={`p-4 border-l-4 flex gap-3 items-start ${cls}`}>
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-sm uppercase tracking-wide">{titulo}</p>
        <p className="text-sm mt-1 opacity-90">{descricao}</p>
      </div>
    </Card>
  );
}
