import { Dish, Meal, PickResult, SkippedDish } from './types';

const MS_PER_DAY = 86_400_000;

export function parseDateUtcMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

export function formatUtcMsToDateStr(utcMs: number): string {
  const dt = new Date(utcMs);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatHumanDate(dateStr: string, includeYear = false): string {
  const utcMs = parseDateUtcMs(dateStr);
  const dt = new Date(utcMs);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const dayName = days[dt.getUTCDay()];
  const dayNum = dt.getUTCDate();
  const monthName = months[dt.getUTCMonth()];
  const year = dt.getUTCFullYear();
  return includeYear
    ? `${dayName} ${dayNum} ${monthName} ${year}`
    : `${dayName} ${dayNum} ${monthName}`;
}

export function getWeekBounds(todayStr: string): {
  mondayUtc: number;
  sundayUtc: number;
  mondayStr: string;
  sundayStr: string;
} {
  const todayUtc = parseDateUtcMs(todayStr);
  const dayOfWeek = new Date(todayUtc).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const mondayUtc = todayUtc - daysSinceMonday * MS_PER_DAY;
  const sundayUtc = mondayUtc + 6 * MS_PER_DAY;
  return {
    mondayUtc,
    sundayUtc,
    mondayStr: formatUtcMsToDateStr(mondayUtc),
    sundayStr: formatUtcMsToDateStr(sundayUtc),
  };
}

export function getLastEatenDate(
  dishId: string,
  meals: Meal[],
  todayStr: string
): string | null {
  let latest: string | null = null;
  for (const meal of meals) {
    if (meal.dishId === dishId && meal.date <= todayStr) {
      if (latest === null || meal.date > latest) {
        latest = meal.date;
      }
    }
  }
  return latest;
}

export function filterDishesByRules(
  dishes: Dish[],
  meals: Meal[],
  todayStr: string
): {
  eligibleDishes: Dish[];
  skippedDishes: SkippedDish[];
  supperStretchSpentThisWeek: number;
  weekMondayStr: string;
  weekSundayStr: string;
  isThursday: boolean;
} {
  const todayUtc = parseDateUtcMs(todayStr);
  const dayOfWeek = new Date(todayUtc).getUTCDay();
  const isThursday = dayOfWeek === 4;

  const { mondayUtc, sundayUtc, mondayStr, sundayStr } = getWeekBounds(todayStr);

  const dishMap = new Map<string, Dish>();
  for (const d of dishes) {
    dishMap.set(d.id, d);
  }

  let supperStretchSpentCents = 0;
  for (const meal of meals) {
    const mealDish = dishMap.get(meal.dishId);
    if (!mealDish || mealDish.area !== 'Supper Stretch') continue;
    const mealUtc = parseDateUtcMs(meal.date);
    if (mealUtc >= mondayUtc && mealUtc <= sundayUtc) {
      supperStretchSpentCents += Math.round(meal.amountPaid * 100);
    }
  }
  const supperStretchSpentThisWeek = supperStretchSpentCents / 100;

  const eligibleDishes: Dish[] = [];
  const skippedDishes: SkippedDish[] = [];

  for (const dish of dishes) {
    // RULE 1: On Thursdays, skip any dish that isn't vegetarian.
    if (isThursday && !dish.vegetarian) {
      skippedDishes.push({
        dish,
        ruleNumber: 1,
        ruleLabel: 'Rule 1 · Thursday vegetarian rule',
        reason: 'Not vegetarian, and today is Thursday',
      });
      continue;
    }

    // RULE 2: Skip a dish if I ate the same cuisine today, yesterday or the day before.
    let recentCuisineMeal: { meal: Meal; mealDish: Dish; diffDays: number } | null =
      null;

    for (const meal of meals) {
      const mealDish = dishMap.get(meal.dishId);
      if (!mealDish || mealDish.cuisine !== dish.cuisine) continue;

      const mealUtc = parseDateUtcMs(meal.date);
      const diffDays = Math.round((todayUtc - mealUtc) / MS_PER_DAY);

      if (diffDays >= 0 && diffDays <= 2) {
        if (
          recentCuisineMeal === null ||
          diffDays < recentCuisineMeal.diffDays
        ) {
          recentCuisineMeal = { meal, mealDish, diffDays };
        }
      }
    }

    if (recentCuisineMeal !== null) {
      const { meal, mealDish, diffDays } = recentCuisineMeal;
      const whenWords =
        diffDays === 0
          ? 'today'
          : diffDays === 1
          ? 'yesterday'
          : '2 days ago';
      skippedDishes.push({
        dish,
        ruleNumber: 2,
        ruleLabel: 'Rule 2 · Same cuisine recently',
        reason: `Ate ${dish.cuisine} ${whenWords} (${mealDish.name} on ${formatHumanDate(
          meal.date
        )})`,
      });
      continue;
    }

    // RULE 3: Skip a Supper Stretch dish if its price plus what I've paid at Supper Stretch this week is > $30.
    if (dish.area === 'Supper Stretch') {
      const dishPriceCents = Math.round(dish.price * 100);
      const totalCents = supperStretchSpentCents + dishPriceCents;
      if (totalCents > 3000) {
        const totalDollars = (totalCents / 100).toFixed(2);
        skippedDishes.push({
          dish,
          ruleNumber: 3,
          ruleLabel: 'Rule 3 · Supper Stretch $30 weekly cap',
          reason: `$${supperStretchSpentThisWeek.toFixed(
            2
          )} paid at Supper Stretch this week + $${dish.price.toFixed(
            2
          )} = $${totalDollars} (more than $30.00)`,
        });
        continue;
      }
    }

    eligibleDishes.push(dish);
  }

  return {
    eligibleDishes,
    skippedDishes,
    supperStretchSpentThisWeek,
    weekMondayStr: mondayStr,
    weekSundayStr: sundayStr,
    isThursday,
  };
}

export function evaluateMealRules(
  dishes: Dish[],
  meals: Meal[],
  todayStr: string
): PickResult {
  const {
    eligibleDishes,
    skippedDishes,
    supperStretchSpentThisWeek,
    weekMondayStr,
    weekSundayStr,
    isThursday,
  } = filterDishesByRules(dishes, meals, todayStr);

  if (eligibleDishes.length === 0) {
    return {
      pickedDish: null,
      whyPicked: 'Nothing fits your rules today',
      eligibleDishes: [],
      skippedDishes,
      supperStretchSpentThisWeek,
      weekMondayStr,
      weekSundayStr,
      isThursday,
    };
  }

  // Rule 4: Highest rating first → eaten longest ago → first by name A to Z
  const sorted = [...eligibleDishes].sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }

    const lastA = getLastEatenDate(a.id, meals, todayStr);
    const lastB = getLastEatenDate(b.id, meals, todayStr);
    if (lastA === null && lastB !== null) return -1;
    if (lastA !== null && lastB === null) return 1;
    if (lastA !== null && lastB !== null && lastA !== lastB) {
      return lastA.localeCompare(lastB);
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  const winner = sorted[0];
  const winnerLastEaten = getLastEatenDate(winner.id, meals, todayStr);

  const sameRatingDishes = sorted.filter((d) => d.rating === winner.rating);
  const sameRatingAndRecencyDishes = sameRatingDishes.filter(
    (d) => getLastEatenDate(d.id, meals, todayStr) === winnerLastEaten
  );

  const extraNotes: string[] = [];
  if (isThursday) {
    extraNotes.push('vegetarian for Thursday');
  }
  if (winner.area === 'Supper Stretch' && supperStretchSpentThisWeek > 0) {
    const newTotal = (supperStretchSpentThisWeek + winner.price).toFixed(2);
    extraNotes.push(
      `$${supperStretchSpentThisWeek.toFixed(2)} + $${winner.price.toFixed(
        2
      )} = $${newTotal}, not more than $30 at Supper Stretch`
    );
  }

  let baseReason = '';
  if (sorted.length === 1) {
    baseReason = `Only dish left that fits your rules today (${winner.rating}★)`;
  } else if (sameRatingDishes.length === 1) {
    baseReason = isThursday
      ? `Best vegetarian dish (${winner.rating}★, highest rating left)`
      : `Highest rated dish left (${winner.rating}★)`;
  } else if (sameRatingAndRecencyDishes.length === 1) {
    const runnerUp = sameRatingDishes[1];
    const runnerUpDate = getLastEatenDate(runnerUp.id, meals, todayStr);
    if (winnerLastEaten === null) {
      baseReason = `Tied at ${winner.rating}★, picked because you have never eaten it (${
        runnerUp.name
      } was eaten on ${ runnerUpDate ? formatHumanDate(runnerUpDate) : 'earlier' })`;
    } else {
      baseReason = `Tied at ${winner.rating}★, picked because you ate it longest ago (${formatHumanDate(
        winnerLastEaten
      )})`;
    }
  } else {
    const recencyText =
      winnerLastEaten === null
        ? 'never eaten'
        : `last eaten ${formatHumanDate(winnerLastEaten)}`;
    const otherNames = sameRatingAndRecencyDishes
      .slice(1)
      .map((d) => d.name)
      .join(', ');
    baseReason = `Tied at ${winner.rating}★ (${recencyText}), picked first by name A–Z ahead of ${otherNames}`;
  }

  const whyPicked =
    extraNotes.length > 0 && !baseReason.includes('Thursday')
      ? `${baseReason} — ${extraNotes.join('; ')}.`
      : `${baseReason}${
          extraNotes.filter((n) => !n.includes('Thursday')).length > 0
            ? ` — ${extraNotes.filter((n) => !n.includes('Thursday')).join('; ')}.`
            : '.'
        }`;

  return {
    pickedDish: winner,
    whyPicked,
    eligibleDishes: sorted,
    skippedDishes,
    supperStretchSpentThisWeek,
    weekMondayStr,
    weekSundayStr,
    isThursday,
  };
}
