import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json' with { type: 'json' };
import esLocale from 'i18n-iso-countries/langs/es.json' with { type: 'json' };

countries.registerLocale(esLocale);
countries.registerLocale(enLocale);

export function resolveCountryCode(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  return (
    countries.getAlpha2Code(trimmed, 'es') ?? countries.getAlpha2Code(trimmed, 'en') ?? undefined
  );
}
