export type Area = 'Eusoff' | 'YIH' | 'Techno Edge' | 'Supper Stretch';

export type Cuisine =
  | 'Chinese'
  | 'Malay'
  | 'Indian'
  | 'Western'
  | 'Japanese'
  | 'Korean'
  | 'Other';

export const AREAS: Area[] = ['Eusoff', 'YIH', 'Techno Edge', 'Supper Stretch'];

export const CUISINES: Cuisine[] = [
  'Chinese',
  'Malay',
  'Indian',
  'Western',
  'Japanese',
  'Korean',
  'Other',
];

export interface Dish {
  id: string;
  name: string;
  place: string;
  area: Area;
  cuisine: Cuisine;
  vegetarian: boolean;
  price: number;
  rating: number; // 1 to 5
}

export interface Meal {
  id: string;
  dishId: string;
  date: string; // YYYY-MM-DD
  amountPaid: number;
  createdAt: number;
}

export interface SkippedDish {
  dish: Dish;
  ruleNumber: 1 | 2 | 3;
  ruleLabel: string;
  reason: string;
}

export interface PickResult {
  pickedDish: Dish | null;
  whyPicked: string;
  eligibleDishes: Dish[];
  skippedDishes: SkippedDish[];
  supperStretchSpentThisWeek: number;
  weekMondayStr: string;
  weekSundayStr: string;
  isThursday: boolean;
}

export const STARTING_DISHES: Dish[] = [
  {
    id: 'dish-chicken-rice',
    name: 'Chicken Rice',
    place: 'Food court',
    area: 'YIH',
    cuisine: 'Chinese',
    vegetarian: false,
    price: 4.5,
    rating: 4,
  },
  {
    id: 'dish-fish-soup',
    name: 'Fish Soup',
    place: 'Food court',
    area: 'YIH',
    cuisine: 'Chinese',
    vegetarian: false,
    price: 5.0,
    rating: 4,
  },
  {
    id: 'dish-coin-prata',
    name: 'Coin Prata',
    place: "Al Amaan's",
    area: 'Supper Stretch',
    cuisine: 'Indian',
    vegetarian: false,
    price: 5.0,
    rating: 5,
  },
  {
    id: 'dish-mee-goreng',
    name: 'Mee Goreng',
    place: "Al Amaan's",
    area: 'Supper Stretch',
    cuisine: 'Malay',
    vegetarian: false,
    price: 6.5,
    rating: 4,
  },
  {
    id: 'dish-veggie-bee-hoon',
    name: 'Veggie Bee Hoon',
    place: 'Canteen',
    area: 'Techno Edge',
    cuisine: 'Chinese',
    vegetarian: true,
    price: 3.5,
    rating: 3,
  },
  {
    id: 'dish-aglio-olio',
    name: 'Aglio Olio',
    place: 'Canteen',
    area: 'Techno Edge',
    cuisine: 'Western',
    vegetarian: true,
    price: 5.5,
    rating: 4,
  },
];

export const STARTING_MEALS: Meal[] = [];
