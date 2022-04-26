
use borsh::{BorshDeserialize, BorshSerialize};
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Echo {
    pub data: [u8; 140],
}
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct AuthorizedEcho {
    pub buffer_seed: u64,
    pub buffer_size: usize,
}


