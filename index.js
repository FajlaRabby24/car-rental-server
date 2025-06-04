const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const admin = require("firebase-admin");
const serviceAccount = require("./firebase.private.key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

const verifyToken = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unAuthorized access" });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded;
    next();
  } catch (error) {
    res.status(401).send({ message: "unAuthorized access" });
  }
};

const uri = `mongodb://localhost:27017`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    const database = client.db("Car-Rental");
    const carCollection = database.collection("cars");

    app.post("/add-car", verifyToken, async (req, res) => {
      const email = req.query.email;
      const tokenEamil = await req?.tokenEmail?.email;
      if (email !== tokenEamil) {
        res.status(403).send({ message: "forbidden access!" });
      }
      const newCar = req.body;
      const result = await carCollection.insertOne(newCar);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment.");
  } finally {
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port, () => console.log(`server is running on port ${port}`));
