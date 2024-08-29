const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const { Pool } = require("pg");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const db = new Pool({
  hostname: "localhost",
  user: "postgres",
  password: "lolo79",
  database: "Stockontrol_DB",
});

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    key: "userId",
    secret: "HopDoplAsticot1509",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: 60 * 60 * 12 * 1000,
    },
  })
);

const suppliers = require("./path/suppliers");
app.use("/api/v1/suppliers", suppliers);
const categories = require("./path/categories");
app.use("/api/v1/categories", categories);
const users = require("./path/users");
app.use("/api/v1/users", users);
const listControlStock = require("./path/listsControlStock");
app.use("/api/v1/listsControlStock", listControlStock);
const listNegativeStock = require("./path/listNegativeStock");
app.use("/api/v1/listNegativeStock", listNegativeStock);
const loadData = require("./path/loadData");
app.use("/api/v1/loadData", loadData);

app.get("/api/v1/get", (req, res) => {
  const {
    searchProductName = "",
    searchSupplier = "",
    searchCategory = "",
  } = req.query;

  const sql = `
    SELECT p.product_id, p.product_name, c.category_name, p.stock, p.purchase_price, p.selling_price, st.status, s.supplier_name, p.checked
    FROM products p
    JOIN suppliers s ON p.supplier_id = s.supplier_id
    JOIN categories c ON p.category_id = c.category_id
    JOIN status st ON p.status_id = st.status_id
    WHERE (p.product_name ILIKE $1)
    AND (s.supplier_name ILIKE $2)
    AND (c.category_name ILIKE $3)
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
  const productName = req.body.productName.toUpperCase();
  const supplierId = req.body.supplierId;
  const categoryId = req.body.categoryId;
  const stock = req.body.stock;
  const purchasePrice = req.body.purchasePrice;
  const sellingPrice = req.body.sellingPrice;
  const statusId = req.body.statusId;

  if (
    !productName ||
    !supplierId ||
    !categoryId ||
    !stock ||
    !purchasePrice ||
    !sellingPrice ||
    !statusId
  ) {
    return res.status(400).send("Todos los campos deben ser llenados");
  }

  const sqlInsert = `
    INSERT INTO products (product_name, supplier_id, category_id, stock, purchase_price, selling_price, status_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;

  db.query(
    sqlInsert,
    [
      productName,
      supplierId,
      categoryId,
      stock,
      purchasePrice,
      sellingPrice,
      statusId,
    ],
    (err, result) => {
      if (err) {
        console.error("Error a la creación del producto:", err);
        return res.status(500).send("Error a la creación del producto.");
      } else {
        res.status(201).send("Producto creado con éxito.");
      }
    }
  );
});

app.put("/api/v1/update/:product_id", (req, res) => {
  const product_name = req.body.product_name.toUpperCase();
  const supplier_id = req.body.supplier_id;
  const category_id = req.body.category_id;
  const stock = req.body.stock;
  const purchase_price = req.body.purchase_price;
  const selling_price = req.body.selling_price;
  const status_id = req.body.status_id;
  const product_id = req.params.product_id;

  if (
    !product_name ||
    !supplier_id ||
    !category_id ||
    !stock ||
    !purchase_price ||
    !selling_price ||
    !status_id
  ) {
    return res.status(400).send("Todos los campos deben ser llenados.");
  }

  const sqlUpdate =
    "UPDATE products SET product_name = $1, supplier_id = $2, category_id = $3, stock = $4, purchase_price = $5, selling_price = $6, status_id = $7 WHERE product_id = $8";
  db.query(
    sqlUpdate,
    [
      product_name,
      supplier_id,
      category_id,
      stock,
      purchase_price,
      selling_price,
      status_id,
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

app.delete("/api/v1/delete/:product_id", (req, res) => {
  const id = parseInt(req.params.product_id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ message: "Invalid product ID" });
  }

  const sqlSelect = "SELECT product_name FROM products WHERE product_id = $1";
  db.query(sqlSelect, [id], (err, selectResult) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .json({ message: "Error al recuperar el producto" });
    }

    if (selectResult.rowCount === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const productName = selectResult.rows[0].product_name;

    const sqlDelete = "DELETE FROM products WHERE product_id = $1";
    db.query(sqlDelete, [id], (err, deleteResult) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .json({ message: "Error al eliminar el producto" });
      }

      res.status(200).json({
        message: `El Producto '${productName}' ha sido eliminado con éxito`,
      });
    });
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

app.get("/api/v1/list/categories", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT category_id, category_name FROM categories"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get("/api/v1/list/statuses", async (req, res) => {
  try {
    const result = await db.query("SELECT status_id, status FROM status");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get("/api/v1/list/roles", async (req, res) => {
  try {
    const result = await db.query("SELECT role_id, role FROM roles");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.get("/api/v1/checkName", async (req, res) => {
  const { name } = req.query;

  console.log("Checking name:", name);

  try {
    const result = await db.query(
      "SELECT COUNT(*) FROM stock_control_lists WHERE LOWER(REGEXP_REPLACE(stock_control_list_name, '\\s+', '', 'g')) = LOWER(REGEXP_REPLACE($1, '\\s+', '', 'g'))",
      [name]
    );

    const count = parseInt(result.rows[0].count, 10);

    if (count > 0) {
      return res.status(200).json({ isUnique: false });
    } else {
      return res.status(200).json({ isUnique: true });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.get("/api/v1/checkNameUpdate", async (req, res) => {
  const { name, excludeId } = req.query;

  console.log("Checking name:", name);
  console.log("Excluding ID:", excludeId);

  try {
    const query = `
      SELECT COUNT(*) 
      FROM stock_control_lists 
      WHERE LOWER(REGEXP_REPLACE(stock_control_list_name, '\\s+', '', 'g')) = LOWER(REGEXP_REPLACE($1, '\\s+', '', 'g'))
      AND stock_control_list_id != $2
    `;

    const result = await db.query(query, [name, excludeId]);

    const count = parseInt(result.rows[0].count, 10);

    if (count > 0) {
      return res.status(200).json({ isUnique: false });
    } else {
      return res.status(200).json({ isUnique: true });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

app.listen(8080, () => {
  console.log("running on port 8080");
});
