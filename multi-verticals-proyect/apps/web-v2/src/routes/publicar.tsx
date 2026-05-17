import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, ArrowRight, ArrowLeft, Check } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  cn,
} from "@allcoba/ui";
import { SiteLayout } from "#/components/layout/SiteLayout";
import { CATEGORIES } from "#/lib/mock-data";

export const Route = createFileRoute("/publicar")({
  component: PublicarPage,
});

const STEPS = ["Fotos", "Detalles", "Precio", "Publicar"];

const CONDITIONS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "como_nuevo", label: "Como nuevo" },
  { value: "buen_estado", label: "Buen estado" },
  { value: "aceptable", label: "Aceptable" },
];

function PublicarPage() {
  const navigate = Route.useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: "",
    category: "",
    condition: "",
    price: "",
    description: "",
    city: "",
    shipping: false,
  });

  const isLastStep = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      navigate({ to: "/mis-anuncios" });
    } else {
      setStep((s: number) => s + 1);
    }
  };

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-display font-bold mb-6 text-foreground">Publicar anuncio</h1>

          {/* Stepper */}
          <div className="flex items-center gap-1 mb-8">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1 flex-1">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 transition-colors",
                    i < step
                      ? "bg-primary text-primary-foreground cursor-pointer"
                      : i === step
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </button>
                <span
                  className={cn(
                    "text-xs hidden sm:block",
                    i === step ? "font-bold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-foreground">Añade fotos</h2>
                <p className="text-sm text-muted-foreground">
                  La primera foto será la portada. Añade hasta 10 fotos.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/30"
                  >
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs font-medium">Añadir foto</span>
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-bold text-foreground">Describe tu artículo</h2>
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-bold">
                    Título *
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ej. BMW Serie 3 2019, Masaje relajante 60min..."
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Categoría *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => v && setForm({ ...form, category: v })}
                  >
                    <SelectTrigger className="h-11 rounded-lg">
                      <SelectValue placeholder="Elige una categoría" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.slug} value={cat.slug} className="cursor-pointer">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">Estado *</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map(({ value, label }) => (
                      <Badge
                        key={value}
                        variant={form.condition === value ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer text-sm px-3 py-1 font-medium rounded-full",
                          form.condition === value && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setForm({ ...form, condition: value })}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-bold">
                    Descripción
                  </Label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Describe el artículo con detalle..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-bold text-foreground">Precio y ubicación</h2>
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-bold">
                    Precio (€) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                      €
                    </span>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="pl-8 h-11 rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-bold">
                    Ciudad *
                  </Label>
                  <Input
                    id="city"
                    placeholder="Ej. Madrid, Barcelona..."
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="h-11 rounded-lg"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.shipping}
                    onChange={(e) => setForm({ ...form, shipping: e.target.checked })}
                    className="w-4 h-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    Acepto envíos
                  </span>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-bold text-lg text-foreground">¡Listo para publicar!</h2>
                <p className="text-sm text-muted-foreground">
                  Tu anuncio se publicará y será visible para miles de usuarios.
                </p>
                <div className="bg-muted/50 rounded-xl p-4 text-left space-y-1 text-sm border border-border">
                  <p>
                    <span className="font-bold text-foreground">Título:</span> {form.title || "—"}
                  </p>
                  <p>
                    <span className="font-bold text-foreground">Precio:</span>{" "}
                    {form.price ? `${form.price} €` : "—"}
                  </p>
                  <p>
                    <span className="font-bold text-foreground">Ciudad:</span> {form.city || "—"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep((s: number) => s - 1)}
                className="rounded-full flex-1 h-11 font-bold"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Atrás
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="rounded-full flex-1 h-11 font-bold bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> Publicar
                </>
              ) : (
                <>
                  Siguiente <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
