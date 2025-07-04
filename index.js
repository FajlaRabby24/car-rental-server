const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SECRED_KEY, "base64").toString(
  "utf-8"
);
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middleware
app.use(cors());
app.use(express.json());

// verifyToken
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

// validate email
const validateEmal = async (req, res, next) => {
  const email = req?.query?.email;
  const tokenEamil = await req?.tokenEmail?.email;
  if (email !== tokenEamil) {
    return res.status(403).send({ message: "forbidden access!" });
  }
  req.email = email;
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hc2cnk7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// const uri = `mongodb://localhost:27017`;

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
    const bookingCollection = database.collection("bookings");

    // recent list
    app.get("/recent-list", async (req, res) => {
      const cars = (await carCollection.find().toArray()).sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      const recentCars = cars.slice(0, 8);
      res.send(recentCars);
    });

    // add card
    app.post("/add-car", verifyToken, validateEmal, async (req, res) => {
      const newCar = req.body;
      const result = await carCollection.insertOne(newCar);
      res.send(result);
    });

    // my car
    app.get("/my-cars", verifyToken, validateEmal, async (req, res) => {
      const query = { owner: req.email };
      const result = await carCollection.find(query).toArray();
      res.send(result);
    });

    // update car
    app.put("/update-car/:id", async (req, res) => {
      const id = req.params.id;
      const updateCar = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: updateCar,
      };
      const result = await carCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    // delete car
    app.delete("/delete-car/:id", async (req, res) => {
      const id = req.params.id;
      const result = await carCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // availables car
    app.get("/available-cars", async (req, res) => {
      const query = {
        availability: `available`,
      };
      const result = await carCollection.find(query).toArray();
      res.send(result);
    });

    // car details
    app.get("/car/:id", async (req, res) => {
      const id = req.params.id;
      const result = await carCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // booking
    app.post("/booking/:id", verifyToken, validateEmal, async (req, res) => {
      const carId = req.params.id;
      const newBooking = req.body;
      const filter = { _id: new ObjectId(carId) };
      const updatedDoc = {
        $inc: {
          bookingCount: 1,
        },
      };
      const car = await carCollection.updateOne(filter, updatedDoc);

      // result
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });

    // my-booking page data
    app.get("/my-bookings", verifyToken, validateEmal, async (req, res) => {
      // result
      const result = await bookingCollection
        .find({ email: req.email })
        .toArray();
      res.send(result);
    });

    // update booking info
    app.patch(
      "/update-booking/:id",
      verifyToken,
      validateEmal,
      async (req, res) => {
        const id = req.params.id;
        const { startDate, endDate, totalPrice } = req.body;

        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: { startDate, endDate, totalPrice },
        };

        const result = await bookingCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    // update booking status
    app.put("/booking-cancel/:id", async (req, res) => {
      const id = req.params.id;
      const updatedCar = req.body;

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: updatedCar,
      };
      const result = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // car search
    app.get("/car", async (req, res) => {
      const searchQuery = req.query?.search;
      const result = await carCollection
        .find({
          model: {
            $regex: new RegExp(searchQuery, "i"), // "i" => case-insensitive
          },
        })
        .toArray();
      res.send(result);
    });
  } finally {
  }
};
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("hello world");
});

app.listen(port, () => console.log(`server is running on port ${port}`));
