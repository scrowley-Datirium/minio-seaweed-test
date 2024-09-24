const express = require('express')
const cors = require('cors')
const AWS = require('@aws-sdk/client-s3');
const Minio = require('minio');
const signer = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const getSignedUrl = signer.getSignedUrl;

class Helper {
    S3AccessKey = 'zzwv6u8Y5B5awSGB1K0t';
    S3SecretKey = 'c4V5dCXh208cfvqO5wLqOi2rlHy52cwbmGoKZBT8';
    s3BucketName = 'lab-data';
    s3Domain = 'http://127.0.0.1';
    s3Port = 9000;
    shasum = crypto.createHash('sha1');

    constructor() {
        this.s3Client = new AWS.S3({
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
        this.minioClient = new Minio.Client({
            endPoint: 'localhost',//this.s3Domain,
            port: this.s3Port,
            useSSL: false,
            accessKey: this.S3AccessKey,
            secretKey: this.S3SecretKey,
        });
    }

    test() {
        return 'test';
    }

    /**
     * 
     * @param {string} filePath 
     * @param {number} fileSize 
     * @param {any} md5Sums 
     * @returns 
     */
    async signUploadUrl(
        filePath,
        fileSize,
        md5Sums,
        fileType
        // isMultiUpload: boolean = false
    ) {
        let expiration = 60; // number of seconds after signing (now) till signature expires

        // if (Object.keys(md5Sums).length > 1) {
        // if (isMultiUpload) {
        if (fileSize > 5000000000) {
            let command = new AWS.CreateMultipartUploadCommand({
                Bucket: this.s3BucketName,
                Key: filePath,
                // ACL?: ObjectCannedACL;
            });

            const startUploadResponse = await this.s3Client.send(command);

            const uploadId = startUploadResponse.UploadId;

            // create presignedURLs for each chunk to upload
            const numberOfParts = Math.ceil(fileSize / 100000000); // 100Mb chunks (1-2Gb might be more appropriate)

            // make object instead of list? (preserve order?)
            let presignedUrls = [];

            for (let i = 0; i < numberOfParts; i++) {
                const presignedUrl = await getSignedUrl(
                    this.s3Client,
                    new AWS.UploadPartCommand({
                        Bucket: this.s3BucketName,
                        Key: filePath,
                        UploadId: uploadId,
                        PartNumber: i + 1,
                        // TODO: if multi-part, chunk size needs to be static and agreed upon so client can compute MD5 of each chunk and include it in req data
                        ContentMD5: md5Sums[`${i}`],
                    }),
                    {
                        expiresIn: expiration,
                        // Set of all x-amz-* headers you wish to have signed
                        unhoistableHeaders: new Set(["x-amz-checksum-sha256"]),
                    },
                );

                presignedUrls.push(presignedUrl);
            }
            return presignedUrls

        }

        // probably worth using POST instead of PUT (more flexibility)

        // // options for POST command:
        // const Conditions = [
        //     { bucket: this.s3BucketName },
        //     { key: fileKey },
        //     { "Content-MD5": fileMD5 },
        //     [ "content-length-range", 1024, 5242880 ], // file size limit 1KB-5MB
        //     [ "starts-with", "$Content-Type", "image/" ] // only support file of content-type: "image/jpg, image/png, image/gif"
        // ];
        // const Fields = { "Content-MD5": fileMD5 }

        let command = new AWS.PutObjectCommand({
            Bucket: this.s3BucketName,
            Key: filePath,
            // ContentType: fileType,
            // TODO: establish how single md5 sum would be given
            // ChecksumSHA256: md5Sums['0'],

            // might be making uploaded file publicly GETable. TEST
            // ACL: 'public-read',
        });
        const presignedURL = await getSignedUrl(this.s3Client, command, {
            expiresIn: expiration,
            // ContentType: 'application/octet-stream',
            // Set of all x-amz-* headers you wish to have signed
            // unhoistableHeaders: new Set(["x-amz-checksum-sha256"]), 
            // if PUT, include md5 in unhoistable? or require client to include in headers. or send back headers for client to use

        });
        // const presignedURL = await this.s3Client.getSignedUrl()
        return [presignedURL];

    }

    async signDownloadUrl(filePath) {

        // make conditions?
        // TODO: establish how directory access signatures would be handled

        let command = new AWS.GetObjectCommand({
            Bucket: this.s3BucketName, // use bucketName instead?
            Key: filePath,
        })


        const presignedURL = await getSignedUrl(this.s3Client, command, {
            expiresIn: 300, // 5 min
            // Set of all x-amz-* headers you wish to have signed
            // unhoistableHeaders: new Set(["x-amz-checksum-sha256"]),
            // if PUT, include md5 in unhoistable? or require client to include in headers. or send back headers for client to use

        });
        console.log('presigned GET url: ', presignedURL);
        return presignedURL
    }
    

    async completeMultiPartUpload(completedData) {

        const completeMultipartUploadCommand = new AWS.CompleteMultipartUploadCommand(completedData);

        let awsRes = await this.s3Client.send(completeMultipartUploadCommand);
        return awsRes;
    }

    async signUploadUrl2(filePath, sha256) {
        let expiration = 600; // number of seconds after signing (now) till signature expires

        

        
        let command = new AWS.PutObjectCommand({
            Bucket: this.s3BucketName,
            Key: filePath,
            // ContentType: fileType,
            // TODO: establish how single md5 sum would be given
            ChecksumSHA256: sha256,
            // ContentMD5: md5sum

            // might be making uploaded file publicly GETable. TEST
            // ACL: 'public-read',
        });
        const presignedURL = await getSignedUrl(this.s3Client, command, {
            expiresIn: expiration,
            // ContentType: 'application/octet-stream',
            // Set of all x-amz-* headers you wish to have signed
            unhoistableHeaders: new Set(["x-amz-checksum-sha256"]), 
            // if PUT, include md5 in unhoistable? or require client to include in headers. or send back headers for client to use

        });
        // const presignedURL = await this.s3Client.getSignedUrl()
        return [presignedURL];

    }

    async signMultipartUpload(fileName, fileExt, prefix, fileSize, md5, chunkSize, chunkMd5s) {
        let expiration = 600; // number of seconds after signing (now) till signature expires


        // sanitize filename (strip illegale chars, add datetime)
        fileName = `${fileName}-${Date.now()}`
        let multipartParams = {
            Bucket: 'lab-data',
            Key: `${prefix}/${fileName}.${fileExt}`,
        }
        let command = new AWS.CreateMultipartUploadCommand(multipartParams);
        const multipartUpload = await this.s3Client.send(command);
        let uploadId = multipartUpload.UploadId
        let fileKey = multipartUpload.Key // same as prefix+filename+fileExt ?

        let numParts = Math.ceil(fileSize / chunkSize);
        // const multipartParams = {
        //     Bucket: 'lab-data',
        //     Key: `${prefix}/${fileName}.${fileExt}`,
        //     UploadId: fileId,
        // }
        multipartParams.UploadId = uploadId;
        // multipartParams.Key = fileKey;
        // multipartParams.Body = ?;
        

        const promises = []

        for (let index = 0; index < numParts; index++) {
            command = new AWS.UploadPartCommand({
                ...multipartParams,
                PartNumber: index + 1,
            });
            promises.push(
                getSignedUrl(this.s3Client, command, { expiresIn: expiration }),
            )
        }

        const signedUrls = await Promise.all(promises)

        const multipartUploadData = {
            "Parts": []
            // chunkMd5s.map((chunkData) => {
            //     return {
            //         ETag: chunkData.md5,
            //         PartNumber: chunkData.partNumber
            //     }
            // })

            // [
            //     {
            //         "ETag": "\"d8c2eafd90c266e19ab9dcacc479f8af\"",
            //         "PartNumber": "1"
            //     },
            //     {
            //         "ETag": "\"d8c2eafd90c266e19ab9dcacc479f8af\"",
            //         "PartNumber": "2"
            //     }
            // ]
        }
        // sign completed url
        // each part has etag = partMD5
        let completeOptions = {
            "Bucket": "lab-data",
            "Key": multipartParams.Key,
            "MultipartUpload": multipartUploadData,
            "UploadId": "7YPBOJuoFiQ9cz4P3Pe6FIZwO4f7wN93uHsNBEw97pl5eNwzExg0LAT2dUN91cOmrEQHDsP3WA60CEg--"
        };
        command = new AWS.CompleteMultipartUploadCommand(completeOptions);
        let signedCompletedUrl = await getSignedUrl(
            this.s3Client, 
            command, 
            // if each part has 1 minute for their upload to begin, then give the completed url longer
            { expiresIn: expiration * 10} 
        )

        return {
            filePath: multipartParams.Key,
            fileKey: fileKey,
            partUrls: signedUrls.map((signedUrl, index) => {
                return {
                    url: signedUrl,
                    PartNumber: index + 1,
                }
            }),
            completedUrl: signedCompletedUrl
        };

    }

    encodeAndReplace(str) {
        str = Buffer.from(str).toString('base64');
        // replace invalid chars for URL
        str = str.replace('+', '-')
        str = str.replace('=', '_')
        str = str.replace('/', '~')
        return str;
    }

    createSignature(str) {
        let signatureSigner = crypto.createSign('RSA-SHA256');
        // signatureSigner.write(str);
        // signatureSigner.end();
        signatureSigner.update(str);
        let signature = signatureSigner.sign(Buffer.from(this.S3SecretKey).toString(), 'hex');
        // remove white spaces (tab/newline) from signature
        signature = signature.replace('\t', '')
        signature = signature.replace('\n', '')
        // signature = signature.replace(' ', '')
        let encodedSignature = this.encodeAndReplace(signature);
        return encodedSignature
    }
    createSignature2(str) {
        let signature = crypto.createHmac('sha1', this.S3SecretKey)
            .update(str)
            .digest('hex')
        return signature
    }
    async getDownloadData() {
        
        let policyJSON = {
            "Statement": [
                {
                    "Resource": `${this.s3Domain}:${this.s3Port}/${this.s3BucketName}/dir1/*`,
                    "Condition": {
                        "DateLessThan": { "AWS:EpochTime": 300 }
                    }
                }
            ]
        };
        let policy = JSON.stringify(policyJSON);
        console.log('stringified policy: ', policy);
        let encodedPolicy = this.encodeAndReplace(policy);
        console.log('encoded policy: ', encodedPolicy);

        let signature = this.createSignature2(policy);
        console.log('signature: ', signature);


        return {
            policy: encodedPolicy,
            signature: signature,
            accessKey: this.S3AccessKey
        }
    }

    async getDownloadData2() {
        // let headers = {
        //     "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        //     "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
        //     "X-Amz-Credential": "zzwv6u8Y5B5awSGB1K0t%2F20240919%2Fus-east-1%2Fs3%2Faws4_request",
        //     "X-Amz-Date": "20240919T145140Z",
        //     "X-Amz-Expires": "600",
        //     "X-Amz-Signature": "8d9c02f2222a5dcd25d8eae2f9346227c31f72ac9d415e08b3516b202c153ec1",
        //     "X-Amz-SignedHeaders": "host",
        //     // "partNumber": "1",
        //     // "uploadId": "Yjk1OWU0ZGMtN2FhOS00ODg2LWIxZTYtMGY2ZTg2NjgzZDJlLmFhODE3YTg3LWE1ZGYtNGRlOS05OTIxLTg1MTNjNTM0NGIxZngxNzI2NzU3NTAwMjQ0OTIxNjI2",
        //     // "x-id": "UploadPart"
        // }


    }

    async minioGetUrl(path) {
        const expires = 3600; // 1 hour

        const url = await this.minioClient.presignedGetObject(this.s3BucketName, path, expires); //`${path}/{*}`, expires);
        console.log('minio GET url: ', url);
        return url;
    }
}



helper = new Helper();


const app = express()
const port = 3000


app.use(cors())
app.use(express.json());

app.post('/test', (req, res) => {
    let data = helper.test();
    console.log('req keys: ', Object.keys(req))
    console.log('req body: ', req.body)
    res.send(data);
})

app.post('/upload-url', async (req, res) => {
    let reqData = req.body.data;

    
    let signedURLs = await helper.signUploadUrl(reqData.path, reqData.size, reqData.md5, reqData.type)

    // let data = helper.test();
    res.send(signedURLs);
})

app.post('/upload-url2', async (req, res) => {
    let reqData = req.body;
    console.log(reqData);
    
    let signedURLs = await helper.signUploadUrl2(reqData.path, reqData.sha256);

    // let data = helper.test();
    res.send(signedURLs[0]);
})

app.post('/multipart-upload', async (req, res) => {
    let reqData = req.body;
    console.log('reqData: ', reqData);
    let { 
        // "LAB_ID/PROJECT_ID/SAMPLE_ID"
        prefix, 
        // "any string" (may need to be have illegal characters stripped) (valid chars are: "!-_.*'()" and alphanumerics)
        fileName, 
        fileExt, 
        // // mime (content-type)
        // fileType,
        fileSize, 
        // entire file md5sum
        md5, 
        // size of chunk in bytes
        chunkSize, 
        // list of objects with md5sum and partNumber
        chunkMd5s 
    } = reqData;

    let multipartData = await helper.signMultipartUpload(fileName, fileExt, prefix, fileSize, md5, chunkSize, chunkMd5s);

    res.send(multipartData);


})

app.post('/download-url', async (req, res) => {
    let reqData = req.body;

    let data = await helper.signDownloadUrl(reqData.path);
    res.send({data: data});
})
app.post('/download-url2', async (req, res) => {
    let reqData = req.body;

    let data = await helper.minioGetUrl(reqData.path);
    res.send({data: data});
})

app.post('/get-download-data', async (req, res) => {
    // let reqData = req.body;
    let data = await helper.getDownloadData();
    res.send(data);
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})