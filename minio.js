const Minio = require('minio')
const cors = require('cors')

var client = new Minio.Client({
    endPoint: 'localhost',
    port: 9000,
    region: 'us-east-1',
    useSSL: false,
    accessKey: 'zzwv6u8Y5B5awSGB1K0t',
    secretKey: 'c4V5dCXh208cfvqO5wLqOi2rlHy52cwbmGoKZBT8'
})

// Instantiate an `express` server and expose an endpoint called `/presignedUrl` as a `GET` request that
// accepts a filename through a query parameter called `name`. For the implementation of this endpoint,
// invoke [`presignedPutObject`](https://min.io/docs/minio/linux/developers/javascript/API.html#presignedPutObjectt) 
// on the `Minio.Client` instance to generate a pre-signed URL, and return that URL in the response:

// express is a small HTTP server wrapper, but this works with any HTTP server
const server = require('express')()
server.use(cors())
server.get('/presignedUrl', (req, res) => {
    let objectName = req.query.name;
    client.presignedPutObject('lab-data', objectName, 3600, (err, url) => {
        if (err) throw err
        res.end(url)
    })
})

server.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
})

server.listen(8080)