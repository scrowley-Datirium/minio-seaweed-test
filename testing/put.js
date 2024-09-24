// usage:
// > AWS_REGION=eu-west-1 BUCKET_NAME=your-bucket-name OBJECT_KEY=your-key-name node post.js
const AWS = require('@aws-sdk/client-s3');
const signer = require('@aws-sdk/s3-request-presigner');
const getSignedUrl = signer.getSignedUrl;
const createPresignedPost = signer.createPresignedPost;
// import { S3Client } from '@aws-sdk/client-s3'
// import { createPresignedPost } from '@aws-sdk/s3-presigned-post'

const BUCKET_NAME = 'lab-data'
let OBJECT_KEY ='dir1/dir2/curlPUT1.txt';


const s3Client = new AWS.S3Client({
    region: "us-east-1",
    endpoint: `${this.s3Domain}:${this.s3Port}`,
    tls: false,
    // s3ForcePathStyle: true,
    forcePathStyle: true, //prevents sdk from using bucketName as subDomain
    credentials: {
        accessKeyId: this.S3AccessKey,
        secretAccessKey: this.S3SecretKey
    },
    signatureVersion: 'v4'
});

const main = async () => { 
    const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: BUCKET_NAME,
    Key: OBJECT_KEY,
    // Conditions: [
    //     ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
    //     // complete set of possible conditions: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
    // ],
    Fields: {
        success_action_status: '201',
        'Content-Type': 'text/plain' // defines the accepted content types
        // success_action_redirect: 'https://example.com/success'
        // complete list of fields: https://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectPOST.html
    },
    Expires: 3600
    })

    console.log(`
    curl -X POST -v "${url}" \\
        ${Object.entries(fields).map(([key, value]) => `--form ${key}=${value}`).join(' \\ \n    ')} \\
        --form file='@<PATH_TO_FILE>'
    `)
}

main();