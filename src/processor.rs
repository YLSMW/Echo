use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};

use crate::{error::EchoError, instruction::EchoInstruction, state::Echo};

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
            }
            EchoInstruction::InitializeAuthorizedEcho {
                buffer_seed,
                buffer_size,
            } => {
                msg!("Instruction: InitializeAuthorizedEcho");
                Self::initialize_authorized_echo(program_id, accounts, buffer_seed, buffer_size)
            } /*           EchoInstruction::AuthorizedEcho{ data } => {
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
        let echo_buffer = next_account_info(account_info_iter)?;
        let mut data_dst = Echo::try_from_slice(&echo_buffer.data.borrow())?;

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
    fn initialize_authorized_echo(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        buffer_seed: u64,
        buffer_size: usize,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();

        let authority = next_account_info(account_info_iter)?;
        let authorized_buffer = next_account_info(account_info_iter)?;
        let (authorized_buffer_key, bump_seed) = Pubkey::find_program_address(
            &[
                b"authority",
                authority.key.as_ref(),
                &buffer_seed.to_le_bytes(),
            ],
            program_id,
        );

        let rent = &Rent::from_account_info(next_account_info(account_info_iter)?)?;

        let create_authorized_buffer_account_ix = system_instruction::create_account(
            authority.key,
            &authorized_buffer_key,
            rent.minimum_balance(buffer_size),
            buffer_size.try_into().unwrap(),
            program_id,
        );

        msg!("Creating Authorized BufferAccount ...");
        invoke_signed(
            &create_authorized_buffer_account_ix,
            &[
                authority.clone(),
                authorized_buffer.clone(),
            ],
            &[&[&b"authority"[..],authority.key.as_ref(), &[bump_seed]]],
        )?;

        let mut data_dst = Echo::try_from_slice(&authorized_buffer.data.borrow())?;  
        // let data = [bump_seed, buffer_seed.to_le_bytes(), buffer_size]
        match data_dst.data[13..].iter().position(|&x| x != 0) {
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
