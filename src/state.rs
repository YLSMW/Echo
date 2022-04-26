
use borsh::{BorshDeserialize, BorshSerialize};
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct Echo {
    pub data: [u8; 140],
}


