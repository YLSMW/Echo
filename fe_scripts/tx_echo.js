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

const fs = require("fs");

const writePublicKey = (publicKey, name) => {
    fs.writeFileSync(
        `/home/yalasia1102/Echo-protocol/keys/${name}_pub.json`,
        JSON.stringify(publicKey.toString())
    );
};

const writePrivateKey = (PrivateKey, name) => {
    fs.writeFileSync(
        `/home/yalasia1102/Echo-protocol/keys/${name}.json`,
        JSON.stringify(Array.from(PrivateKey))
    );
};

const getPublicKey = (name) =>
    new PublicKey(
        JSON.parse(fs.readFileSync(`/home/yalasia1102/Echo-protocol/keys/${name}_pub.json`))
    );

const getPrivateKey = (name) =>
    Uint8Array.from(
        JSON.parse(fs.readFileSync(`/home/yalasia1102/Echo-protocol/keys/${name}.json`))
    );

const getKeypair = (name) =>
    new Keypair({
        publicKey: getPublicKey(name).toBytes(),
        secretKey: getPrivateKey(name),
    });


const main = async () => {
    // args[0]: ix id: 0 echo; 1 initialize authorized echo; ...
    // args[1]: Program ID
    var args = process.argv.slice(2);
    const ix_ID = args[0];
    const programId = new PublicKey(args[1]);

    // Connect to cluster
    const connection = new Connection("http://localhost:8899", "confirmed");

    if (ix_ID == 0) {
        // args[2]: uservector to store in Buffer
        const uservec = Buffer.from(args[2].split(",").map(Number));

        // Generate a new user keypair and airdrop SOL, this account is feepayer
        const userAccount = new Keypair();
        let userAccountPubkey = userAccount.publicKey;
        console.log("Requesting SOL for user...");
        const userAirdropSignature = await connection.requestAirdrop(userAccountPubkey, LAMPORTS_PER_SOL * 2);
        await connection.confirmTransaction(userAirdropSignature);
        console.log("Done");

        // Save userAccount keypair.
        writePublicKey(userAccountPubkey, "userAccount");
        
        writePrivateKey(userAccount.secretKey, "userAccount");

        // userAccountPubkey = getKeypair("userAccount");

        let tx = new Transaction();
        let signers = [userAccount];
        const bufferAccount = new Keypair();
        let bufferAccountPubkey = bufferAccount.publicKey;

        if (args.length > 3) {
            console.log("Found buffer address");
            bufferAccountPubkey = new PublicKey(args[3]);
        } else {
            // Generate a new account as buffer account
            console.log("Generating new buffer address...");

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
        // This is still ugly. 
        let len = new DataView(new ArrayBuffer(4));
        len.setUint32(0, uservec.length, true);

        let data = Buffer.concat([Buffer.from(new Uint8Array([0])), Buffer.from(len), uservec])
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

    } else if (ix_ID == 1) {


    };
};

main().then(() => {
    console.log("Success");
})
    .catch((e) => {
        console.error(e);
    });














