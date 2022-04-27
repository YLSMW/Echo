
use borsh::{BorshDeserialize, BorshSerialize};
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Echo {
    pub data: [u8; 140],
}
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AuthorizedEcho {
    pub bump_seed: u8,
    pub buffer_seed: u64,
    pub data: Vec<u8>,
}


