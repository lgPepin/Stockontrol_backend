const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const db = new Pool({
  hostname: "localhost",
  user: "postgres",
  password: "lolo79",
  database: "Stockontrol_DB",
});

router.get("/products/negativeStock", async (req, res) => {
  try {
    const { rows: products } = await db.query(
      `SELECT 
         p.product_id, 
         p.product_name, 
         p.stock,
         p.purchase_price,
         p.selling_price,
         p.checked,
         st.status,
         s.supplier_name, 
         c.category_name
       FROM products p
       LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
       LEFT JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN status st ON p.status_id = st.status_id
       WHERE p.stock < 0`
    );
    res.status(200).json(products);
  } catch (error) {
    console.error("Error al recuperar los productos :", error);
    res.status(500).json({
      error: "Error al recuperar los productos.",
    });
  }
});

module.exports = router;
