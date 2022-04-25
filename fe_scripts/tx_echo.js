const {
    Connection,
    sendAndConfirmTransaction,
    Keypair,
    Transaction,
    SystemProgram,
    PublicKey,
    TransactionInstruction,
    LAMPORTS_PER_SOL,
  } = require("@solana/web3.js");
  
const BN = require("bn.js");

const main = async () => {

    // args[0]: Program ID
    // args[1]: Vec<u8> written into buffer account,in form of num1,num2,...,numn
    var args = process.argv.slice(2);
    const programId = new PublicKey(args[0]);
    const uservec = Buffer.from(args[1].split(",").map(Number));


    // Connect to cluster
    const connection = new Connection("http://localhost:8899", "confirmed");

    // Generate a new user keypair and airdrop SOL, this account is feepayer
    const userAccount = new Keypair();
    let userAccountPubkey = userAccount.publicKey;
    console.log("Requesting SOL for user...");
    const userAirdropSignature = await connection.requestAirdrop(userAccountPubkey, LAMPORTS_PER_SOL * 2);
    await connection.confirmTransaction(userAirdropSignature);
    console.log("Done");

    let tx = new Transaction();
    let signers = [userAccount];
    const bufferAccount = new Keypair();
    let bufferAccountPubkey = bufferAccount.publicKey;

    if (args.length > 2) {
        console.log("Found buffer address");
        bufferAccountPubkey = new PublicKey(args[2]);
        data = (await connection.getAccountInfo(bufferAccountPubkey)).data;
        count = new BN(data, "le");
    } else {
        // Generate a new account as buffer account
        console.log("Generating new buffer address");

        let createIx = SystemProgram.createAccount({
            fromPubkey: userAccountPubkey,
            newAccountPubkey: bufferAccountPubkey,
            /** Amount of lamports to transfer to the created account */
            lamports: await connection.getMinimumBalanceForRentExemption(140),
            /** Amount of space in bytes to allocate to the created account */
            space: 140,
            /** Public key of the program to assign as the owner of the created account */
            programId: programId,
        });
        signers.push(bufferAccount);
        tx.add(createIx);
    }

    let writeIx = new TransactionInstruction({
        keys: [
            {
                pubkey: bufferAccountPubkey,
                isSigner: false,
                isWritable: true,
            }
        ],
        programId: programId,
        data: Buffer.concat([Buffer.from(new Uint8Array([0])), uservec]),
    });

    // tx.add(writeIx);
    let txid = await sendAndConfirmTransaction(connection, tx, signers, {
        skipPreflight: true,
        preflightCommitment: "confirmed",
        confirmation: "confirmed",
    });
    data = (await connection.getAccountInfo(bufferAccountPubkey)).data;

    console.log("Buffer Key:", bufferAccountPubkey.toBase58());


};

main().then(() => {
    console.log("Success");
})
.catch((e) => {
    console.error(e);
});














