export type ParticipantCohort = 'venture' | 'evoke';
export type MealId =
  | 'ventureDinnerSep10'
  | 'ventureBreakfastSep11'
  | 'ventureLunchSep11'
  | 'ventureTeaSep11'
  | 'evokeBreakfastSep11'
  | 'evokeLunchSep11'
  | 'evokeTeaSep11'
  | 'evokeSnacksSep11';

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
  mealsByCohort: Record<ParticipantCohort, Meal[]>;
}

export const events: EventDefinition[] = [
  {
    id: 'evoke-expo',
    name: 'Evoke 2026',
    shortName: 'EVOKE 2026',
    format: 'Unified participant roster',
    description: 'A single check-in workspace for confirmed Evoke and Venture participants.',
    accent: 'from-[#cca943] to-[#8238b3]',
    mealsByCohort: {
      venture: [
        { id: 'ventureDinnerSep10', label: 'Dinner', date: '10 Sep', time: 'Night' },
        { id: 'ventureBreakfastSep11', label: 'Breakfast', date: '11 Sep', time: 'Morning' },
        { id: 'ventureLunchSep11', label: 'Lunch', date: '11 Sep', time: 'Afternoon' },
        { id: 'ventureTeaSep11', label: 'Evening tea', date: '11 Sep', time: 'Evening' },
      ],
      evoke: [
        { id: 'evokeBreakfastSep11', label: 'Breakfast', date: '11 Sep', time: 'Morning' },
        { id: 'evokeLunchSep11', label: 'Lunch', date: '11 Sep', time: 'Afternoon' },
        { id: 'evokeTeaSep11', label: 'Evening tea', date: '11 Sep', time: 'Evening' },
        { id: 'evokeSnacksSep11', label: 'Snacks', date: '11 Sep', time: 'Evening' },
      ],
    },
  },
];

export const getEvent = (eventId?: string) => events.find((event) => event.id === eventId);
