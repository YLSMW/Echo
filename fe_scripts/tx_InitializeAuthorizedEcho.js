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
    // args[1]: Authority ID
    var args = process.argv.slice(2);
    const programId = new PublicKey(args[0]);

    // Connect to cluster
    const connection = new Connection("http://localhost:8899", "confirmed");

    // get authority account, fee payer
    if (args.length > 1) {
        console.log("Found Authority address");
        const authorityID = new PublicKey(args[1]);
    } else {
        const authority = new Keypair();
        let authorityID = authority.publicKey; 
        console.log("Requesting SOL for authority...");
        const authorityAirdropSignature = await connection.requestAirdrop(authorityID, LAMPORTS_PER_SOL * 2);
        await connection.confirmTransaction(authorityAirdropSignature);
        console.log("Done");      
    }


    let tx = new Transaction();
    // generate the authorized_buffer account
    let signers = [userAccount];
    const bufferAccount = new Keypair();
    let bufferAccountPubkey = bufferAccount.publicKey;

    if (args.length > 2) {
        console.log("Found buffer address");
        bufferAccountPubkey = new PublicKey(args[2]);
        data = (await connection.getAccountInfo(bufferAccountPubkey)).data;
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
    // This is so ugly. 
    len = new ArrayBuffer(4);
    len_1 = new DataView(len);
    len_1.setUint32(0, uservec.length, true);

    data =  Buffer.concat([Buffer.from(new Uint8Array([0])), Buffer.from(len), uservec])
    //data =  Buffer.from(new Uint8Array([0,4,0,0,0,1,2,3,4]));
    let writeIx = new TransactionInstruction({
        programId: programId,
        keys: [
            {
                pubkey: bufferAccountPubkey,
                isSigner: false,
                isWritable: true,
            }
        ],
        data: data,
    });

    tx.add(writeIx);
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














