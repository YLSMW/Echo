import { Connection, sendAndConfirmTransaction, Keypair, Transaction, SystemProgram, PublicKey, TransactionInstruction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getKeypair, getPublicKey, writePublicKey, writePrivateKey } from "./utils.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

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

        // This is STILL so ugly. 
        let len = new ArrayBuffer(4);
        new DataView(len).setUint32(0, uservec.length, true);

        let data = Buffer.concat([Buffer.from(new Uint8Array([0])), Buffer.from(len), uservec])
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
        await sendAndConfirmTransaction(connection, tx, signers, {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            confirmation: "confirmed",
        });
        console.log("Buffer Key:", bufferAccountPubkey.toBase58());

    } else if (ix_ID == 1) {
        // args[2]: name for authority keypair in key folder
        const authorityName = args[2].toString();
        const authorityAccount = getKeypair(authorityName);
        let authorityPubkey = authorityAccount.publicKey;

        // funding authorityAccount
        if (await connection.getBalance(authorityPubkey) < LAMPORTS_PER_SOL) {
            console.log("Requesting SOL for authority...");
            const authorityPubkeyAirdropSignature = await connection.requestAirdrop(authorityPubkey, LAMPORTS_PER_SOL * 2);
            await connection.confirmTransaction(authorityPubkeyAirdropSignature);
            console.log("Done");
        }

        // create PDA for AuthorizedEcho
        let buffer_seed = args[3];
        let bufferSeedArray = [Buffer.from('authority'), Buffer.from(authorityPubkey.toBytes()), Buffer.from(buffer_seed.split(",").map(Number))];
        const [bufferAccountPubkey, _] = await PublicKey.findProgramAddress(
            bufferSeedArray,
            programId
        );
        console.log("bufferAccountPubkey is : ", bufferAccountPubkey.toBase58());

        /*  // This is done on protocol side.
            const ix_createAuthorizedBufferAccount = SystemProgram.createAccount({
            fromPubkey: authorityPubkey,
            newAccountPubkey: bufferAccountPubkey,
            space : 153, // 1 + 8 + 4 + 140
            lamports: await connection.getMinimumBalanceForRentExemption(153),
            programId: programId
        });   */

        let tx = new Transaction();
        let signers = [authorityAccount];
        let data = Buffer.concat([
            Buffer.from(new Uint8Array([1])),
            Buffer.from(buffer_seed.split(",").map(Number)),
            Buffer.from(new Uint8Array([153, 0, 0, 0, 0, 0, 0, 0]))
        ]);
        
        let createAndInitialteAuthorizedBufferAccountIx = new TransactionInstruction({
            programId: programId,
            keys: [
                { pubkey: authorityPubkey, isSigner: true, isWritable: false },
                { pubkey: bufferAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false}
            ],
            data: data
        });
        writePublicKey(bufferAccountPubkey, "authorizedBufferAccount")
        tx.add(createAndInitialteAuthorizedBufferAccountIx);

        await sendAndConfirmTransaction(connection, tx, signers, {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            confirmation: "confirmed",
        });   

    } else if (ix_ID == 2) {
        const authorityName = args[2].toString();
        const authorityAccount = getKeypair(authorityName);
        let authorityPubkey = authorityAccount.publicKey;
        let bufferAccountPubkey = getPublicKey("authorizedBufferAccount");
        // funding authorityAccount
        if (await connection.getBalance(authorityPubkey) < LAMPORTS_PER_SOL) {
            console.log("Requesting SOL for authority...");
            const authorityPubkeyAirdropSignature = await connection.requestAirdrop(authorityPubkey, LAMPORTS_PER_SOL * 2);
            await connection.confirmTransaction(authorityPubkeyAirdropSignature);
            console.log("Done");
        }

        let uservec = Buffer.from(args[3].split(",").map(Number));
        let userveclen = new ArrayBuffer(4);
        new DataView(userveclen).setUint32(0, uservec.length, true);
        let data = Buffer.concat([
            Buffer.from(new Uint8Array([2])),
            Buffer.from(userveclen),
            uservec,
        ]);

        let tx = new Transaction();
        let signers = [authorityAccount]
        let writeToAuthorizedBufferAccountIx = new TransactionInstruction({
            programId: programId,
            keys: [
                { pubkey: authorityPubkey, isSigner: true, isWritable: false },
                { pubkey: bufferAccountPubkey, isSigner: false, isWritable: true },
            ],
            data: data
        });
        tx.add(writeToAuthorizedBufferAccountIx);
        await sendAndConfirmTransaction(connection, tx, signers, {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            confirmation: "confirmed",
        });
    } else if (ix_ID == 3) {
        const userAccount = getKeypair(`userAccount`);
        let userPubkey = userAccount.publicKey;
        let vendingMachineMintAccount = getPublicKey(`mintVMT`);

        // funding userAccount
        if (await connection.getBalance(userPubkey) < LAMPORTS_PER_SOL) {
            console.log("Requesting SOL for user...");
            const userPubkeyAirdropSignature = await connection.requestAirdrop(userPubkey, LAMPORTS_PER_SOL * 2);
            await connection.confirmTransaction(userPubkeyAirdropSignature);
            console.log("Done");
        }

        // create PDA for VendingMachineEcho
        let price = new ArrayBuffer(8);
        new DataView(price).setBigUint64(0, args[3].split(",").map(Number), true);
        let bufferSeedArray = [Buffer.from('vending_machine'), Buffer.from(vendingMachineMintAccount.toBytes()), Buffer.from(price)];
        const [vendingMachineBufferAccountPubkey, _bumpSeed] = await PublicKey.findProgramAddress(
            bufferSeedArray,
            programId
        );
        console.log("vendingMachineAccountPubkey is : ", vendingMachineBufferAccountPubkey.toBase58());

        let tx = new Transaction();
        let signers = [userAccount];
        let data = Buffer.concat([
            Buffer.from(new Uint8Array([3])),
            Buffer.from(price),
            Buffer.from(new Uint8Array([153, 0, 0, 0, 0, 0, 0, 0]))
        ]);
        
        let createAndInitialteAuthorizedBufferAccountIx = new TransactionInstruction({
            programId: programId,
            keys: [
                
                { pubkey: vendingMachineBufferAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: vendingMachineMintAccount, isSigner: false, isWritable: true },
                { pubkey: userPubkey, isSigner: true, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false}
            ],
            data: data
        });
        tx.add(createAndInitialteAuthorizedBufferAccountIx);

        await sendAndConfirmTransaction(connection, tx, signers, {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            confirmation: "confirmed",
        });
        writePublicKey(vendingMachineBufferAccountPubkey, "vendingMachineBufferAccount")
    } else if (ix_ID == 4) {
        // to be continued
        const userAccount = getKeypair(`userAccount`);
        let userPubkey = userAccount.publicKey;
        let vendingMachineBufferAccountPubkey = getPublicKey("vendingMachineBufferAccount");
        let vendingMachineMintAccountPubkey = getPublicKey("mintVMT");
        let userTokenAccountPubkey = getPublicKey("userVMT");
        let tokenProgramPubkey = TOKEN_PROGRAM_ID;
        let uservec = Buffer.from(args[4].split(",").map(Number));
        let userveclen = new ArrayBuffer(4);
        new DataView(userveclen).setUint32(0, uservec.length, true);
        let data = Buffer.concat([
            Buffer.from(new Uint8Array([4])),
            Buffer.from(userveclen),
            uservec,
        ]);
        console.log("TOKEN_PROGRAM_ID : ", TOKEN_PROGRAM_ID.toBase58())
        let tx = new Transaction();
        let signers = [userAccount];
        let writeTovendingMachineBufferAccountIx = new TransactionInstruction({
            programId: programId,
            keys: [
                { pubkey: vendingMachineBufferAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: userPubkey, isSigner: true, isWritable: false },
                { pubkey: userTokenAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: vendingMachineMintAccountPubkey, isSigner: false, isWritable: true },
                { pubkey: tokenProgramPubkey, isSigner: false, isWritable: false },                               
            ],
            data: data
        });
        tx.add(writeTovendingMachineBufferAccountIx);
        await sendAndConfirmTransaction(connection, tx, signers, {
            skipPreflight: true,
            preflightCommitment: "confirmed",
            confirmation: "confirmed",
        });        
    }
};

main().then(() => {
    console.log("Success");
})
    .catch((e) => {
        console.error(e);
    });














