
const AWS = require('@aws-sdk/client-s3');
S3AccessKey = 'zzwv6u8Y5B5awSGB1K0t';
S3SecretKey = 'c4V5dCXh208cfvqO5wLqOi2rlHy52cwbmGoKZBT8';
s3BucketName = 'lab-data';
s3Domain = 'http://127.0.0.1';
s3Port = 9000;

const s3Client = new AWS.S3({
    region: "us-east-1",
    endpoint: 'http://127.0.0.1:9000', //`${this.s3Domain}:${this.s3Port}`,
    tls: true,
    // s3ForcePathStyle: true,
    forcePathStyle: true, //prevents sdk from using bucketName as subDomain
    credentials: {
        accessKeyId: S3AccessKey,
        secretAccessKey: S3SecretKey
    },
    signatureVersion: 'v4'
});
// AWS.config.update(
//     {
//         accessKeyId: 'zzwv6u8Y5B5awSGB1K0t', 
//         secretAccessKey: 'mysecret', 
//         region: 'us-east-1',
//         endpoint: 'localhost:9000',
//         forcePathStyle: true
//     });
// var s3 = new AWS.S3();

var params = { 
 Bucket: 'lab-data',
//  Delimiter: '/',
//  Prefix: 'dir1/'
}

const main = async () => {
    let res = await s3Client.listObjects(params);
    // , function (err, data) {
    // if(err)throw err;
    // console.log(data);
    // });
    console.log('res: ', res);
}

main();