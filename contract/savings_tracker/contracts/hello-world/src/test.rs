#![cfg(test)]

use super::*;
use soroban_sdk::{Env, testutils::Address as _};

#[test]
fn test_set_and_get_goal() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SavingsTracker, ());
    let client = SavingsTrackerClient::new(&env, &contract_id);
    let user = Address::generate(&env);

    client.set_goal(&user, &1000);
    assert_eq!(client.get_goal(&user), 1000);
}

#[test]
fn test_add_savings_and_get_saved() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SavingsTracker, ());
    let client = SavingsTrackerClient::new(&env, &contract_id);
    let user = Address::generate(&env);

    client.add_savings(&user, &500);
    assert_eq!(client.get_saved(&user), 500);
}

#[test]
fn test_cumulative_savings() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SavingsTracker, ());
    let client = SavingsTrackerClient::new(&env, &contract_id);
    let user = Address::generate(&env);

    client.add_savings(&user, &100);
    client.add_savings(&user, &200);
    client.add_savings(&user, &150);
    
    assert_eq!(client.get_saved(&user), 450);
}
