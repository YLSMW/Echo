import { Connection, sendAndConfirmTransaction, Keypair, Transaction, SystemProgram, PublicKey, TransactionInstruction, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import { getKeypair, getPublicKey, writePublicKey, writePrivateKey, fileExists } from "./utils.js";


const createMint = (
    connection,
    { publicKey, secretKey }
) => {
    return Token.createMint(
        connection,
        {
            publicKey,
            secretKey,
        },
        publicKey,
        null,
        0,
        TOKEN_PROGRAM_ID
    );
};

const setupMint = async (
    name,
    connection,
    userPublicKey,
    clientKeypair
) => {
    console.log(`Creating Mint ${name}...`);
    const mint = await createMint(connection, clientKeypair);
    writePublicKey(mint.publicKey, `mint_${name.toLowerCase()}`);
    console.log(`Creating user TokenAccount for ${name}...`);
    const userTokenAccount = await mint.createAccount(userPublicKey);
    writePublicKey(userTokenAccount, `user_${name.toLowerCase()}`);
    return [mint, userTokenAccount];
};

const main = async () => {

    // Connect to cluster
    const connection = new Connection("http://localhost:8899", "confirmed");

    if (fileExists(`../keys/userAccount.json`)) {
        console.log("using existing user info");
        var userKeypair = getKeypair("userAccount");        
    } else {
        console.log("creating new user account...");
        var userKeypair = new Keypair();
        console.log("Requesting SOL for user...");
        await connection.requestAirdrop(userKeypair.publicKey, LAMPORTS_PER_SOL * 2);
        // Save userAccount keypair.
        writePublicKey(userKeypair.publicKey, "userAccount");
        writePrivateKey(userKeypair.secretKey, "userAccount");
    }

    if (fileExists(`../keys/tokenClientAccount.json`)) {
        console.log("using existing token client info");
        var clientKeypair = getKeypair("tokenClientAccount");        
    } else {
        console.log("creating new token client account...");
        var clientKeypair = new Keypair();
        console.log("Requesting SOL for token client...");
        await connection.requestAirdrop(clientKeypair.publicKey, LAMPORTS_PER_SOL * 2);
        // Save userAccount keypair.
        writePublicKey(clientKeypair.publicKey, "tokenClientAccount");
        writePrivateKey(clientKeypair.secretKey, "tokenClientAccount");
    }

    const [mintX, userTokenAccount] = await setupMint(
        "VMT",
        connection,
        userKeypair.publicKey,
        clientKeypair
    );
    console.log("Sending 50X to user's TokenAccount...");
    await mintX.mintTo(userTokenAccount, clientKeypair.publicKey, [], 50);
    console.log("✨Setup complete✨\n");
};

main();