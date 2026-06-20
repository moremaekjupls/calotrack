import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center">
      <Card className="w-full max-w-lg mx-4 border border-[oklch(0.97_0.012_70)]/50 bg-[oklch(0.97_0.012_70)]/70 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255, 248, 238,0.55),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/10 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-destructive" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>

          <h2 className="text-xl font-semibold text-foreground mb-4">
            Страница не найдена
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            Извините, страница, которую вы ищете, не существует.
            <br />
            Возможно, она была перемещена или удалена.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
