export type MealId = 'ventureDinnerSep10' | 'ventureBreakfastSep11' | 'ventureLunchSep11' | 'ventureTeaSep11';

export interface Meal {
  id: MealId;
  label: string;
  date: string;
  time: string;
}

export interface EventDefinition {
  id: 'evoke-expo';
  name: string;
  shortName: string;
  format: string;
  description: string;
  accent: string;
  meals: Meal[];
}

export const events: EventDefinition[] = [
  {
    id: 'evoke-expo',
    name: 'Evoke 2026',
    shortName: 'EVOKE 2026',
    format: 'Unified participant roster',
    description: 'A single check-in workspace for confirmed Evoke and Venture participants.',
    accent: 'from-[#cca943] to-[#8238b3]',
    meals: [],
  },
];

export const getEvent = (eventId?: string) => events.find((event) => event.id === eventId);
