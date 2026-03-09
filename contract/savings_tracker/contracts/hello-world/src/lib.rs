#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, IntoVal,
};

#[contracttype]
#[derive(Clone)]
pub struct GoalData {
    pub goal: i128,
    pub saved: i128,
}

const DATA_KEY: Symbol = symbol_short!("DATA");
const TOKEN_KEY: Symbol = symbol_short!("TOKEN");

#[contract]
pub struct SavingsTracker;

#[contractimpl]
impl SavingsTracker {
    // Initialize with Reward Token Address
    pub fn initialize(env: Env, token_addr: Address) {
        if env.storage().instance().has(&TOKEN_KEY) {
            panic!("already initialized");
        }
        env.storage().instance().set(&TOKEN_KEY, &token_addr);
    }
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
            .publish((symbol_short!("save"), user.clone()), amount);
            
        // Inter-contract call to mint reward tokens (10% of savings added)
        if let Some(token_addr) = env.storage().instance().get::<_, Address>(&TOKEN_KEY) {
            let reward_amount = amount / 10;
            if reward_amount > 0 {
                // Call `mint(to, amount)` on the token contract
                env.invoke_contract::<()>(
                    &token_addr,
                    &symbol_short!("mint"),
                    soroban_sdk::vec![&env, user.into_val(&env), reward_amount.into_val(&env)],
                );
            }
        }
    }

    // Extract Savings Amount
    pub fn extract_savings(env: Env, user: Address, amount: i128) {
        user.require_auth();

        let mut data: GoalData = env
            .storage()
            .persistent()
            .get(&(DATA_KEY, user.clone()))
            .unwrap_or(GoalData { goal: 0, saved: 0 });

        if data.saved < amount {
            panic!("insufficient savings");
        }

        data.saved -= amount;

        env.storage()
            .persistent()
            .set(&(DATA_KEY, user.clone()), &data);

        // Event for real-time tracking
        env.events()
            .publish((symbol_short!("extract"), user.clone()), amount);
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

mod test;
