// import * as AWS from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const AWS = require('@aws-sdk/client-s3');
const signer = require('@aws-sdk/s3-request-presigner');
const getSignedUrl = signer.getSignedUrl;

export class Helper {
    S3AccessKey = 'zzwv6u8Y5B5awSGB1K0t';
    S3SecretKey = 'c4V5dCXh208cfvqO5wLqOi2rlHy52cwbmGoKZBT8';
    s3BucketName = 'lab-data';

    constructor() {
        this.s3Client = new AWS.S3({
            region: "us-east-1",
            endpoint: `${s3Domain}:${s3Port}`,
            tls: true,
            // s3ForcePathStyle: true,
            forcePathStyle: true, //prevents sdk from using bucketName as subDomain
            credentials: {
                accessKeyId: S3AccessKey,
                secretAccessKey: S3SecretKey
            },
        });
    }

    test(){
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
        // isMultiUpload: boolean = false
    ){
        let expiration = 60; // number of seconds after signing (now) till signature expires

        // if (Object.keys(md5Sums).length > 1) {
        // if (isMultiUpload) {
        if (fileSize > 5000000000) {
            let command = new AWS.CreateMultipartUploadCommand({
                Bucket: s3BucketName,
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
                        Bucket: s3BucketName,
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
        //     { bucket: s3BucketName },
        //     { key: fileKey },
        //     { "Content-MD5": fileMD5 },
        //     [ "content-length-range", 1024, 5242880 ], // file size limit 1KB-5MB
        //     [ "starts-with", "$Content-Type", "image/" ] // only support file of content-type: "image/jpg, image/png, image/gif"
        // ];
        // const Fields = { "Content-MD5": fileMD5 }

        let command = new AWS.PutObjectCommand({
            Bucket: s3BucketName,
            Key: filePath,
            // TODO: establish how single md5 sum would be given
            ChecksumSHA256: md5Sums['0'], 
        });
        const presignedURL = await getSignedUrl(this.s3Client, command, {
            expiresIn: expiration,
            // Set of all x-amz-* headers you wish to have signed
            unhoistableHeaders: new Set(["x-amz-checksum-sha256"]),
            // if PUT, include md5 in unhoistable? or require client to include in headers. or send back headers for client to use
            
        });
        return [presignedURL];
            
    }

    async signDownloadUrl(filePath) {

        // make conditions?
        // TODO: establish how directory access signatures would be handled

        let command = new AWS.GetObjectCommand({
            Bucket: s3BucketName, // use bucketName instead?
            Key: filePath,
        })
            
        
        const presignedURL = await getSignedUrl(this.s3Client, command, {
            expiresIn: 300, // 5 min
            // Set of all x-amz-* headers you wish to have signed
            unhoistableHeaders: new Set(["x-amz-checksum-sha256"]),
            // if PUT, include md5 in unhoistable? or require client to include in headers. or send back headers for client to use
            
        });
    }

    async completeMultiPartUpload(completedData){

        const completeMultipartUploadCommand = new AWS.CompleteMultipartUploadCommand(completedData);
                
        let awsRes = await this.s3Client.send(completeMultipartUploadCommand);
        return awsRes;
    }

}
