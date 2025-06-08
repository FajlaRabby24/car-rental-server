const fs = require("fs");
const jsonData = fs.readFileSync("./firebase.private.key.json");

const base64 = Buffer.from(jsonData, "utf-8").toString("base64");
console.log(base64);
