const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden' })
        }
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.se5ap.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const collection = client.db('power-hack').collection('billing-list');


        app.post('/login', (req, res) => {
            const user = req.body;
            console.log(user);

            if (user.email === 'user@gmail.com' && user.password === '123456') {
                const accessToken = jwt.sign({
                    email: user.email
                },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '2h' })
                res.send({
                    success: true,
                    accessToken: accessToken
                })
            }
            else {
                res.status(401).send({ success: false });
            }
        })
        app.post('/registration', (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })

        app.get('/billing-list', async (req, res) => {
            // console.log('query', req.query);
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);

            const query = {};
            const cursor = collection.find(query);
            let products;
            if (page || size) {

                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }

            res.send(products);
        });

        app.get('/productCount', async (req, res) => {
            const count = await collection.estimatedDocumentCount();
            res.send({ count });
        });

        // use post to get products by ids
        app.post('/productByKeys', async (req, res) => {
            const keys = req.body;
            const ids = keys.map(id => ObjectId(id));
            const query = { _id: { $in: ids } }
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            console.log(keys);
            res.send(products);
        })

        // const email = req.params.id;
        // const user = req.body;
        // const filter = { email: email };
        // const options = { upsert: true };
        // const updateDoc = {
        //     $set: user,
        // };
        // const result = await collection.updateOne(filter, updateDoc, options);
        // const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' })
        // res.send({ result, token });
        app.put('/update-billing/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            //     const options = { upsert: true };
            //     const updateDoc = {
            //     $set: user,
            // };
            const result = await collection.updateOne(filter);
            res.send(result)
        })
        app.post("/add-billing", verifyJWT, async (req, res) => {
            const result = await collection.insertOne(req.body);
            res.send(result);
        });
        app.get('/billing-list', async (req, res) => {
            const result = await collection.find().toArray();
            res.send(result);
        })
        app.delete("/delete-billing/:id/", verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await collection.deleteOne(filter);
            res.send(result);
        })

    }
    finally {

    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Power Hack is running!')
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});