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
    pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], instruction_data: &[u8]) -> ProgramResult {
        let instruction = EchoInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;
        match instruction {
            EchoInstruction::Echo { data } => {
                msg!("Instruction: Echo");
                Self::process_echo_instruction(accounts, data, program_id)
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
        accounts: &[AccountInfo],
        data: Vec<u8>,
        _program_id: &Pubkey,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let echo_buffer = next_account_info(account_info_iter)?;

        let mut data_dst = Echo::try_from_slice(&echo_buffer.data.borrow())?;
        match data_dst.data.iter().position(|&x| x != 0) {
            None => {
                data_dst.data = data;
                msg!("data written into echo_buffer account");
                data_dst.serialize(&mut *echo_buffer.data.borrow_mut())?;
            }
            Some(_usize) => {
                return Err(EchoError::NonZeroDataFoundInBuffer.into());
            }
        };
        Ok(())
    }


}

