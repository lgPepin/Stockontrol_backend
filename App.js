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

const suppliers = require("./path/suppliers");
app.use("/api/v1/suppliers", suppliers);

app.get("/api/v1/get", (req, res) => {
  const { searchProductName, searchSupplier, searchCategory } = req.query;

  const sql = `
    SELECT p.product_id, p.product_name, p.category, p.stock, p.purchase_price, p.selling_price, p.status, s.supplier_name
    FROM products p
    JOIN suppliers s ON p.supplier_id = s.supplier_id
    WHERE (p.product_name ILIKE $1 OR $1 IS NULL)
    AND (s.supplier_name ILIKE $2 OR $2 IS NULL)
    AND (p.category ILIKE $3 OR $3 IS NULL)
  `;

  const params = [
    `%${searchProductName}%`,
    `%${searchSupplier}%`,
    `%${searchCategory}%`,
  ];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error a la recuperación de productos:", err);
      return res.status(500).send("Error a la recuperación de productos.");
    }
    res.json(result.rows);
  });
});

app.post("/api/v1/create", (req, res) => {
  const productName = req.body.productName;
  const supplierId = req.body.supplierId;
  const category = req.body.category;
  const stock = req.body.stock;
  const purchasePrice = req.body.purchasePrice;
  const sellingPrice = req.body.sellingPrice;
  const status = req.body.status;

  if (
    !productName ||
    !supplierId ||
    !category ||
    !stock ||
    !purchasePrice ||
    !sellingPrice ||
    !status
  ) {
    return res.status(400).send("Todos los campos deben ser llenados");
  }

  const sqlInsert = `
    INSERT INTO products (product_name, supplier_id, category, stock, purchase_price, selling_price, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;

  db.query(
    sqlInsert,
    [
      productName,
      supplierId,
      category,
      stock,
      purchasePrice,
      sellingPrice,
      status,
    ],
    (err, result) => {
      if (err) {
        console.error("Error a la creación del producto:", err);
        return res.status(500).send("EError a la creación del producto.");
      } else {
        res.status(201).send("Producto creado con éxito.");
      }
    }
  );
});

app.put("/api/v1/update/:product_id", (req, res) => {
  const {
    product_name,
    supplier_id,
    category,
    stock,
    purchase_price,
    selling_price,
    status,
  } = req.body;
  const product_id = req.params.product_id;

  if (
    !product_name ||
    !supplier_id ||
    !category ||
    !stock ||
    !purchase_price ||
    !selling_price ||
    !status
  ) {
    return res.status(400).send("Todos los campos deben ser llenados.");
  }

  const sqlUpdate =
    "UPDATE products SET product_name = $1, supplier_id = $2, category = $3, stock = $4, purchase_price = $5, selling_price = $6, status = $7 WHERE product_id = $8";
  db.query(
    sqlUpdate,
    [
      product_name,
      supplier_id,
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
        res.status(500).send("Error al actualizar el producto");
      } else {
        res.status(200).send("Producto actualizado con éxito");
      }
    }
  );
});

app.delete("/api/v1/delete/:product_name", (req, res) => {
  const name = req.params.product_name;
  const sqlDelete = "DELETE FROM products WHERE product_name = $1";

  db.query(sqlDelete, [name], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Error al eliminar el producto" });
    }
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res
      .status(200)
      .json({ message: `El Producto '${name}' ha sido eliminado con éxito` });
  });
});

app.get("/api/v1/list/suppliers", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT supplier_id, supplier_name FROM suppliers"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.listen(8080, () => {
  console.log("running on port 8080");
});
