#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub struct GoalData {
    pub goal: i128,
    pub saved: i128,
}

const DATA_KEY: Symbol = symbol_short!("DATA");

#[contract]
pub struct SavingsTracker;

#[contractimpl]
impl SavingsTracker {
    // Set Goal Amount
    pub fn set_goal(env: Env, user: Address, goal_amount: i128) {
        user.require_auth();

        let mut data: GoalData = env
            .storage()
            .persistent()
            .get(&(DATA_KEY, user.clone()))
            .unwrap_or(GoalData { goal: 0, saved: 0 });

        data.goal = goal_amount;

        env.storage()
            .persistent()
            .set(&(DATA_KEY, user.clone()), &data);

        // Event for real-time tracking
        env.events()
            .publish((symbol_short!("goal"), user), goal_amount);
    }

    // Add Savings Amount
    pub fn add_savings(env: Env, user: Address, amount: i128) {
        user.require_auth();

        let mut data: GoalData = env
            .storage()
            .persistent()
            .get(&(DATA_KEY, user.clone()))
            .unwrap_or(GoalData { goal: 0, saved: 0 });

        data.saved += amount;

        env.storage()
            .persistent()
            .set(&(DATA_KEY, user.clone()), &data);

        // Event for real-time tracking
        env.events()
            .publish((symbol_short!("save"), user), amount);
    }

    // Fetch Goal
    pub fn get_goal(env: Env, user: Address) -> i128 {
        let data: GoalData = env
            .storage()
            .persistent()
            .get(&(DATA_KEY, user))
            .unwrap_or(GoalData { goal: 0, saved: 0 });

        data.goal
    }

    // Fetch Saved
    pub fn get_saved(env: Env, user: Address) -> i128 {
        let data: GoalData = env
            .storage()
            .persistent()
            .get(&(DATA_KEY, user))
            .unwrap_or(GoalData { goal: 0, saved: 0 });

        data.saved
    }
}
