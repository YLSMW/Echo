export const writePublicKey = (publicKey, name) => {
    fs.writeFileSync(
        `../keys/${name}_pub.json`,
        JSON.stringify(publicKey.toString())
    );
};

export const writePrivateKey = (PrivateKey, name) => {
    fs.writeFileSync(
        `../keys/${name}.json`,
        JSON.stringify(Array.from(PrivateKey))
    );
};

export const getPublicKey = (name) =>
    new PublicKey(
        JSON.parse(fs.readFileSync(`../keys/${name}_pub.json`))
    );

export const getPrivateKey = (name) =>
    Uint8Array.from(
        JSON.parse(fs.readFileSync(`../keys/${name}.json`))
    );

export const getKeypair = (name) =>
    new Keypair({
        publicKey: getPublicKey(name).toBytes(),
        secretKey: getPrivateKey(name),
    });

export const fileExists = (path) => {
        let fso = new ActiveXObject("Scripting.FileSystemObject");
        return fso.FileExists(path);
    };

