import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, ArrowRight, Fingerprint } from "lucide-react";
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
  const [shake, setShake] = useState(false);

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
        setShake(true);
        setTimeout(() => setShake(false), 500);
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
  const seconds = time.toLocaleTimeString("pt-BR", { second: "2-digit" });
  const dateStr = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const initials = userEmail.slice(0, 2).toUpperCase();
  const greeting = (() => {
    const h = time.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden animate-in fade-in duration-700">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" />
      
      {/* Mesh gradient orbs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[120px] animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-purple-500/20 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />

      {/* Subtle grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Noise overlay */}
      <div className="absolute inset-0 backdrop-blur-3xl bg-slate-950/30" />

      {/* Content */}
      <div className="relative z-10 h-full w-full grid grid-cols-1 lg:grid-cols-2">
        {/* Left side - Clock & info */}
        <div className="flex flex-col justify-between p-8 lg:p-16 text-white">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs uppercase tracking-[0.2em] text-white/50 font-medium">
              Sessão Bloqueada
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-white/40 text-sm font-light mb-2 capitalize">{dateStr}</p>
              <div className="flex items-baseline gap-2">
                <h1 className="text-[120px] lg:text-[180px] font-thin tracking-tighter leading-none tabular-nums bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
                  {hours}
                </h1>
                <span className="text-3xl font-thin text-white/30 tabular-nums">{seconds}</span>
              </div>
            </div>
          </div>

          <div className="text-white/30 text-xs font-light tracking-wider">
            RH SANTA BÁRBARA · SISTEMA DE GESTÃO
          </div>
        </div>

        {/* Right side - Unlock card */}
        <div className="flex items-center justify-center p-8 lg:p-16">
          <div className={`w-full max-w-sm transition-transform ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
            {/* Glass card */}
            <div className="relative rounded-3xl bg-white/[0.07] backdrop-blur-2xl border border-white/10 p-8 shadow-2xl">
              {/* Top glow */}
              <div className="absolute -top-px left-12 right-12 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

              {/* Avatar */}
              <div className="flex justify-center -mt-16 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 blur-md opacity-60" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-light border-4 border-slate-900/50 shadow-xl">
                    {initials}
                  </div>
                </div>
              </div>

              {/* Greeting */}
              <div className="text-center mb-6">
                <h2 className="text-white text-xl font-light mb-1">{greeting}</h2>
                <p className="text-white/40 text-xs truncate">{userEmail}</p>
              </div>

              {/* Form */}
              <form onSubmit={handleUnlock} className="space-y-3">
                <div className="relative group">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    disabled={loading}
                    className="w-full h-12 pl-11 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={loading || !password.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-white text-slate-900 hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 border-0 shadow-none"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest text-white/30">ou</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Switch account */}
              <button
                onClick={handleSwitchAccount}
                className="w-full flex items-center justify-center gap-2 text-sm text-white/50 hover:text-white transition-colors py-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Entrar com outra conta
              </button>
            </div>

            {/* Bottom hint */}
            <p className="text-center text-white/20 text-xs mt-6 font-light">
              Pressione Enter para desbloquear
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
