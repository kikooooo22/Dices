export type CurrencyId = 'points' | 'chips' | 'shards';

export interface CurrencyDef {
  id: CurrencyId;
  name: string;
  shortLabel: string;
  colorClass: string;
  desc: string;
}

export const CURRENCIES: Record<CurrencyId, CurrencyDef> = {
  points: {
    id: 'points',
    name: 'Puntos',
    shortLabel: 'pts',
    colorClass: 'text-yellow-400',
    desc: 'Moneda principal obtenida al lanzar los dados.',
  },
  chips: {
    id: 'chips',
    name: 'Fichas de Casino',
    shortLabel: 'fichas',
    colorClass: 'text-emerald-400',
    desc: 'Moneda secundaria para apostar y desbloquear ventajas en minijuegos.',
  },
  shards: {
    id: 'shards',
    name: 'Fragmentos Cósmicos',
    shortLabel: 'frag',
    colorClass: 'text-fuchsia-400',
    desc: 'Energía astral para mejoras permanentes y secretos avanzados.',
  },
};

export const INITIAL_CURRENCIES: Record<CurrencyId, number> = {
  points: 0,
  chips: 0,
  shards: 0,
};
