import confetti from 'canvas-confetti';

export function fireConfetti(type = 'goal') {
    const configs = {
        goal: {
            particleCount: 200,
            spread: 120,
            startVelocity: 50,
            colors: ['#7c3aed', '#f59e0b', '#10b981', '#ffffff', '#c4b5fd'],
            origin: { y: 0.55 },
        },
        badge: {
            particleCount: 120,
            spread: 90,
            startVelocity: 40,
            colors: ['#f59e0b', '#fbbf24', '#ffffff', '#7c3aed'],
            origin: { y: 0.6 },
        },
        streak: {
            particleCount: 80,
            spread: 70,
            colors: ['#ff6b35', '#ff8c42', '#fcbf49', '#ffffff'],
            origin: { y: 0.65 },
        },
    };

    const cfg = configs[type] || configs.goal;
    confetti({ ...cfg, ticks: 300, gravity: 0.9 });

    // Second burst for goal
    if (type === 'goal') {
        setTimeout(() => {
            confetti({
                particleCount: 100,
                spread: 80,
                startVelocity: 35,
                colors: cfg.colors,
                origin: { x: 0.2, y: 0.6 },
                ticks: 200,
            });
            confetti({
                particleCount: 100,
                spread: 80,
                startVelocity: 35,
                colors: cfg.colors,
                origin: { x: 0.8, y: 0.6 },
                ticks: 200,
            });
        }, 300);
    }
}
