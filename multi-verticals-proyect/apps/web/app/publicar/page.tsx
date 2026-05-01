"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@allcoba/ui";
import { Input } from "@allcoba/ui";
import { Label } from "@allcoba/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@allcoba/ui";
import { Badge } from "@allcoba/ui";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { CATEGORIES } from "@/lib/mock-data";
import { cn } from "@allcoba/ui";

const STEPS = ["Fotos", "Detalles", "Precio", "Publicar"];

const CONDITIONS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "como_nuevo", label: "Como nuevo" },
  { value: "buen_estado", label: "Buen estado" },
  { value: "aceptable", label: "Aceptable" },
];

export default function PublicarPage() {
  const router = useRouter();
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
      router.push("/mis-anuncios");
    } else {
      setStep((s: number) => s + 1);
    }
  };

  return (
    <SiteLayout>
      <div className="max-w-[80rem] mx-auto px-[1rem] py-[2rem]">
        <div className="max-w-[32rem] mx-auto">
          <h1 className="text-[1.5rem] font-display font-bold mb-[1.5rem] text-foreground">Publicar anuncio</h1>

          {/* Stepper */}
          <div className="flex items-center gap-[0.25rem] mb-[2rem]">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-[0.25rem] flex-1">
                <button
                  onClick={() => i < step && setStep(i)}
                  className={cn(
                    "w-[1.75rem] h-[1.75rem] rounded-full text-[0.75rem] font-bold flex items-center justify-center flex-shrink-0 transition-colors",
                    i < step
                      ? "bg-primary text-primary-foreground cursor-pointer"
                      : i === step
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="w-[0.875rem] h-[0.875rem]" /> : i + 1}
                </button>
                <span className={cn("text-[0.75rem] hidden sm:block", i === step ? "font-bold text-foreground" : "text-muted-foreground")}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-[0.25rem]" />}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="bg-card border border-border rounded-[1rem] p-[1.5rem] mb-[1.5rem] shadow-sm">
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="font-semibold">Añade fotos</h2>
                <p className="text-[0.875rem] text-muted-foreground">
                  La primera foto será la portada. Añade hasta 10 fotos.
                </p>
                <div className="grid grid-cols-3 gap-[0.75rem]">
                  <button className="aspect-square rounded-[0.75rem] border-2 border-dashed border-border flex flex-col items-center justify-center gap-[0.5rem] text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/30">
                    <ImagePlus className="w-[1.5rem] h-[1.5rem]" />
                    <span className="text-[0.75rem] font-medium">Añadir foto</span>
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-[1.25rem]">
                <h2 className="font-bold text-foreground">Describe tu artículo</h2>
                <div className="space-y-[0.5rem]">
                  <Label htmlFor="title" className="text-[0.875rem] font-bold">Título *</Label>
                  <Input
                    id="title"
                    placeholder="Ej. BMW Serie 3 2019, Masaje relajante 60min..."
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="h-[2.75rem] rounded-[0.5rem]"
                  />
                </div>
                <div className="space-y-[0.5rem]">
                  <Label className="text-[0.875rem] font-bold">Categoría *</Label>
                  <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                    <SelectTrigger className="h-[2.75rem] rounded-[0.5rem]">
                      <SelectValue placeholder="Elige una categoría" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[0.75rem]">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.slug} value={cat.slug} className="cursor-pointer">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-[0.5rem]">
                  <Label className="text-[0.875rem] font-bold">Estado *</Label>
                  <div className="flex flex-wrap gap-[0.5rem]">
                    {CONDITIONS.map(({ value, label }) => (
                      <Badge
                        key={value}
                        variant={form.condition === value ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer text-[0.875rem] px-[0.75rem] py-[0.25rem] font-medium rounded-full",
                          form.condition === value && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setForm({ ...form, condition: value })}
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-[0.5rem]">
                  <Label htmlFor="description" className="text-[0.875rem] font-bold">Descripción</Label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Describe el artículo con detalle..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-[0.5rem] border border-input bg-background px-[0.75rem] py-[0.5rem] text-[0.875rem] resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-[1.25rem]">
                <h2 className="font-bold text-foreground">Precio y ubicación</h2>
                <div className="space-y-[0.5rem]">
                  <Label htmlFor="price" className="text-[0.875rem] font-bold">Precio (€) *</Label>
                  <div className="relative">
                    <span className="absolute left-[0.75rem] top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="pl-[2rem] h-[2.75rem] rounded-[0.5rem]"
                    />
                  </div>
                </div>
                <div className="space-y-[0.5rem]">
                  <Label htmlFor="city" className="text-[0.875rem] font-bold">Ciudad *</Label>
                  <Input
                    id="city"
                    placeholder="Ej. Madrid, Barcelona..."
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="h-[2.75rem] rounded-[0.5rem]"
                  />
                </div>
                <label className="flex items-center gap-[0.75rem] cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.shipping}
                    onChange={(e) => setForm({ ...form, shipping: e.target.checked })}
                    className="w-[1rem] h-[1rem] rounded border-border accent-primary"
                  />
                  <span className="text-[0.875rem] font-medium text-foreground group-hover:text-primary transition-colors">Acepto envíos</span>
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-[1.25rem] text-center py-[1rem]">
                <div className="w-[4rem] h-[4rem] rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="w-[2rem] h-[2rem] text-primary" />
                </div>
                <h2 className="font-bold text-[1.125rem] text-foreground">¡Listo para publicar!</h2>
                <p className="text-[0.875rem] text-muted-foreground">
                  Tu anuncio se publicará y será visible para miles de usuarios.
                </p>
                <div className="bg-muted/50 rounded-[0.75rem] p-[1rem] text-left space-y-[0.25rem] text-[0.875rem] border border-border">
                  <p><span className="font-bold text-foreground">Título:</span> {form.title || "—"}</p>
                  <p><span className="font-bold text-foreground">Precio:</span> {form.price ? `${form.price} €` : "—"}</p>
                  <p><span className="font-bold text-foreground">Ciudad:</span> {form.city || "—"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-[0.75rem]">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s: number) => s - 1)} className="rounded-full flex-1 h-[2.75rem] font-bold">
                <ArrowLeft className="w-[1rem] h-[1rem] mr-[0.375rem]" /> Atrás
              </Button>
            )}
            <Button onClick={handleNext} className="rounded-full flex-1 h-[2.75rem] font-bold bg-accent text-accent-foreground hover:bg-accent/90 shadow-md">
              {isLastStep ? (
                <>
                  <Check className="w-[1rem] h-[1rem] mr-[0.375rem]" /> Publicar
                </>
              ) : (
                <>
                  Siguiente <ArrowRight className="w-[1rem] h-[1rem] ml-[0.375rem]" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
