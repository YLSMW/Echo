use borsh::{BorshDeserialize, BorshSerialize};


#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum EchoInstruction {
    // Required
    Echo {
        data: Vec<u8>,
    },
     // Highly Recommended
    InitializeAuthorizedEcho {
        buffer_seed: u64,
        buffer_size: usize,
    },
    // Highly Recommended
    AuthorizedEcho {
        data: Vec<u8>,
    },
    // Optional
    InitializeVendingMachineEcho {
        // Number of tokens required change the buffer
        price: u64,
        buffer_size: usize,
    },
    // Optional
   VendingMachineEcho {
        data: Vec<u8>,
    }, 
}

