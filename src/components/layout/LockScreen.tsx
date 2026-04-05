import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LockScreenProps {
  userEmail: string;
  onUnlock: () => void;
}

export default function LockScreen({ userEmail, onUnlock }: LockScreenProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });
      if (error) {
        toast.error("Senha incorreta");
        setPassword("");
      } else {
        onUnlock();
      }
    } catch {
      toast.error("Erro ao verificar senha");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const hours = time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-500">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        {/* Clock */}
        <div className="space-y-2">
          <h1 className="text-7xl sm:text-8xl font-extralight tracking-tight text-white/90 tabular-nums">
            {hours}
          </h1>
          <p className="text-lg text-white/50 capitalize font-light">{dateStr}</p>
        </div>

        {/* Avatar / Lock icon */}
        <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
          <Lock className="w-8 h-8 text-white/60" />
        </div>

        {/* Email */}
        <p className="text-sm text-white/40">{userEmail}</p>

        {/* Password form */}
        <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-4">
          <Input
            type="password"
            placeholder="Digite sua senha para desbloquear"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 text-center h-12 rounded-xl focus-visible:ring-white/30"
          />
          <Button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full h-11 rounded-xl bg-white/15 hover:bg-white/25 text-white border-0 backdrop-blur-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Desbloquear"}
          </Button>
        </form>

        {/* Switch account */}
        <button
          onClick={handleSwitchAccount}
          className="flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors mt-4"
        >
          <LogOut className="w-3.5 h-3.5" />
          Trocar conta
        </button>
      </div>
    </div>
  );
}
