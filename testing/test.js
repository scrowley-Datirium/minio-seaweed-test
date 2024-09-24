const crypto = require('crypto');

const CREDNETIALS = {

}
const SECRET_KEY='c4V5dCXh208cfvqO5wLqOi2rlHy52cwbmGoKZBT8';
let utf8Key = Buffer.from(SECRET_KEY).toString('utf-8');

function createSignature(str) {
    let signatureSigner = crypto.createSign('HMAC-SHA1'); //('RSA-SHA256');



    console.log('str: ', str);
    console.log('key: ', SECRET_KEY);
    console.log('keyBuffer: ', utf8Key);
    // signatureSigner.write(str);
    // signatureSigner.end();
    signatureSigner.update(str);
    let signature = signatureSigner.sign(Buffer.from(SECRET_KEY).toString('utf-8'), 'hex');
    // remove white spaces (tab/newline) from signature
    signature = signature.replace('\t', '')
    signature = signature.replace('\n', '')
    // signature = signature.replace(' ', '')
    let encodedSignature = this.encodeAndReplace(signature);
    return encodedSignature
}

function sign2(str) {
    let signature = crypto.createHmac('sha1', SECRET_KEY)
        .update(str)
        .digest('hex')
    return signature
}


const main = () => {
    let data = 'some data';
    let signature = sign2(data); //createSignature(data);
    console.log('signature: ', signature);
}

main()