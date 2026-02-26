/**
 * useBadges — NFT-style badge system (localStorage, keyed by wallet)
 */

export const BADGE_TYPES = {
    WEEK_STREAK: { id: 'WEEK_STREAK', icon: '🔥', title: '7-Day Streak', desc: 'Save every day for 7 days', color: '#ff6b35' },
    MONTH_STREAK: { id: 'MONTH_STREAK', icon: '💎', title: '30-Day Streak', desc: 'Save every day for 30 days', color: '#7c3aed' },
    GOAL_COMPLETE: { id: 'GOAL_COMPLETE', icon: '🏆', title: 'Goal Achieved', desc: 'Complete any savings goal', color: '#f59e0b' },
    COMMUNITY_JOIN: { id: 'COMMUNITY_JOIN', icon: '🌐', title: 'Community Member', desc: 'Join the savings community', color: '#0ea5e9' },
    FIRST_SAVE: { id: 'FIRST_SAVE', icon: '⭐', title: 'First Save', desc: 'Record your first on-chain save', color: '#10b981' },
};

const KEY = (wallet) => `badges_${wallet}`;

export function getBadges(wallet) {
    if (!wallet) return [];
    try {
        const raw = localStorage.getItem(KEY(wallet));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function hasBadge(wallet, badgeId) {
    return getBadges(wallet).some(b => b.id === badgeId);
}

export function awardBadge(wallet, badgeId) {
    if (!wallet || hasBadge(wallet, badgeId)) return false;
    const badges = getBadges(wallet);
    const newBadge = {
        ...BADGE_TYPES[badgeId],
        awardedAt: new Date().toISOString(),
    };
    badges.push(newBadge);
    localStorage.setItem(KEY(wallet), JSON.stringify(badges));
    return newBadge; // returns the new badge if freshly awarded
}

export function checkAndAwardStreakBadges(wallet, streak) {
    const awarded = [];
    if (streak >= 7 && !hasBadge(wallet, 'WEEK_STREAK')) {
        const b = awardBadge(wallet, 'WEEK_STREAK');
        if (b) awarded.push(b);
    }
    if (streak >= 30 && !hasBadge(wallet, 'MONTH_STREAK')) {
        const b = awardBadge(wallet, 'MONTH_STREAK');
        if (b) awarded.push(b);
    }
    return awarded;
}
