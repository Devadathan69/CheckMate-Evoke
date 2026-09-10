export type MealId = 'ventureDinnerSep10' | 'ventureBreakfastSep11' | 'ventureLunchSep11' | 'ventureTeaSep11';

export interface Meal {
  id: MealId;
  label: string;
  date: string;
  time: string;
}

export interface EventDefinition {
  id: 'venture' | 'evoke-expo';
  name: string;
  shortName: string;
  format: string;
  description: string;
  accent: string;
  meals: Meal[];
}

export const events: EventDefinition[] = [
  {
    id: 'venture',
    name: 'Venture Hackathon',
    shortName: 'VENTURE',
    format: 'Hackathon',
    description: 'Participant check-in and food service control for the Venture hackathon.',
    accent: 'from-[#8238b3] to-[#17012e]',
    meals: [
      { id: 'ventureDinnerSep10', label: 'Dinner', date: '10 Sep', time: 'Night' },
      { id: 'ventureBreakfastSep11', label: 'Breakfast', date: '11 Sep', time: 'Morning' },
      { id: 'ventureLunchSep11', label: 'Lunch', date: '11 Sep', time: 'Afternoon' },
      { id: 'ventureTeaSep11', label: 'Evening tea', date: '11 Sep', time: 'Evening' },
    ],
  },
  {
    id: 'evoke-expo',
    name: 'Evoke Project Expo',
    shortName: 'EVOKE EXPO',
    format: 'Project expo',
    description: 'A separate organiser workspace for the Evoke project expo roster.',
    accent: 'from-[#cca943] to-[#8238b3]',
    meals: [],
  },
];

export const getEvent = (eventId?: string) => events.find((event) => event.id === eventId);
