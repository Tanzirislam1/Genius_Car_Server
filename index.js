const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000;

//  middleware 
app.use(cors())
/* amra client theke json k pathai server e response kori amra json k database e pathabo tai amra ai middleware ta diye rakhse nh hole error dibe amader json data ta k khuje pabe nh... */
app.use(express.json())

/* verify jwt token (middletare) */
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' }) // unAuthorized status 401 access server address bar e query search kore user email dile data nh diye ai message show korbe
    }
    /* amra authHeader(' ') k split kortase ter moddhe empty string dise amra order.js er moddhe axios use kore headers property er moddhe amra authorization property er moddhe amra `` dynamic vabe 1st e Bearer likhse terpor locaStorage e token ta k getItem korse ai Bearer likhar jonne amra authHeader er upor split(' ') korse 1st e split er moddhe string ' ' aita use kortase Bearer likhar jonne terpor amra [1] index ta k nitase karon amra Bearer likhar por token ta k access getItem kortase ai Bearer likhar karone amra split()  kortase aivabe token access kortase terpor amra jwt.verify() kortase verfy er moddhe 1st perameter e token , 2nd privateKey , 3rd e amra (error, decoded) ai perameter nitase terpor condition kortase jodi error hoy tahole status set kortase forbiden er jodi error nh hoy tahole amra token ta k pabo decoded er moddhe amra console kore check korbo er ai req.decoded req theke decoded k pitase abar decoded theke email k amra '/order' api e niye jacchi terpor condition apply kortase amader email === decoded theke jei email paitase oi jodi same hoy ter moddhe amra find er kaj kortase... */
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        /* if jodi error hoy tahole status 403 forbiden er error nh hole console kortase decoded k */
        if (err) {
            return res.status(403).send({ message: 'Forbiden access' }); // forbiden status 403
        }
        console.log('decoded', decoded);
        /* req.decoded = decoded => aita kore amra '/order' theke amra decoded ta k access korte parbo req.decoded.email amra email ta k access korbo...terpor condition apply korbo if(email === decoded) jodi amader user email and amader verifytokenemail (decoded) jodi same hoy tahole amra if condition er moddhe find er kajta set korbo and res.send() keo set korbo ter else{} er moddhe akta status set kore dibo... */
        req.decoded = decoded;
        /* function er vitor next() use korte hbe bahire next() korle error dibe jodi amrader verify thik vabe hoy and decoded k amra pai tahole amra next() e jabo mne shob thik thakle amra next e jabo...normally amra verify er kaj nh hole next e jaboi nh */
        next();
    })
    // console.log('inside verifyJWT', authHeader);
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z4aagjz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//     const collection = client.db("test").collection("devices");
//     console.log('DB Connected');
//     // perform actions on the collection object
//     client.close();
// });


async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('geniusCar').collection('service');

        /* amader jodi new collection lage tahole amra database theke new database and collection k create korbo nh amra jodi amra aikhane new collection create kori tahole database e auto create hoye jabe... */
        const orderCollection = client.db('geniusCar').collection('order');

        // AUTH (jwt)
        app.post('/login', async (req, res) => {
            const user = req.body;
            /* token-Access : amra jwt.sign() korbo terpor amra 1st e user ta req.body theke set korbo , terpor amra secret ba privateKey take nibo process.env.ACCESS_TOKEN_SECRET .env theke token-name set korbo , terpor amra akta option diye pari exprire er time ta set korbo expireIn property er moddhe '1d' aivabe amra expire time set kore dibo... */
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })

        /* get all data form '/service' Route API : amra find() kore data ta k access kortase and amra app.get() er moddhe route set kore async function use kore karon amra await er kajta korbo tai find() er kajta korbo CRUD code hints niye...(data load korar jonne app.get kora hoy) */
        app.get('/service', async (req, res) => {
            const query = {};

            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        /* get single data set service route with route-perameter */
        app.get('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            /* single data access korar jonne cursor kora lagbe nh...amra query er upor findOne() kore data access korbo... */
            const service = await serviceCollection.findOne(query);
            res.send(service);
        })

        // POST add data on server (data add korar jonne app.post() kora hoy) : amra client side theke POST method kore data k body er moddhe pathacchi and amra ai server side theke amra app.post kore req.body theke access kore inserOne kore single  database e pathacchi...
        app.post('/service', async (req, res) => {
            const newService = req.body;
            const result = await serviceCollection.insertOne(newService);
            res.send(result);
        });

        // DELETE 
        app.delete('/service/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await serviceCollection.deleteOne(query);
            res.send(result);
        });

        // order collection API

        /* get order details data with query search */
        app.get('/order', verifyJWT, async (req, res) => {
            /* create-token and check: amra server er moddhe 1st e jsonwebtoken k require korbo terpor amra terminal er moddhe amra nodo likhe enter dibo amader node er moddhe command dayoar system e niye jabe terpor amra require('crypto').randomBytes(64).toString('hex) ai code ta likhe enter dile amader token dibe terpor amra '/login' api create kore jwt.sign() kortase then client side e axios use kore get kore amra url set kortase terpor , diye amra headers er moddhe amra authorization property niye `` dynamic vabe local storage e token ta k getItem() kore nitase terpor amra aikhane const authHeader = req.headers.authorization; request er headers theke authorization ta k akta var er moddhe nitase and console kortase authHeader k then amra website e order page tah k reload diye local storage er moddhe token ta k pacchi kina sheita check kortase...check korar por amra authHeader er kajta amra upore middletare verifyJWT function er moddhe niye jacchi....   */
            const decoded = req.decoded.email;
            /* amra order.js theke amra url er moddhe search query use kore amra email tah k set korse and amra aikhane req.query.email theke amra email tah k nitase amra query variable er moddhe {email: email} eivabe o korte pari abr email variable keo pathaya dite pari find() er moddhe..  */
            const email = req.query.email;
            // console.log(email);
            /* query : amra 1st e req.query theke amra email k nitase then amra query var er moddhe email: field er moddhe amra email ta k pathacchi.. ai email field er moddhe email value jer jer kase ase mne jei order data er moddhe jei email ase shei email onojai take ter order gulo dibe...  */

            if (email === decoded) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();
                res.send(orders);
            }
            else{
                res.status(403).send({message: 'forbidden access'})
            }

        });

        /* order details send in database */
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

    }

    finally {

    }
}

run().catch(console.dir);

app.get('/hero', (req, res) => {
    res.send('Hero Meets heroku')
});

app.get('/', (req, res) => {
    res.send('Running Genius Car Server')
});

app.listen(port, () => {
    console.log('Listening to port', port);
});