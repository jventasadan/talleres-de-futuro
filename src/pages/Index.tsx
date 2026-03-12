import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Wrench, Phone, Calendar, Zap, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">AutoTaller AI</span>
        </div>
        <Button onClick={() => navigate("/dashboard")}>
          Acceder al panel
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Automatización con IA para talleres
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Tu taller, atendido
            <span className="text-primary"> 24/7</span> por IA
          </h1>
          <p className="text-lg text-muted-foreground">
            Un asistente de voz inteligente que contesta llamadas, agenda citas y
            gestiona clientes. Sin perder una sola llamada.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => navigate("/dashboard")}>
              Empezar ahora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              Ver demo
            </Button>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: Phone,
              title: "Llamadas IA",
              desc: "Asistente de voz que contesta y agenda automáticamente",
            },
            {
              icon: Calendar,
              title: "Gestión de citas",
              desc: "Control total de la agenda desde un panel simple",
            },
            {
              icon: Zap,
              title: "Automatizaciones",
              desc: "Conecta con WhatsApp, n8n y más herramientas",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border bg-card p-5 text-left transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground">
        © 2026 AutoTaller AI. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default Index;
