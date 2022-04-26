use solana_program::{
    account_info::{AccountInfo,next_account_info},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    msg,
    pubkey::Pubkey,
};
use borsh::{BorshDeserialize, BorshSerialize};

use crate::{
    instruction::EchoInstruction, 
    error::EchoError,
    state::Echo,
};



pub struct Processor;

impl Processor {
    pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
        // let data_0 = [0, 6, 0, 0, 0, 21, 22, 23, 24, 25, 26];
        // assert_eq!(data_0,data);
        let instruction = EchoInstruction::try_from_slice(&data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;     
 
        match instruction {
            EchoInstruction::Echo { data } => {
                msg!("Instruction: Echo");
                Self::process_echo_instruction(program_id, accounts, data)
            },
/*             EchoInstruction::InitializeAuthorizedEcho {
                buffer_seed,
                buffer_size, 
            } => {
                msg!("Instruction: InitializeAuthorizedEcho");
                Self::initialize_authorized_echo(accounts, program_id)
            },
            EchoInstruction::AuthorizedEcho{ data } => {
                msg!("Instruction: AuthorizedEcho");
                Self::authorized_echo(accounts, data, program_id)                
            },
            EchoInstruction::InitializeVendingMachineEcho{
                price,
                buffer_size,
            } => {
                msg!("Instruction: InitializeVendingMachineEcho");
                Self::initialize_vending_machine_echo(accounts, program_id)                
            },
            EchoInstruction::VendingMachineEcho { data } => {
                msg!("Instruction: VendingMachineEcho");
                Self::vending_machine_echo(data)
            }, */
        } 
    }

    fn process_echo_instruction(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        data: Vec<u8>,

    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        // msg!("right until now 1");
        let echo_buffer = next_account_info(account_info_iter)?;
        
        // msg!("right until now 2");

        let mut data_dst = Echo::try_from_slice(&echo_buffer.data.borrow())?;
        // msg!("right until now 3");

        match data_dst.data.iter().position(|&x| x != 0) {
            None => {
                let mut data = data;
                data.resize(data_dst.data.len(), 0);
                data_dst.data = data.try_into().unwrap();
                msg!("data written into echo_buffer account");
                data_dst.serialize(&mut *echo_buffer.data.borrow_mut())?;
            }
            Some(_usize) => {
                msg!("Buffer account already used!");
                return Err(EchoError::NonZeroDataFoundInBuffer.into());
            }
        };
        Ok(())
    }


}

