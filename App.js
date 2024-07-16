const express = require("express");
const app = express();
const { Pool } = require("pg");

const db = new Pool({
  hostname: "localhost",
  user: "postgres",
  password: "lolo79",
  database: "Stockontrol_DB",
});

app.get("/", (req, res) => {
  const sqlInsert =
    "INSERT INTO productos (nombre_producto, proveedor) VALUES ('producto1', 'Coca cola');";
  db.query(sqlInsert, (err, result) => {
    res.send("hello lolo");
  });
});

app.listen(8080, () => {
  console.log("running on port 8080");
});
