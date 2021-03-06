use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke_signed, invoke},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    system_instruction,
    sysvar::rent::Rent,
};
use spl_token::{
    instruction::{burn/* , approve, close_account, initialize_mint, mint_to, transfer */},
    state::Account,
    /* state::Mint, */
};

use crate::{
    error::EchoError,
    instruction::EchoInstruction,
    state::{VendingMachineEcho, AuthorizedEcho, Echo},
};

pub struct Processor;

impl Processor {
    pub fn process(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
        // let data_0 = [0, 6, 0, 0, 0, 21, 22, 23, 24, 25, 26];
        // assert_eq!(data_0,data);

        msg!("data : {:?}", data);
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
            }
            EchoInstruction::AuthorizedEcho { data } => {
                msg!("Instruction: AuthorizedEcho");
                Self::authorized_echo(program_id, accounts, data)
            }
            EchoInstruction::InitializeVendingMachineEcho { price, buffer_size } => {
                msg!("Instruction: InitializeVendingMachineEcho");
                Self::initialize_vending_machine_echo(program_id, accounts, price, buffer_size)
            }
            EchoInstruction::VendingMachineEcho { data } => {
                msg!("Instruction: VendingMachineEcho");
                Self::vending_machine_echo(program_id, accounts, data)
            }
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
        let system_program_account = next_account_info(account_info_iter)?;
        let (authorized_buffer_key, bump_seed) = Pubkey::find_program_address(
            &[
                b"authority",
                authority.key.as_ref(),
                &buffer_seed.to_le_bytes(),
            ],
            program_id,
        );
        let rent = Rent::default();

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
                system_program_account.clone(),
                authority.clone(),
                authorized_buffer.clone(),
            ],
            &[&[
                &b"authority"[..],
                authority.key.as_ref(),
                &buffer_seed.to_le_bytes(),
                &[bump_seed],
            ]],
        )?;

        msg!("Authorized BufferAccount Created...");
        let data_dst = &mut *authorized_buffer.data.borrow_mut();

        let data: Vec<u8> = [bump_seed]
            .iter()
            .copied()
            .chain(buffer_seed.to_le_bytes().iter().copied())
            .chain(0u32.to_le_bytes().iter().copied())
            .collect();

        let data = AuthorizedEcho::try_from_slice(&data)?;

        data.serialize(data_dst)?;
        msg!("data head written into echo_buffer account");

        Ok(())
    }
    fn authorized_echo(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        data: Vec<u8>,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let authority = next_account_info(account_info_iter)?;
        let authorized_buffer = next_account_info(account_info_iter)?;
        let mut buffer_data = authorized_buffer.data.borrow_mut();

        // Check Authority
        msg!("Authority Check...");
        let bump_seed_ = buffer_data[0];
        let buffer_seed = &buffer_data[1..9];
        msg!(
            "bump_seed : {:?}; buffer_seed : {:?};",
            bump_seed_,
            buffer_seed
        );

        let (authorized_buffer_key, bump_seed) = Pubkey::find_program_address(
            &[b"authority", authority.key.as_ref(), buffer_seed],
            program_id,
        );
        if bump_seed != bump_seed_
            || authorized_buffer_key != *authorized_buffer.key
            || !authority.is_signer
        {
            msg!("Authority Check Failed");
            return Err(EchoError::AuthorityCheckFailed.into());
        }
        msg!("Authority Check Done");

        let mut vec_len_data = [0u8; 4];
        vec_len_data.clone_from_slice(&buffer_data[9..13]);
        let vec_len = u32::from_le_bytes(vec_len_data);

        let data_dst_data = &buffer_data[..13 + vec_len as usize];
        let mut data_dst = AuthorizedEcho::try_from_slice(data_dst_data)?;

        match buffer_data[9..].iter().position(|&x| x != 0) {
            None => {
                // let mut data = data;
                if data.len() > 140 {
                    // data_dst.data.extend(140u32.to_le_bytes().iter().copied());  // a silly logic mistake
                    data_dst.data.extend(data[..140].iter());
                } else {
                    // data_dst.data.extend((data.len() as u32).to_le_bytes().iter().copied());
                    data_dst.data.extend(data.iter());
                }
                msg!("data written into echo_buffer account");

                //let buffer_data = &authorized_buffer.data.borrow_mut(); // This is hard. need to review more thoroughly
                data_dst.serialize(&mut *buffer_data)?;
            }
            Some(_usize) => {
                msg!("Buffer account already used!");
                return Err(EchoError::NonZeroDataFoundInBuffer.into());
            }
        };
        Ok(())
    }
    fn initialize_vending_machine_echo(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        price: u64,
        buffer_size: usize,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let vending_machine_buffer = next_account_info(account_info_iter)?;
        let vending_machine_mint = next_account_info(account_info_iter)?;
        let payer = next_account_info(account_info_iter)?;
        let system_program_account = next_account_info(account_info_iter)?;
        let (vending_machine_buffer_pubkey, bump_seed) = Pubkey::find_program_address(
            &[
                b"vending_machine",
                vending_machine_mint.key.as_ref(),
                &price.to_le_bytes(),
            ],
            program_id,
        );
        let rent = Rent::default();

        let create_vending_machine_buffer_account_ix = system_instruction::create_account(
            payer.key,
            &vending_machine_buffer_pubkey,
            rent.minimum_balance(buffer_size + 9),
            (buffer_size + 9).try_into().unwrap(),
            program_id,
        );

        msg!("Creating VendingMachine BufferAccount ...");
        invoke_signed(
            &create_vending_machine_buffer_account_ix,
            &[
                system_program_account.clone(),
                payer.clone(),
                vending_machine_buffer.clone(),
            ],
            &[&[
                &b"vending_machine"[..],
                vending_machine_mint.key.as_ref(),
                &price.to_le_bytes(),
                &[bump_seed],
            ]],
        )?;

        msg!("VendingMachine BufferAccount Created...");
        let data_dst = &mut *vending_machine_buffer.data.borrow_mut();

        let data: Vec<u8> = [bump_seed].iter().copied()
            .chain(price.to_le_bytes().iter().copied())
            .chain(0u32.to_le_bytes().iter().copied())
            .collect();

        let data = AuthorizedEcho::try_from_slice(&data)?;

        data.serialize(data_dst)?;
        msg!("data head written into echo_buffer account");
        Ok(())
    }

    fn vending_machine_echo(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        data: Vec<u8>,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let vending_machine_buffer = next_account_info(account_info_iter)?;
        let user = next_account_info(account_info_iter)?;
        let user_token = next_account_info(account_info_iter)?;
        let vending_machine_mint = next_account_info(account_info_iter)?;
        let system_token_program = next_account_info(account_info_iter)?;
        let mut buffer_data = vending_machine_buffer.data.borrow_mut();
        let bump_seed = buffer_data[0];
        let price = &buffer_data[1..9];
        // Check Authority
        msg!("Vender Machine and Payer Check......");
        {
            msg!("bump_seed : {:?}; price : {:?};", bump_seed, u64::from_le_bytes(price.try_into().unwrap()));

            let (vending_machine_buffer_pubkuy, bump_seed_) = Pubkey::find_program_address(
                &[b"vending_machine", vending_machine_mint.key.as_ref(), price],
                program_id,
            );
            if bump_seed != bump_seed_
                || *vending_machine_buffer.key != vending_machine_buffer_pubkuy
            {
                msg!("Vending Machine Check Failed : Can't locate the veding machine");
                return Err(EchoError::AuthorityCheckFailed.into());
            }

            if !user.is_signer {
                msg!("Vending Machine Check Failed : singer missing");
                return Err(EchoError::AuthorityCheckFailed.into());
            }
            let user_token_account_info =
                Account::unpack_from_slice(&user_token.data.borrow_mut()[..])?;
            if *user.key != user_token_account_info.owner {
                msg!("Payer and Token Account Mismatched");
                return Err(EchoError::AuthorityCheckFailed.into());
            }
            if user_token_account_info.mint != *vending_machine_mint.key {
                msg!("Vending Machine Check Failed : Wrong token");
                return Err(EchoError::AuthorityCheckFailed.into());
            }
            if user_token_account_info.amount < u64::from_le_bytes(price.try_into().unwrap()) {
                msg!("Insufficient Tokens");
                return Err(ProgramError::InsufficientFunds.into());
            }
        };
        msg!("Vender Machine and Payer validated.");

        // Pay
        let create_token_burn_ix = burn(
            system_token_program.key,
            user_token.key,
            vending_machine_mint.key,
            user.key,
            &[&user.key],
            u64::from_le_bytes(price.try_into().unwrap()),
        )?;

        msg!("Conduct Payment...");
        invoke(
            &create_token_burn_ix,
            &[
                system_token_program.clone(),
                user_token.clone(),
                vending_machine_mint.clone(),
                user.clone(),
            ],
        )?;        

        // Service
        let mut vec_len_data = [0u8; 4];
        vec_len_data.clone_from_slice(&buffer_data[9..13]);
        let vec_len = u32::from_le_bytes(vec_len_data);

        let data_dst_data = &buffer_data[..13 + vec_len as usize];
        let mut data_dst = VendingMachineEcho::try_from_slice(data_dst_data)?;

        match buffer_data[9..].iter().position(|&x| x != 0) {
            None => {
                // let mut data = data;
                if data.len() > 140 {
                    data_dst.data.extend(data[..140].iter());
                } else {
                    data_dst.data.extend(data.iter());
                }
                msg!("data written into echo_buffer account");
                //let buffer_data = &authorized_buffer.data.borrow_mut(); // This is hard. need to review more thoroughly
                data_dst.serialize(&mut *buffer_data)?;
            }
            Some(_usize) => {
                msg!("reset Buffer Account Data and Write data");
                data_dst.data = vec!();
                if data.len() > 140 {
                    data_dst.data.extend(data[..140].iter());
                } else {
                    data_dst.data.extend(data.iter());
                }                
                data_dst.serialize(&mut *buffer_data)?;
            }
        };
        Ok(())
    }
}
