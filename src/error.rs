use thiserror::Error;
use solana_program::program_error::ProgramError;

#[derive(Error, Debug, Copy, Clone)]
pub enum EchoError {

    #[error("Invalid Instruction")]
    InvalidInstruction,

    #[error("Not Rent Exempt")]
    NotRentExempt,

    #[error("Non Zero Data Found In Buffer")]
    NonZeroDataFoundInBuffer,

}


impl From<EchoError> for ProgramError {
    fn from(e : EchoError) -> Self {
        ProgramError::Custom(e as u32)
    }
}