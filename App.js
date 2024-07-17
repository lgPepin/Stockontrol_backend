const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const { Pool } = require("pg");

const db = new Pool({
  hostname: "localhost",
  user: "postgres",
  password: "lolo79",
  database: "Stockontrol_DB",
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api/get", (req, res) => {
  const sqlSelect = "SELECT * FROM products";
  db.query(sqlSelect, (err, result) => {
    res.send(result);
  });
});

app.post("/api/insert", (req, res) => {
  const productName = req.body.productName;
  const supplier = req.body.supplier;

  const sqlInsert =
    "INSERT INTO products (productname, supplier) VALUES ($1, $2)";
  db.query(sqlInsert, [productName, supplier], (err, result) => {
    console.log(result);
  });
});

app.put("/api/update", (req, res) => {
  const name = req.body.productname;
  const supplier = req.body.supplier;
  const sqlUpdate = "UPDATE products SET supplier = $1 WHERE productname = $2";
  db.query(sqlUpdate, [supplier, name], (err, result) => {
    if (err) console.log(err);
  });
});

app.delete("/api/delete/:productname", (req, res) => {
  const name = req.params.productname;
  const sqlDelete = "DELETE FROM products WHERE productname = $1";
  db.query(sqlDelete, [name], (err, result) => {
    if (err) console.log(err);
  });
});

app.listen(8080, () => {
  console.log("running on port 8080");
});
