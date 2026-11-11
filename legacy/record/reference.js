/* eslint-disable */
/**
 * The calculation code of the Record web app (github.com/netherm3-coder/-record, commit ce527e9),
 * copied line for line. Tests compare the new domain code against it; nothing else may import it.
 *
 * Do not edit the copied blocks. Each one is marked with the file and the lines it comes from.
 * The four functions at the end are not copies: Record computes those things inside functions
 * that also draw the page or read the clock, so the calculation was lifted out and the rest
 * dropped. They are marked "adapted".
 *
 * Record keeps body weights in a global, newest first: [{ date: 'YYYY-MM-DD', weight: 80 }].
 * Here that global is the argument of the factory.
 */
module.exports = function createRecordReference(allWeights) {
  allWeights = allWeights || [];

  // ---- app.js 359-367: EX ----
  const EX = {
    PULLUPS: "Підтягування",
    PUSHUPS: "Відтискання",
    DIPS: "Бруси",
    RUN: "Біг",
    SPRINT: "Спринт",
    SHUTTLE: "Човниковий біг",
    CUSTOM: "custom",
  };

  // ---- app.js 674-679: parseValue ----
  function parseValue(valStr) {
    if (!valStr) return 0;
    const cleanStr = String(valStr).replace(/,/g, "."); // Рятуємо від ком
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  }

  // ---- app.js 692-694: isRunningExercise ----
  function isRunningExercise(exerciseName) {
    return /^(Біг|Спринт|Човниковий біг)(\s|$)/.test(exerciseName);
  }

  // ---- app.js 697-726: parseTimeFromCount ----
  function parseTimeFromCount(countStr) {
    let s = String(countStr).replace(/,/g, ".");

    // Новий shuttle формат: "0:24.50 (4×9м)" → хв:сс.мс
    let shuttleNew = s.match(/^(\d+):(\d+)\.(\d+)\s*\(/);
    if (shuttleNew) {
      let min = parseInt(shuttleNew[1]);
      let sec = parseInt(shuttleNew[2]);
      let ms = parseInt(shuttleNew[3].padEnd(2, "0").slice(0, 2));
      return min * 60 + sec + ms / 100;
    }

    // Старий shuttle: "24.5 с (10х10 м)"
    let oldShuttle = s.match(/^([\d.]+)\s*с\s*\(/);
    if (oldShuttle) return parseFloat(oldShuttle[1]);

    // mm:ss або h:mm:ss (де завгодно у рядку)
    let timeMatch = s.match(/(\d+):(\d+)(?::(\d+))?/);
    if (timeMatch) {
      if (timeMatch[3] !== undefined) {
        return parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
      }
      return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
    }

    // "12.5 с" або "12.5с"
    let secMatch = s.match(/([\d.]+)\s*с/);
    if (secMatch) return parseFloat(secMatch[1]);
    return 0;
  }

  // ---- app.js 738-741: parseDistFromCount ----
  function parseDistFromCount(countStr) {
    let match = String(countStr).match(/([\d.]+)\s*км/);
    return match ? parseFloat(match[1]) : 0;
  }

  // ---- app.js 798-815: migrateWorkout ----
  function migrateWorkout(w) {
    let m = { ...w };
    let countStr = String(w.count || "");

    if (w.exercise === EX.RUN) {
      let match = countStr.match(/([\d.]+)\s*км/);
      if (match) m.exercise = `Біг ${match[1]} км`;
    } else if (w.exercise === EX.SPRINT) {
      let match = countStr.match(/([\d.]+)\s*м/);
      if (match) m.exercise = `Спринт ${match[1]} м`;
    } else if (w.exercise === EX.SHUTTLE) {
      // Витягує "10х10" або "4х9" з "10х10 м (24.5 с)" або "24.5 с (10х10 м)"
      let match = countStr.match(/([\dхxХX]+[хxХX][\dхxХX]+)/i);
      if (match) m.exercise = `Човниковий біг ${match[1]}`;
    }

    return m;
  }

  // ---- app.js 817-827: getWeightAtDate ----
  function getWeightAtDate(targetDate) {
    if (typeof allWeights === "undefined" || allWeights.length === 0) return 75;
    if (!targetDate) return allWeights[0].weight;

    // Шукаємо найсвіжіше зважування, яке було ДО або В ДЕНЬ тренування
    let weightRecord = allWeights.find((w) => w.date <= targetDate);

    if (weightRecord) return weightRecord.weight;
    // Якщо тренування старіше за найперше зважування, беремо найстарішу відому вагу
    return allWeights[allWeights.length - 1].weight;
  }

  // ---- app.js 829-848: getStatUpdateData ----
  function getStatUpdateData(exercise, finalResultStr) {
    let baseEx = [EX.PULLUPS, EX.PUSHUPS, EX.DIPS];
    if (baseEx.includes(exercise)) {
      return { key: exercise, val: parseValue(finalResultStr) };
    }
    // Бігові: "Біг 5 км" → ключ "Біг", значення = дистанція в км
    if (exercise.startsWith("Біг ")) {
      return { key: EX.RUN, val: parseDistFromCount(finalResultStr) };
    }
    // Старий формат без дистанції в назві
    if (exercise === EX.RUN) {
      return { key: EX.RUN, val: parseDistFromCount(finalResultStr) };
    }
    // Спринт/Човниковий — не рахуються в Залі Слави
    if (exercise === EX.SPRINT || exercise === EX.SHUTTLE ||
        exercise.startsWith("Спринт ") || exercise.startsWith("Човниковий біг ")) {
      return { key: EX.SPRINT, val: 0 };
    }
    return { key: "otherSets", val: 1 };
  }

  // ---- app.js 850-911: calculateIndex ----
  function calculateIndex(valStr, dateStr, exerciseName) {
    if (!valStr) return 0;
    const cleanStr = String(valStr).replace(/,/g, ".");

    // Якщо передано назву бігової дисципліни — індекс = 1/час (менше часу = вищий індекс)
    if ((exerciseName && isRunningExercise(exerciseName)) || _looksLikeTime(cleanStr)) {
      let timeSec = parseTimeFromCount(cleanStr);
      return timeSec > 0 ? (1 / timeSec) * 10000 : 0;
    }

    // Автодетект для старих записів без exerciseName:
    // Спринт (старий): "100 м (12.5 с)"
    let sprintMatch = cleanStr.match(/([\d.]+)\s*м\s*\(\s*([\d.]+)\s*с?\s*\)/i);
    if (sprintMatch) {
      let timeSec = parseFloat(sprintMatch[2]);
      return timeSec > 0 ? (1 / timeSec) * 10000 : 0;
    }

    // Човниковий (старий): "10х10 м (24.5 с)"
    let shuttleMatch = cleanStr.match(
      /([\dхxХX\s.]+)\s*м\s*\(\s*([\d.]+)\s*с?\s*\)/i,
    );
    if (shuttleMatch) {
      let timeSec = parseFloat(shuttleMatch[2]);
      return timeSec > 0 ? (1 / timeSec) * 10000 : 0;
    }

    // Біг (старий): "5 км (25:00)"
    let runMatch = cleanStr.match(
      /([\d.]+)\s*к?м?\s*\(\s*(?:(\d+):)?(\d+):(\d+)\s*\)/i,
    );
    if (runMatch) {
      let hours = runMatch[2] ? parseInt(runMatch[2]) : 0;
      let min = parseInt(runMatch[3]);
      let sec = parseInt(runMatch[4]);
      let totalSec = hours * 3600 + min * 60 + sec;
      return totalSec > 0 ? (1 / totalSec) * 10000 : 0;
    }

    // Новий формат бігу: "25:00 (5 км)" або "12.5 с (100 м)"
    let newRunMatch = cleanStr.match(/^(\d+):(\d+)(?::(\d+))?\s*\(/);
    if (newRunMatch) {
      let totalSec = newRunMatch[3] !== undefined
        ? parseInt(newRunMatch[1]) * 3600 + parseInt(newRunMatch[2]) * 60 + parseInt(newRunMatch[3])
        : parseInt(newRunMatch[1]) * 60 + parseInt(newRunMatch[2]);
      return totalSec > 0 ? (1 / totalSec) * 10000 : 0;
    }
    let newSprintMatch = cleanStr.match(/^([\d.]+)\s*с\s*\(/);
    if (newSprintMatch) {
      let timeSec = parseFloat(newSprintMatch[1]);
      return timeSec > 0 ? (1 / timeSec) * 10000 : 0;
    }

    // Силові вправи: формула Еплі (без змін)
    let reps = parseFloat(cleanStr) || 0;
    let weightMatch = cleanStr.match(/\(\s*\+?\s*([\d.]+)\s*к?г?\s*\)/i);
    let addedWeight = weightMatch ? parseFloat(weightMatch[1]) : 0;

    let bodyWeight = getWeightAtDate(dateStr);
    let totalWeight = bodyWeight + addedWeight;
    return reps <= 1 ? totalWeight : totalWeight * (1 + reps / 30);
  }

  // ---- app.js 916-920: RM_REPS_CAP, rmFactor ----
  const RM_REPS_CAP = 10;
  function rmFactor(reps) {
    const r = Math.min(reps, RM_REPS_CAP);
    return r <= 1 ? 1 : 1 + r / 30;
  }

  // ---- app.js 923-940: calculate1RM ----
  function calculate1RM(valStr, dateStr) {
    if (!valStr) return 0;
    const cleanStr = String(valStr).replace(/,/g, ".");

    let reps = parseFloat(cleanStr) || 0;
    if (reps <= 0) return 0;

    let weightMatch = cleanStr.match(/\(\s*\+?\s*([\d.]+)\s*к?г?\s*\)/i);
    let addedW = weightMatch ? parseFloat(weightMatch[1]) : 0;

    let bodyWeight = getWeightAtDate(dateStr);
    let totalWeight = bodyWeight + addedW;

    let oneRmTotal = totalWeight * rmFactor(reps);
    let predictedAddedW = oneRmTotal - bodyWeight;

    return predictedAddedW > 0 ? Math.round(predictedAddedW * 10) / 10 : 0;
  }

  // ---- app.js 1081-1081: STRENGTH_1RM_EX ----
  const STRENGTH_1RM_EX = [EX.PULLUPS, EX.PUSHUPS, EX.DIPS];

  // ---- app.js 1321-1328: STATUS_DAYS, STATUS_LEVELS ----
  const STATUS_DAYS = 90;
  const STATUS_LEVELS = [
    { name: "Рекрут", from: 1.0, to: 1.2, color: "var(--text-muted)" },
    { name: "Атлет", from: 1.2, to: 1.5, color: "var(--success)" },
    { name: "КМС", from: 1.5, to: 1.8, color: "var(--highlight)" },
    { name: "Еліта", from: 1.8, to: Infinity, color: "var(--danger)" },
  ];
  let _statusWorkouts = null; // усі записи за 90 днів (null — ще не завантажено)

  // ---- app.js 1331-1335: _statusSince ----
  function _statusSince() {
    const d = new Date();
    d.setDate(d.getDate() - STATUS_DAYS);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  // ---- app.js 2328-2332: _parenTime ----
  function _parenTime(str) {
    const m = String(str || "").match(/^\s*[\d.]+\s*\(\s*(\d+):(\d+(?:\.\d+)?)\s*\)\s*$/);
    if (!m) return 0;
    return parseInt(m[1]) * 60 + parseFloat(m[2]);
  }

  // ---- app.js 2335-2337: _hasDualMetric ----
  function _hasDualMetric(countStr) {
    return _parenTime(countStr) > 0;
  }

  // ---- app.js 2354-2356: _looksLikeTime ----
  function _looksLikeTime(str) {
    return /^\s*\d{1,2}:\d{2}(:\d{2})?\s*$/.test(String(str || ""));
  }

  // ---- app.js 2761-2779: _pedestalEntryFrom ----
  function _pedestalEntryFrom(list, exerciseName) {
    const isRunning = isRunningExercise(exerciseName);
    let best = null;
    let maxReps = 0;
    list.forEach((w) => {
      const idx = calculateIndex(w.count, w.date, w.exercise);
      const val = isRunning ? parseTimeFromCount(w.count) : parseValue(w.count);
      if (!isRunning && val > maxReps) maxReps = val;
      if (!best || idx > best.index) best = { w, index: idx, val };
    });
    if (!best) return null;
    return {
      count: best.w.count,
      date: best.w.date,
      index: best.index,
      absoluteMaxReps: isRunning ? best.val : maxReps,
      max1RM: isRunning ? 0 : calculate1RM(best.w.count, best.w.date),
    };
  }

  // ---- achievements.js 285-292: totalKm ----
  function totalKm(workouts) {
    let sum = 0;
    (workouts || []).forEach((w) => {
      const m = String(w.exercise || "").match(/([\d.]+)\s*км/i);
      if (m) sum += parseFloat(m[1]) || 0;
    });
    return sum;
  }

  // ---- achievements.js 295-307: bestSecFor ----
  function bestSecFor(workouts, exName) {
    let best = Infinity;
    (workouts || []).forEach((w) => {
      if (w.exercise !== exName) return;
      const m = String(w.count || "").match(/(\d+):(\d+)(?::(\d+))?/);
      if (!m) return;
      const sec = m[3] !== undefined
        ? +m[1] * 3600 + +m[2] * 60 + +m[3]
        : +m[1] * 60 + +m[2];
      if (sec > 0 && sec < best) best = sec;
    });
    return best;
  }

  // ---- achievements.js 318-328: customExCount ----
  function customExCount(workouts) {
    const base = ["Підтягування", "Відтискання", "Бруси", "Біг", "Спринт", "Човниковий біг"];
    const set = new Set();
    (workouts || []).forEach((w) => {
      const ex = w.exercise;
      if (!ex) return;
      if (base.some((b) => ex === b || ex.startsWith(b + " "))) return;
      set.add(ex);
    });
    return set.size;
  }

  // ---- achievements.js 392-401: maxWeightFor ----
  function maxWeightFor(workouts, exName) {
    const needle = String(exName).toLowerCase();
    let max = 0;
    (workouts || []).forEach((w) => {
      if (!w.exercise || !String(w.exercise).toLowerCase().includes(needle)) return;
      const m = String(w.count).match(/\(\s*\+?\s*([\d.]+)\s*кг\s*\)/i);
      if (m) { const v = parseFloat(m[1]); if (v > max) max = v; }
    });
    return max;
  }

  // ---- achievements.js 420-433: calculateStreak ----
  function calculateStreak(workouts) {
    if (workouts.length === 0) return 0;
    const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
    if (dates.length === 0) return 0;
    let streak = 1;
    let prev = new Date(dates[0]);
    for (let i = 1; i < dates.length; i++) {
      const cur = new Date(dates[i]);
      const diff = Math.round((prev - cur) / 86400000);
      if (diff === 1) { streak++; prev = cur; }
      else break;
    }
    return streak;
  }

  // ---- achievements.js 435-443: maxRecordsInMonth ----
  function maxRecordsInMonth(workouts) {
    const buckets = {};
    workouts.forEach(w => {
      if (!w.date) return;
      const m = w.date.substring(0, 7);
      buckets[m] = (buckets[m] || 0) + 1;
    });
    return Math.max(0, ...Object.values(buckets));
  }

  // ---- achievements.js 445-452: spanInMonths ----
  function spanInMonths(workouts) {
    if (workouts.length === 0) return 0;
    const dates = workouts.map(w => new Date(w.date)).filter(d => !isNaN(d));
    if (dates.length === 0) return 0;
    const min = Math.min(...dates.map(d => d.getTime()));
    const max = Math.max(...dates.map(d => d.getTime()));
    return (max - min) / (30 * 86400000);
  }

  // ---- achievements.js 454-462: hasComeback ----
  function hasComeback(workouts) {
    if (workouts.length < 2) return false;
    const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i].date) - new Date(sorted[i-1].date)) / 86400000;
      if (diff >= 30) return true;
    }
    return false;
  }

  // ---- achievements.js 464-480: hasImprovement ----
  function hasImprovement(workouts) {
    const byEx = {};
    workouts.forEach(w => {
      if (!byEx[w.exercise]) byEx[w.exercise] = [];
      byEx[w.exercise].push(w);
    });
    for (const ex in byEx) {
      const sorted = [...byEx[ex]].sort((a, b) => new Date(a.date) - new Date(b.date));
      let best = 0;
      for (const w of sorted) {
        const v = parseInt(w.count) || 0;
        if (best > 0 && v > best) return true;
        if (v > best) best = v;
      }
    }
    return false;
  }

  // ---- achievements.js 482-500: maxImprovements ----
  function maxImprovements(workouts) {
    const byEx = {};
    workouts.forEach(w => {
      if (!byEx[w.exercise]) byEx[w.exercise] = [];
      byEx[w.exercise].push(w);
    });
    let max = 0;
    for (const ex in byEx) {
      const sorted = [...byEx[ex]].sort((a, b) => new Date(a.date) - new Date(b.date));
      let best = 0, count = 0;
      for (const w of sorted) {
        const v = parseInt(w.count) || 0;
        if (best > 0 && v > best) count++;
        if (v > best) best = v;
      }
      if (count > max) max = count;
    }
    return max;
  }

  // ---- achievements.js 502-506: maxRecordsPerExercise ----
  function maxRecordsPerExercise(workouts) {
    const buckets = {};
    workouts.forEach(w => { buckets[w.exercise] = (buckets[w.exercise] || 0) + 1; });
    return Math.max(0, ...Object.values(buckets));
  }

  // ---- adapted from app.js 1677-1687 (renderUI): which workouts were personal bests ----
  // `allWorkouts` is newest first, as Record keeps it.
  function personalBestIds(allWorkouts) {
    const pbSet = new Set();
    const maxAtTime = {};
    const reversedAll = [...allWorkouts].reverse();
    reversedAll.forEach((w) => {
      let wIndex = calculateIndex(w.count, w.date, w.exercise);
      if (!maxAtTime[w.exercise] || wIndex > maxAtTime[w.exercise]) {
        maxAtTime[w.exercise] = wIndex;
        pbSet.add(w.id);
      }
    });
    return pbSet;
  }

  // ---- adapted from app.js 1360-1445 (renderSportStatus): the rank and the numbers it shows ----
  // Returns null where Record shows the "add your weight" or "no pull-ups" hint instead.
  function sportStatus(source) {
    const hasWeight = typeof allWeights !== "undefined" && allWeights.length > 0;
    const since = _statusSince();
    const sets = source.filter(
      (w) => w.exercise === EX.PULLUPS && w.date >= since && parseValue(w.count) > 0,
    );
    if (!hasWeight || sets.length === 0) return null;

    let best = null;
    sets.forEach((w) => {
      const str = String(w.count).replace(/,/g, ".");
      const reps = parseValue(str);
      const m = str.match(/\(\s*\+?\s*([\d.]+)\s*к?г?\s*\)/i);
      const added = m ? parseFloat(m[1]) || 0 : 0;
      const bw = getWeightAtDate(w.date);
      if (!(bw > 0)) return;
      const rel = ((bw + added) * rmFactor(reps)) / bw;
      if (!best || rel > best.rel) best = { rel, reps, added, date: w.date };
    });
    if (!best) return null;

    const coef = Math.round(best.rel * 100) / 100;
    let li = STATUS_LEVELS.findIndex((l) => coef < l.to);
    if (li < 0) li = STATUS_LEVELS.length - 1;
    const lvl = STATUS_LEVELS[li];
    const next = STATUS_LEVELS[li + 1];
    let percent = next ? ((coef - lvl.from) / (lvl.to - lvl.from)) * 100 : 100;
    percent = Math.max(0, Math.min(100, percent));

    const bwNow = allWeights[0].weight;
    const kg = next ? Math.max(1, Math.ceil((next.from - coef) * bwNow)) : null;

    return { level: lvl.name, coef, percent, nextLevel: next ? next.name : null, kg, best };
  }

  // ---- adapted from app.js 1208-1223 (renderPedestal): progress toward a goal, in percent ----
  function goalPercent(exercise, pedestalEntry, goal) {
    const goalNum = parseFloat(goal);
    let percent;
    if (isRunningExercise(exercise)) {
      const actualTime = parseTimeFromCount(pedestalEntry.count);
      percent = actualTime > 0 ? Math.round((goalNum / actualTime) * 100) : 0;
    } else {
      percent = goalNum > 0 ? Math.round(((parseFloat(pedestalEntry.absoluteMaxReps) || 0) / goalNum) * 100) : 0;
    }
    return Math.max(0, Math.min(100, percent));
  }

  // ---- adapted from app.js 2963-2978 (calculateSobriety > getDiff): time since a date ----
  // In Record `today` is the current date cut to midnight; here it is passed in.
  function elapsedSince(startDate, today) {
    const diffTime = today.getTime() - startDate.getTime();
    const totalDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let years = today.getFullYear() - startDate.getFullYear();
    let months = today.getMonth() - startDate.getMonth();
    let days = today.getDate() - startDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    return { years, months, days, total: totalDays };
  }

  return {
    EX,
    STRENGTH_1RM_EX,
    STATUS_DAYS,
    STATUS_LEVELS,
    parseValue,
    isRunningExercise,
    parseTimeFromCount,
    parseDistFromCount,
    migrateWorkout,
    getWeightAtDate,
    getStatUpdateData,
    calculateIndex,
    rmFactor,
    calculate1RM,
    _parenTime,
    _hasDualMetric,
    _looksLikeTime,
    _pedestalEntryFrom,
    totalKm,
    bestSecFor,
    customExCount,
    maxWeightFor,
    calculateStreak,
    maxRecordsInMonth,
    spanInMonths,
    hasComeback,
    hasImprovement,
    maxImprovements,
    maxRecordsPerExercise,
    personalBestIds,
    sportStatus,
    goalPercent,
    elapsedSince,
  };
};
