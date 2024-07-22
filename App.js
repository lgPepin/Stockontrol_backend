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

// app.get("/api/get", (req, res) => {
//   const sqlSelect = "SELECT * FROM products";
//   db.query(sqlSelect, (err, result) => {
//     res.send(result);
//   });
// });

app.get("/api/get", (req, res) => {
  const { searchProductName, searchSupplier, searchCategory } = req.query;
  const formattedSearchProductName = `%${searchProductName || ""}%`;
  const formattedSearchSupplier = `%${searchSupplier || ""}%`;
  const formattedSearchCategory = `%${searchCategory || ""}%`;

  const sqlSelectByName = `
      SELECT * FROM products
      WHERE 
        (product_name ILIKE $1)
        AND (supplier ILIKE $2)
        AND (category ILIKE $3)
    `;

  db.query(
    sqlSelectByName,
    [
      formattedSearchProductName,
      formattedSearchSupplier,
      formattedSearchCategory,
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        res
          .status(500)
          .send("Un error ha ocurrido en el proceso de búsqueda de producto.");
      } else {
        res.send(result.rows);
      }
    }
  );
});

app.post("/api/insert", (req, res) => {
  const productName = req.body.productName;
  const supplier = req.body.supplier;
  const category = req.body.category;
  const stock = req.body.stock;
  const purchasePrice = req.body.purchasePrice;
  const sellingPrice = req.body.sellingPrice;
  const status = req.body.status;

  const sqlInsert =
    "INSERT INTO products (product_name, supplier, category, stock, purchase_price, selling_price, status) VALUES ($1, $2, $3, $4, $5, $6, $7)";
  db.query(
    sqlInsert,
    [
      productName,
      supplier,
      category,
      stock,
      purchasePrice,
      sellingPrice,
      status,
    ],
    (err, result) => {
      console.log(result);
    }
  );
});

app.put("/api/update/:product_id", (req, res) => {
  const {
    product_name,
    supplier,
    category,
    stock,
    purchase_price,
    selling_price,
    status,
  } = req.body;
  const product_id = req.params.product_id;

  const sqlUpdate =
    "UPDATE products SET product_name = $1, supplier = $2, category = $3, stock = $4, purchase_price = $5, selling_price = $6, status = $7 WHERE product_id = $8";
  db.query(
    sqlUpdate,
    [
      product_name,
      supplier,
      category,
      stock,
      purchase_price,
      selling_price,
      status,
      product_id,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erreur lors de la mise à jour du produit");
      } else {
        res.status(200).send("Produit mis à jour avec succès");
      }
    }
  );
});

app.delete("/api/delete/:product_name", (req, res) => {
  const name = req.params.product_name;
  const sqlDelete = "DELETE FROM products WHERE product_name = $1";
  db.query(sqlDelete, [name], (err, result) => {
    if (err) console.log(err);
  });
});

app.listen(8080, () => {
  console.log("running on port 8080");
});
