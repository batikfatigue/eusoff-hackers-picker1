import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  ListChecks,
  Receipt,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Calendar,
  Star,
} from 'lucide-react';
import {
  Area,
  AREAS,
  Cuisine,
  CUISINES,
  Dish,
  Meal,
  STARTING_DISHES,
  STARTING_MEALS,
} from './types';
import {
  evaluateMealRules,
  formatHumanDate,
  getLastEatenDate,
} from './rules';

const STORAGE_KEYS = {
  DISHES: 'makan_pick_dishes_v1',
  MEALS: 'makan_pick_meals_v1',
  PRETEND_TODAY: 'makan_pick_pretend_today_v1',
};

function getRealTodayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const EXAMPLE_DATES: { label: string; value: string }[] = [
  { label: 'Mon 19 Oct', value: '2026-10-19' },
  { label: 'Sun 25 Oct', value: '2026-10-25' },
  { label: 'Mon 26 Oct', value: '2026-10-26' },
  { label: 'Wed 28 Oct', value: '2026-10-28' },
  { label: 'Thu 29 Oct', value: '2026-10-29' },
  { label: 'Fri 30 Oct', value: '2026-10-30' },
];

type TabId = 'pick' | 'dishes' | 'meals' | 'settings';

export default function App() {
  // All state is persisted to the browser's localStorage
  const [dishes, setDishes] = useState<Dish[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DISHES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return STARTING_DISHES;
  });

  const [meals, setMeals] = useState<Meal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEALS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return STARTING_MEALS;
  });

  const [pretendToday, setPretendToday] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRETEND_TODAY);
      if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return getRealTodayStr();
  });

  const [activeTab, setActiveTab] = useState<TabId>('pick');
  const [skippedOpen, setSkippedOpen] = useState<boolean>(false);
  const [justLoggedBanner, setJustLoggedBanner] = useState<string | null>(null);
  const [resetBanner, setResetBanner] = useState<string | null>(null);
  const [pickHighlight, setPickHighlight] = useState<boolean>(false);

  // Sync state changes to browser localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DISHES, JSON.stringify(dishes));
    } catch {
      // ignore
    }
  }, [dishes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    } catch {
      // ignore
    }
  }, [meals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRETEND_TODAY, pretendToday);
    } catch {
      // ignore
    }
  }, [pretendToday]);

  const pickResult = useMemo(
    () => evaluateMealRules(dishes, meals, pretendToday),
    [dishes, meals, pretendToday]
  );

  useEffect(() => {
    if (pickResult.pickedDish === null && pickResult.skippedDishes.length > 0) {
      setSkippedOpen(true);
    }
  }, [pickResult.pickedDish, pickResult.skippedDishes.length]);

  // Dish Add/Edit state
  const [isAddingDish, setIsAddingDish] = useState<boolean>(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [dishForm, setDishForm] = useState<{
    name: string;
    place: string;
    area: Area;
    cuisine: Cuisine;
    vegetarian: boolean;
    price: string;
    rating: number;
  }>({
    name: '',
    place: '',
    area: 'YIH',
    cuisine: 'Chinese',
    vegetarian: false,
    price: '5.00',
    rating: 4,
  });

  // Meal Add/Edit state
  const [mealDishId, setMealDishId] = useState<string>(() =>
    dishes[0] ? dishes[0].id : ''
  );
  const [mealDate, setMealDate] = useState<string>(pretendToday);
  const [mealAmountPaid, setMealAmountPaid] = useState<string>(() =>
    dishes[0] ? dishes[0].price.toFixed(2) : '5.00'
  );
  const [mealAmountManuallyEdited, setMealAmountManuallyEdited] =
    useState<boolean>(false);

  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editMealDate, setEditMealDate] = useState<string>('');
  const [editMealAmount, setEditMealAmount] = useState<string>('');

  useEffect(() => {
    setMealDate(pretendToday);
  }, [pretendToday]);

  useEffect(() => {
    if (dishes.length > 0 && !dishes.some((d) => d.id === mealDishId)) {
      const first = dishes[0];
      setMealDishId(first.id);
      if (!mealAmountManuallyEdited) {
        setMealAmountPaid(first.price.toFixed(2));
      }
    }
  }, [dishes, mealDishId, mealAmountManuallyEdited]);

  const handleSelectMealDish = (newDishId: string) => {
    setMealDishId(newDishId);
    const found = dishes.find((d) => d.id === newDishId);
    if (found) {
      setMealAmountPaid(found.price.toFixed(2));
      setMealAmountManuallyEdited(false);
    }
  };

  const handleWhatShouldIEat = () => {
    setActiveTab('pick');
    setJustLoggedBanner(null);
    setPickHighlight(true);
    setTimeout(() => setPickHighlight(false), 350);
  };

  const handleEatThis = () => {
    if (!pickResult.pickedDish) return;
    const chosen = pickResult.pickedDish;
    const newMeal: Meal = {
      id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dishId: chosen.id,
      date: pretendToday,
      amountPaid: chosen.price,
      createdAt: Date.now(),
    };
    setMeals((prev) => [newMeal, ...prev]);
    setJustLoggedBanner(
      `Logged ${chosen.name} ($${chosen.price.toFixed(2)}) for ${formatHumanDate(
        pretendToday
      )}.`
    );
  };

  const handleResetToStartingData = () => {
    setDishes(STARTING_DISHES);
    setMeals(STARTING_MEALS);
    setIsAddingDish(false);
    setEditingDishId(null);
    setEditingMealId(null);
    setSkippedOpen(false);
    setJustLoggedBanner(null);
    if (STARTING_DISHES[0]) {
      setMealDishId(STARTING_DISHES[0].id);
      setMealAmountPaid(STARTING_DISHES[0].price.toFixed(2));
      setMealAmountManuallyEdited(false);
    }
    setResetBanner('Reset to starting data (6 dishes, no meals logged).');
    setTimeout(() => setResetBanner(null), 4000);
  };

  const openAddDishForm = () => {
    setEditingDishId(null);
    setDishForm({
      name: '',
      place: '',
      area: 'YIH',
      cuisine: 'Chinese',
      vegetarian: false,
      price: '5.00',
      rating: 4,
    });
    setIsAddingDish(true);
  };

  const openEditDishForm = (dish: Dish) => {
    setIsAddingDish(false);
    setEditingDishId(dish.id);
    setDishForm({
      name: dish.name,
      place: dish.place,
      area: dish.area,
      cuisine: dish.cuisine,
      vegetarian: dish.vegetarian,
      price: dish.price.toFixed(2),
      rating: dish.rating,
    });
  };

  const handleSaveDish = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = dishForm.name.trim();
    const trimmedPlace = dishForm.place.trim();
    if (!trimmedName || !trimmedPlace) return;

    const parsedPrice = Math.max(0, parseFloat(dishForm.price) || 0);
    const clampedRating = Math.min(5, Math.max(1, Math.round(dishForm.rating)));

    if (editingDishId) {
      setDishes((prev) =>
        prev.map((d) =>
          d.id === editingDishId
            ? {
                ...d,
                name: trimmedName,
                place: trimmedPlace,
                area: dishForm.area,
                cuisine: dishForm.cuisine,
                vegetarian: dishForm.vegetarian,
                price: parsedPrice,
                rating: clampedRating,
              }
            : d
        )
      );
      setEditingDishId(null);
    } else {
      const newDish: Dish = {
        id: `dish-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: trimmedName,
        place: trimmedPlace,
        area: dishForm.area,
        cuisine: dishForm.cuisine,
        vegetarian: dishForm.vegetarian,
        price: parsedPrice,
        rating: clampedRating,
      };
      setDishes((prev) => [...prev, newDish]);
      setIsAddingDish(false);
    }
  };

  const handleQuickRateDish = (dishId: string, newRating: number) => {
    setDishes((prev) =>
      prev.map((d) => (d.id === dishId ? { ...d, rating: newRating } : d))
    );
  };

  const handleDeleteDish = (dishId: string) => {
    setDishes((prev) => prev.filter((d) => d.id !== dishId));
    setMeals((prev) => prev.filter((m) => m.dishId !== dishId));
    if (editingDishId === dishId) {
      setEditingDishId(null);
    }
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealDishId || !mealDate) return;
    const amount = Math.max(0, parseFloat(mealAmountPaid) || 0);
    const newMeal: Meal = {
      id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dishId: mealDishId,
      date: mealDate,
      amountPaid: amount,
      createdAt: Date.now(),
    };
    setMeals((prev) => [newMeal, ...prev]);
    const selectedDish = dishes.find((d) => d.id === mealDishId);
    if (selectedDish) {
      setMealAmountPaid(selectedDish.price.toFixed(2));
      setMealAmountManuallyEdited(false);
    }
  };

  const startEditMeal = (meal: Meal) => {
    setEditingMealId(meal.id);
    setEditMealDate(meal.date);
    setEditMealAmount(meal.amountPaid.toFixed(2));
  };

  const handleSaveEditMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMealId || !editMealDate) return;
    const parsedAmount = Math.max(0, parseFloat(editMealAmount) || 0);
    setMeals((prev) =>
      prev.map((m) =>
        m.id === editingMealId
          ? { ...m, date: editMealDate, amountPaid: parsedAmount }
          : m
      )
    );
    setEditingMealId(null);
  };

  const handleDeleteMeal = (mealId: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
    if (editingMealId === mealId) {
      setEditingMealId(null);
    }
  };

  const sortedMeals = useMemo(() => {
    return [...meals].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.createdAt - a.createdAt;
    });
  }, [meals]);

  const dishById = useMemo(() => {
    const map = new Map<string, Dish>();
    for (const d of dishes) map.set(d.id, d);
    return map;
  }, [dishes]);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] text-stone-900 pb-20 lg:pb-12">
      {/* Top Bar following strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-14 bg-[#faf9f6]/95 backdrop-blur-md border-b border-stone-200 px-4 lg:px-8 flex items-center justify-between gap-8">
        <a
          href="#pick"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('pick');
          }}
          className="text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
        >
          DishDecider
        </a>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-stone-600">
          <button
            type="button"
            onClick={() => setActiveTab('pick')}
            className={`min-h-[44px] px-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'pick'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Main
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dishes')}
            className={`min-h-[44px] px-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'dishes'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Dishes ({dishes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('meals')}
            className={`min-h-[44px] px-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'meals'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Meals ({meals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`min-h-[44px] px-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'settings'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Settings
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleWhatShouldIEat}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0"
          >
            What should I eat?
          </button>
        </div>
      </header>

      {/* Subtle Mobile Context Bar */}
      <div className="lg:hidden border-b border-stone-200 bg-stone-100/70 px-4 py-2 flex items-center justify-between gap-2 text-xs text-stone-600">
        <span>
          Pretend today is:{' '}
          <strong className="font-semibold text-stone-900 font-mono-tabular">
            {formatHumanDate(pretendToday, true)}
          </strong>
        </span>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className="text-amber-800 font-semibold underline underline-offset-2 whitespace-nowrap shrink-0 py-1"
        >
          Change date / Reset
        </button>
      </div>

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        {resetBanner && (
          <div
            role="status"
            className="mb-6 p-3.5 rounded-xl bg-stone-900 text-white text-sm flex items-center justify-between gap-3"
          >
            <span>{resetBanner}</span>
            <button
              type="button"
              onClick={() => setResetBanner(null)}
              className="text-xs text-stone-300 hover:text-white underline whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* ==================== TAB 1: MAIN SCREEN (PICK) ==================== */}
            {activeTab === 'pick' && (
              <section aria-label="Main meal picker" className="space-y-6">
                <div>
                  <button
                    type="button"
                    onClick={handleWhatShouldIEat}
                    className="w-full min-h-[56px] py-4 px-6 rounded-2xl bg-amber-700 hover:bg-amber-800 active:scale-[0.99] text-white font-bold text-lg tracking-tight shadow-sm transition-all flex items-center justify-center gap-3 whitespace-nowrap"
                  >
                    <Utensils className="w-5 h-5 shrink-0" />
                    <span>What should I eat?</span>
                  </button>
                </div>

                <div
                  className={`rounded-2xl bg-white border transition-colors p-6 sm:p-7 ${
                    pickHighlight ? 'border-amber-700' : 'border-stone-200'
                  }`}
                >
                  {pickResult.pickedDish ? (
                    <div className="space-y-5">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-xs font-semibold text-amber-800">
                          Today&apos;s pick · {formatHumanDate(pretendToday)}
                        </span>
                        <span className="text-xs text-stone-500 font-mono-tabular">
                          {pickResult.pickedDish.rating} / 5 ★
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                        <div>
                          <h1
                            className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900"
                            style={{ textWrap: 'balance' }}
                          >
                            {pickResult.pickedDish.name}
                          </h1>
                          <p className="mt-1.5 text-sm text-stone-600">
                            <span className="font-semibold text-stone-800">
                              {pickResult.pickedDish.place}
                            </span>
                            <span aria-hidden="true"> · </span>
                            <span>{pickResult.pickedDish.area}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{pickResult.pickedDish.cuisine}</span>
                            <span aria-hidden="true"> · </span>
                            <span>
                              {pickResult.pickedDish.vegetarian
                                ? 'Vegetarian'
                                : 'Non-vegetarian'}
                            </span>
                          </p>
                        </div>

                        <div className="text-2xl sm:text-3xl font-bold text-stone-900 font-mono-tabular shrink-0">
                          ${pickResult.pickedDish.price.toFixed(2)}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-stone-100">
                        <p className="text-sm text-stone-700 leading-relaxed">
                          <span className="font-semibold text-stone-900">
                            Why:{' '}
                          </span>
                          {pickResult.whyPicked}
                        </p>
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={handleEatThis}
                          className="w-full min-h-[48px] py-3 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          <Check className="w-4 h-4 shrink-0" />
                          <span>I&apos;m eating this</span>
                        </button>
                      </div>

                      {justLoggedBanner && (
                        <p
                          role="status"
                          className="text-xs font-semibold text-emerald-800 pt-1"
                        >
                          {justLoggedBanner}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 py-2">
                      <span className="text-xs font-semibold text-amber-800">
                        {formatHumanDate(pretendToday)}
                      </span>
                      <h1
                        className="text-2xl font-bold tracking-tight text-stone-900"
                        style={{ textWrap: 'balance' }}
                      >
                        Nothing fits your rules today
                      </h1>
                      <p className="text-sm text-stone-600">
                        Every dish in your list was skipped by at least one rule
                        today. See why each dish was skipped below.
                      </p>
                    </div>
                  )}
                </div>

                {/* Folded "Skipped today" list */}
                <div className="rounded-2xl bg-white border border-stone-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSkippedOpen((prev) => !prev)}
                    aria-expanded={skippedOpen}
                    className="w-full min-h-[52px] px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {skippedOpen ? (
                        <ChevronDown className="w-4 h-4 text-stone-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-500 shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-stone-900">
                        Skipped today
                      </span>
                      <span aria-hidden="true" className="text-stone-400">
                        ·
                      </span>
                      <span className="text-xs text-stone-500 font-mono-tabular">
                        {pickResult.skippedDishes.length}{' '}
                        {pickResult.skippedDishes.length === 1
                          ? 'dish'
                          : 'dishes'}
                      </span>
                    </div>
                    <span className="text-xs text-stone-500 whitespace-nowrap shrink-0">
                      {skippedOpen ? 'Hide reasons' : 'Show reasons'}
                    </span>
                  </button>

                  {skippedOpen && (
                    <div className="border-t border-stone-200 divide-y divide-stone-100">
                      {pickResult.skippedDishes.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-stone-500">
                          No dishes were skipped today. All {dishes.length}{' '}
                          dishes fit your rules.
                        </p>
                      ) : (
                        pickResult.skippedDishes.map(
                          ({ dish, ruleLabel, reason }) => (
                            <div
                              key={dish.id}
                              className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5"
                            >
                              <div>
                                <div className="text-sm font-semibold text-stone-900">
                                  {dish.name}
                                  <span className="font-normal text-stone-500">
                                    {' '}
                                    · {dish.place} · {dish.area} · $
                                    {dish.price.toFixed(2)}
                                  </span>
                                </div>
                                <div className="text-xs text-stone-600 mt-0.5">
                                  <span className="font-semibold text-stone-800">
                                    {ruleLabel}:
                                  </span>{' '}
                                  {reason}
                                </div>
                              </div>
                            </div>
                          )
                        )
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ==================== TAB 2: DISHES ==================== */}
            {activeTab === 'dishes' && (
              <section aria-label="Dishes management" className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-stone-900">
                      Dishes
                    </h1>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Add, edit, or delete dishes from your list. Tap stars on
                      any dish for a quick rating change.
                    </p>
                  </div>
                  {!isAddingDish && !editingDishId && (
                    <button
                      type="button"
                      onClick={openAddDishForm}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add dish</span>
                    </button>
                  )}
                </div>

                {/* Add / Edit Dish Form */}
                {(isAddingDish || editingDishId) && (
                  <form
                    onSubmit={handleSaveDish}
                    className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-stone-900">
                        {editingDishId ? 'Edit dish' : 'Add dish'}
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingDish(false);
                          setEditingDishId(null);
                        }}
                        className="text-xs text-stone-500 hover:text-stone-800 min-h-[36px] px-2"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="dish-name"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Dish
                        </label>
                        <input
                          id="dish-name"
                          type="text"
                          required
                          value={dishForm.name}
                          onChange={(e) =>
                            setDishForm((f) => ({ ...f, name: e.target.value }))
                          }
                          placeholder="e.g. Chicken Rice"
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="dish-place"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Place (stall or shop)
                        </label>
                        <input
                          id="dish-place"
                          type="text"
                          required
                          value={dishForm.place}
                          onChange={(e) =>
                            setDishForm((f) => ({
                              ...f,
                              place: e.target.value,
                            }))
                          }
                          placeholder="e.g. Food court"
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="dish-area"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Area
                        </label>
                        <select
                          id="dish-area"
                          value={dishForm.area}
                          onChange={(e) =>
                            setDishForm((f) => ({
                              ...f,
                              area: e.target.value as Area,
                            }))
                          }
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                        >
                          {AREAS.map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="dish-cuisine"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Cuisine
                        </label>
                        <select
                          id="dish-cuisine"
                          value={dishForm.cuisine}
                          onChange={(e) =>
                            setDishForm((f) => ({
                              ...f,
                              cuisine: e.target.value as Cuisine,
                            }))
                          }
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                        >
                          {CUISINES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="dish-price"
                          className="block text-xs font-semibold text-stone-700 mb-1"
                        >
                          Price ($)
                        </label>
                        <input
                          id="dish-price"
                          type="number"
                          step="0.10"
                          min="0"
                          required
                          value={dishForm.price}
                          onChange={(e) =>
                            setDishForm((f) => ({
                              ...f,
                              price: e.target.value,
                            }))
                          }
                          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 font-mono-tabular focus:outline-none focus:border-stone-900"
                        />
                      </div>

                      <div>
                        <span className="block text-xs font-semibold text-stone-700 mb-1">
                          Vegetarian
                        </span>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
                          <button
                            type="button"
                            onClick={() =>
                              setDishForm((f) => ({ ...f, vegetarian: true }))
                            }
                            className={`min-h-[36px] text-xs font-semibold rounded-lg transition-colors ${
                              dishForm.vegetarian
                                ? 'bg-white text-stone-900 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            yes
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDishForm((f) => ({ ...f, vegetarian: false }))
                            }
                            className={`min-h-[36px] text-xs font-semibold rounded-lg transition-colors ${
                              !dishForm.vegetarian
                                ? 'bg-white text-stone-900 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            no
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-xs font-semibold text-stone-700 mb-1">
                        Rating (1 to 5 stars)
                      </span>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setDishForm((f) => ({ ...f, rating: star }))
                            }
                            className={`min-h-[44px] min-w-[44px] rounded-xl border text-sm font-semibold flex items-center justify-center gap-1 transition-colors ${
                              dishForm.rating >= star
                                ? 'border-amber-700 bg-amber-50 text-amber-900'
                                : 'border-stone-200 bg-white text-stone-400 hover:text-stone-700'
                            }`}
                          >
                            <span>{star}</span>
                            <Star
                              className={`w-3.5 h-3.5 ${
                                dishForm.rating >= star
                                  ? 'fill-amber-600 text-amber-600'
                                  : ''
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingDish(false);
                          setEditingDishId(null);
                        }}
                        className="min-h-[44px] px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 whitespace-nowrap"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="min-h-[44px] px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white whitespace-nowrap"
                      >
                        Save dish
                      </button>
                    </div>
                  </form>
                )}

                {/* Dishes List */}
                <div className="rounded-2xl bg-white border border-stone-200 divide-y divide-stone-100">
                  {dishes.length === 0 ? (
                    <div className="p-8 text-center text-sm text-stone-500">
                      No dishes in your list. Add a dish or reset to starting
                      data in Settings.
                    </div>
                  ) : (
                    dishes.map((dish) => {
                      const lastEaten = getLastEatenDate(
                        dish.id,
                        meals,
                        pretendToday
                      );
                      return (
                        <div
                          key={dish.id}
                          className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2.5">
                              <h3 className="text-base font-bold text-stone-900">
                                {dish.name}
                              </h3>
                              <span className="text-sm font-bold text-stone-900 font-mono-tabular">
                                ${dish.price.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600">
                              <span>{dish.place}</span>
                              <span aria-hidden="true"> · </span>
                              <span>{dish.area}</span>
                              <span aria-hidden="true"> · </span>
                              <span>{dish.cuisine}</span>
                              <span aria-hidden="true"> · </span>
                              <span>
                                Vegetarian: {dish.vegetarian ? 'yes' : 'no'}
                              </span>
                              <span aria-hidden="true"> · </span>
                              <span>
                                {lastEaten
                                  ? `Last eaten ${formatHumanDate(lastEaten)}`
                                  : 'Never eaten'}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <div
                              className="flex items-center gap-0.5"
                              aria-label={`Rate ${dish.name}`}
                            >
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() =>
                                    handleQuickRateDish(dish.id, star)
                                  }
                                  title={`Set ${dish.name} rating to ${star} stars`}
                                  className="min-h-[40px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      dish.rating >= star
                                        ? 'fill-amber-600 text-amber-600'
                                        : 'text-stone-300'
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="ml-1 text-xs font-mono-tabular text-stone-600">
                                ({dish.rating})
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditDishForm(dish)}
                                aria-label={`Edit ${dish.name}`}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDish(dish.id)}
                                aria-label={`Delete ${dish.name}`}
                                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-stone-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            )}

            {/* ==================== TAB 3: MEALS ==================== */}
            {activeTab === 'meals' && (
              <section aria-label="Meals log" className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-stone-900">
                    Meals
                  </h1>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Log a meal for any dish, or edit and delete past meals
                    (shown newest first).
                  </p>
                </div>

                {/* Add a Meal Form */}
                <form
                  onSubmit={handleAddMeal}
                  className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 space-y-4"
                >
                  <h2 className="text-sm font-bold text-stone-900">
                    Add a meal
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="meal-dish"
                        className="block text-xs font-semibold text-stone-700 mb-1"
                      >
                        Dish
                      </label>
                      <select
                        id="meal-dish"
                        value={mealDishId}
                        onChange={(e) => handleSelectMealDish(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:border-stone-900"
                      >
                        {dishes.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} (${d.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="meal-date"
                        className="block text-xs font-semibold text-stone-700 mb-1"
                      >
                        Date
                      </label>
                      <input
                        id="meal-date"
                        type="date"
                        required
                        value={mealDate}
                        onChange={(e) => setMealDate(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 font-mono-tabular focus:outline-none focus:border-stone-900"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="meal-amount"
                        className="block text-xs font-semibold text-stone-700 mb-1"
                      >
                        Amount paid ($)
                      </label>
                      <input
                        id="meal-amount"
                        type="number"
                        step="0.10"
                        min="0"
                        required
                        value={mealAmountPaid}
                        onChange={(e) => {
                          setMealAmountPaid(e.target.value);
                          setMealAmountManuallyEdited(true);
                        }}
                        className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 font-mono-tabular focus:outline-none focus:border-stone-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs text-stone-500">
                      Quick meal date presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {EXAMPLE_DATES.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setMealDate(preset.value)}
                          className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            mealDate === preset.value
                              ? 'bg-stone-900 text-white'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={dishes.length === 0}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add meal</span>
                    </button>
                  </div>
                </form>

                {/* Logged Meals List */}
                <div className="rounded-2xl bg-white border border-stone-200 divide-y divide-stone-100">
                  {sortedMeals.length === 0 ? (
                    <div className="p-8 text-center text-sm text-stone-500">
                      No meals logged yet.
                    </div>
                  ) : (
                    sortedMeals.map((meal) => {
                      const dish = dishById.get(meal.dishId);
                      const isEditing = editingMealId === meal.id;

                      return (
                        <div key={meal.id} className="p-4 sm:p-5">
                          {isEditing ? (
                            <form
                              onSubmit={handleSaveEditMeal}
                              className="space-y-3"
                            >
                              <div className="text-sm font-bold text-stone-900">
                                Edit meal · {dish ? dish.name : 'Unknown dish'}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                                    Date
                                  </label>
                                  <input
                                    type="date"
                                    required
                                    value={editMealDate}
                                    onChange={(e) =>
                                      setEditMealDate(e.target.value)
                                    }
                                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm font-mono-tabular"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                                    Amount paid ($)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.10"
                                    min="0"
                                    required
                                    value={editMealAmount}
                                    onChange={(e) =>
                                      setEditMealAmount(e.target.value)
                                    }
                                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm font-mono-tabular"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {EXAMPLE_DATES.map((preset) => (
                                  <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() =>
                                      setEditMealDate(preset.value)
                                    }
                                    className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-medium ${
                                      editMealDate === preset.value
                                        ? 'bg-stone-900 text-white'
                                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                    }`}
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingMealId(null)}
                                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="min-h-[40px] px-4 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-semibold"
                                >
                                  Save changes
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="flex items-baseline gap-2.5">
                                  <span className="text-base font-bold text-stone-900">
                                    {dish ? dish.name : 'Deleted dish'}
                                  </span>
                                  <span className="text-sm font-bold text-stone-900 font-mono-tabular">
                                    ${meal.amountPaid.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-600 mt-0.5">
                                  <span className="font-semibold text-stone-800 font-mono-tabular">
                                    {formatHumanDate(meal.date, true)}
                                  </span>
                                  {dish && (
                                    <>
                                      <span aria-hidden="true"> · </span>
                                      <span>{dish.place}</span>
                                      <span aria-hidden="true"> · </span>
                                      <span>{dish.area}</span>
                                      <span aria-hidden="true"> · </span>
                                      <span>{dish.cuisine}</span>
                                    </>
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEditMeal(meal)}
                                  aria-label="Edit meal"
                                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMeal(meal.id)}
                                  aria-label="Delete meal"
                                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-stone-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            )}

            {/* ==================== TAB 4: SETTINGS ==================== */}
            {activeTab === 'settings' && (
              <section aria-label="Settings" className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-stone-900">
                    Settings
                  </h1>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Control today&apos;s simulated date for testing rules, or
                    reset back to starting data.
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 space-y-6">
                  <div className="space-y-3">
                    <label
                      htmlFor="settings-pretend-today"
                      className="block text-sm font-bold text-stone-900"
                    >
                      Pretend today is
                    </label>
                    <p className="text-xs text-stone-600">
                      Used everywhere the app needs today&apos;s date, including
                      rules and new meal entries. Currently:{' '}
                      <strong className="text-stone-900 font-mono-tabular">
                        {formatHumanDate(pretendToday, true)}
                      </strong>
                    </p>
                    <input
                      id="settings-pretend-today"
                      type="date"
                      value={pretendToday}
                      onChange={(e) => {
                        if (e.target.value) setPretendToday(e.target.value);
                      }}
                      className="w-full sm:w-64 min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 font-mono-tabular focus:outline-none focus:border-stone-900"
                    />

                    <div className="pt-1 space-y-1.5">
                      <span className="block text-xs text-stone-500">
                        Quick dates from Part 1 examples:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {EXAMPLE_DATES.map((preset) => (
                          <button
                            key={preset.value}
                            type="button"
                            onClick={() => setPretendToday(preset.value)}
                            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                              pretendToday === preset.value
                                ? 'bg-amber-700 text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPretendToday(getRealTodayStr())}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 whitespace-nowrap"
                        >
                          Real today
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-stone-200 space-y-3">
                    <h2 className="text-sm font-bold text-stone-900">
                      Starting data
                    </h2>
                    <p className="text-xs text-stone-600">
                      Restores the 6 starting dishes (Chicken Rice, Fish Soup,
                      Coin Prata, Mee Goreng, Veggie Bee Hoon, Aglio Olio) and
                      clears all logged meals.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetToStartingData}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-900 text-xs font-semibold flex items-center gap-2 whitespace-nowrap"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset to starting data</span>
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Settings, Date & Rule Tracker */}
          <aside className="lg:col-span-5 xl:col-span-4 space-y-6">
            <div className="rounded-2xl bg-white border border-stone-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-800 shrink-0" />
                  <h2 className="text-sm font-bold text-stone-900">
                    Settings &amp; Date
                  </h2>
                </div>
                <span className="text-xs font-semibold text-stone-600 font-mono-tabular">
                  {formatHumanDate(pretendToday)}
                </span>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="sidebar-pretend-today"
                  className="block text-xs font-semibold text-stone-700"
                >
                  Pretend today is
                </label>
                <input
                  id="sidebar-pretend-today"
                  type="date"
                  value={pretendToday}
                  onChange={(e) => {
                    if (e.target.value) setPretendToday(e.target.value);
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 font-mono-tabular focus:outline-none focus:border-stone-900"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {EXAMPLE_DATES.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setPretendToday(preset.value)}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        pretendToday === preset.value
                          ? 'bg-amber-700 text-white'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleResetToStartingData}
                  className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-900 text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to starting data</span>
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-stone-200 p-5 space-y-4">
              <h2 className="text-sm font-bold text-stone-900">
                Your 4 Rules ({formatHumanDate(pretendToday)})
              </h2>

              <ol className="space-y-3 text-xs text-stone-600 list-decimal list-inside">
                <li>
                  <span className="font-semibold text-stone-800">
                    Thursdays vegetarian:
                  </span>{' '}
                  Skip non-vegetarian dishes on Thursdays.{' '}
                  <span className="text-stone-500">
                    ({pickResult.isThursday ? 'Active today' : 'Not Thursday'})
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-stone-800">
                    Cuisine cooldown:
                  </span>{' '}
                  Skip a dish if you ate the same cuisine today, yesterday, or 2
                  days ago.
                </li>
                <li>
                  <span className="font-semibold text-stone-800">
                    Supper Stretch $30 weekly cap:
                  </span>{' '}
                  Skip a Supper Stretch dish if its price + this week&apos;s
                  Supper Stretch spend ({formatHumanDate(pickResult.weekMondayStr)}{' '}
                  – {formatHumanDate(pickResult.weekSundayStr)}) is more than
                  $30.00.{' '}
                  <span className="font-mono-tabular font-semibold text-stone-900">
                    Spent this week: $
                    {pickResult.supperStretchSpentThisWeek.toFixed(2)}
                  </span>
                </li>
                <li>
                  <span className="font-semibold text-stone-800">
                    Tie-breakers:
                  </span>{' '}
                  Highest rating first → eaten longest ago (never eaten =
                  longest ago) → first by name, A to Z.
                </li>
              </ol>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-t border-stone-200 grid grid-cols-4 items-center"
      >
        <button
          type="button"
          onClick={() => setActiveTab('pick')}
          className={`min-h-[44px] h-full flex flex-col items-center justify-center transition-colors ${
            activeTab === 'pick'
              ? 'text-amber-800 font-bold'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span className="text-[11px] mt-0.5 whitespace-nowrap">Main</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dishes')}
          className={`min-h-[44px] h-full flex flex-col items-center justify-center transition-colors ${
            activeTab === 'dishes'
              ? 'text-amber-800 font-bold'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span className="text-[11px] mt-0.5 whitespace-nowrap">
            Dishes ({dishes.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('meals')}
          className={`min-h-[44px] h-full flex flex-col items-center justify-center transition-colors ${
            activeTab === 'meals'
              ? 'text-amber-800 font-bold'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span className="text-[11px] mt-0.5 whitespace-nowrap">
            Meals ({meals.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`min-h-[44px] h-full flex flex-col items-center justify-center transition-colors ${
            activeTab === 'settings'
              ? 'text-amber-800 font-bold'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span className="text-[11px] mt-0.5 whitespace-nowrap">Settings</span>
        </button>
      </nav>
    </div>
  );
}
