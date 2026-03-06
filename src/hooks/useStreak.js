/**
 * useStreak — daily savings streak tracker (localStorage, keyed by wallet)
 * A "day" boundary is midnight local time.
 */

const KEY = (wallet) => `streak_${wallet}`;

export function getStreakData(wallet) {
    if (!wallet) return { streak: 0, lastSaved: null, longestStreak: 0 };
    try {
        const raw = localStorage.getItem(KEY(wallet));
        return raw ? JSON.parse(raw) : { streak: 0, lastSaved: null, longestStreak: 0 };
    } catch {
        return { streak: 0, lastSaved: null, longestStreak: 0 };
    }
}

export function recordSavingToday(wallet) {
    if (!wallet) return null;
    const now = new Date();
    const todayStr = now.toDateString();
    const data = getStreakData(wallet);

    // Already saved today — no change
    if (data.lastSaved === todayStr) return data;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    let newStreak;
    if (!data.lastSaved || data.lastSaved === yesterdayStr) {
        // Consecutive day
        newStreak = data.streak + 1;
    } else {
        // Missed one or more days — reset
        newStreak = 1;
    }

    const updated = {
        streak: newStreak,
        lastSaved: todayStr,
        longestStreak: Math.max(newStreak, data.longestStreak || 0),
    };

    localStorage.setItem(KEY(wallet), JSON.stringify(updated));
    return updated;
}

export function checkStreakAlive(wallet) {
    /** Returns false if the streak is broken (last save wasn't yesterday or today) */
    if (!wallet) return false;
    const data = getStreakData(wallet);
    if (!data.lastSaved) return false;
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    return data.lastSaved === today || data.lastSaved === yesterdayStr;
}
