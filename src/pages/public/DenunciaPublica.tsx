import { Card } from "@/components/ui/card";
import { Megaphone, ShieldCheck } from "lucide-react";
import { NovaDenunciaForm } from "@/components/nr1/denuncias/NovaDenunciaForm";

export default function DenunciaPublica() {
  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="p-6 shadow-elegant">
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Canal de Denúncias</h1>
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Canal 100% anônimo. Nenhum dado pessoal é registrado.
          </p>
        </Card>
        <NovaDenunciaForm />
      </div>
    </div>
  );
}
