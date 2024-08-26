const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "lolo79",
  database: "Stockontrol_DB",
});

router.post("/loadSupplier", async (req, res) => {
  const suppliers = req.body; // Liste des fournisseurs avec leurs noms et statuts

  try {
    // Préparez une transaction
    await pool.query("BEGIN");

    // Insérez les fournisseurs, en utilisant status_id au lieu de status
    const insertSuppliers = suppliers.map(async (supplier) => {
      // Assurez-vous que le status fourni existe dans la table status
      const statusResult = await pool.query(
        "SELECT status_id FROM status WHERE status = $1",
        [supplier.status]
      );
      const statusId =
        statusResult.rows.length > 0 ? statusResult.rows[0].status_id : null;

      if (statusId) {
        await pool.query(
          `INSERT INTO suppliers (supplier_name, identification_number, address, phone, contact_name, order_day, delivery_day, status_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (supplier_name) DO NOTHING`,
          [
            supplier.supplier_name,
            supplier.identification_number || 0, // Valeur par défaut si non spécifiée
            supplier.address || "No existe data",
            supplier.phone || "No existe data",
            supplier.contact_name || "No existe data",
            supplier.order_day || "No existe data",
            supplier.delivery_day || "No existe data",
            statusId,
          ]
        );
      }
    });

    await Promise.all(insertSuppliers);

    // Commit la transaction
    await pool.query("COMMIT");

    res.status(201).send({ message: "Suppliers inserted successfully" });
  } catch (error) {
    // Rollback en cas d'erreur
    await pool.query("ROLLBACK");
    console.error(error);
    res.status(500).send({ message: "Error inserting suppliers" });
  }
});

router.get("/suppliersId", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM suppliers");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error retrieving suppliers" });
  }
});

router.post("/loadProduct", async (req, res) => {
  const products = req.body; // Liste des produits avec leurs supplier_id

  try {
    // Commencez une transaction
    await pool.query("BEGIN");

    // Obtenez ou créez la catégorie par défaut
    let defaultCategoryId;
    const defaultCategoryResult = await pool.query(
      "SELECT category_id FROM categories WHERE category_name = $1",
      ["No existe data"]
    );

    if (defaultCategoryResult.rows.length > 0) {
      defaultCategoryId = defaultCategoryResult.rows[0].category_id;
    } else {
      const insertCategoryResult = await pool.query(
        `INSERT INTO categories (category_name, created_by, created_at)
         VALUES ($1, $2, $3)
         RETURNING category_id`,
        ["No existe data", 1, new Date()] // Assurez-vous que created_by est un ID valide
      );
      defaultCategoryId = insertCategoryResult.rows[0].category_id;
    }

    // Préparez la requête d'insertion des produits
    const queryText = `
      INSERT INTO products (product_name, selling_price, purchase_price, stock, supplier_id, category_id, status_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    // Insérez les produits
    const insertProducts = products.map(async (product) => {
      // Assurez-vous que le status fourni existe dans la table status
      const statusResult = await pool.query(
        "SELECT status_id FROM status WHERE status = $1",
        [product.status]
      );
      const statusId =
        statusResult.rows.length > 0 ? statusResult.rows[0].status_id : null;

      if (!statusId) {
        throw new Error(`Status "${product.status}" not found`);
      }

      // Utilisez category_id ou defaultCategoryId
      const categoryId = product.category_id || defaultCategoryId;

      // Assurez-vous que les valeurs numériques ne sont pas vides ou incorrectes
      const sellingPrice = product.selling_price
        ? parseFloat(product.selling_price)
        : 0;
      const purchasePrice = product.purchase_price
        ? parseFloat(product.purchase_price)
        : 0;
      const stock = product.stock ? parseInt(product.stock, 10) : 0;

      return pool.query(queryText, [
        product.product_name,
        sellingPrice,
        purchasePrice,
        stock,
        product.supplier_id,
        categoryId,
        statusId,
      ]);
    });

    await Promise.all(insertProducts);

    // Commit de la transaction
    await pool.query("COMMIT");

    res.status(201).send({ message: "Products inserted successfully" });
  } catch (error) {
    // Rollback en cas d'erreur
    await pool.query("ROLLBACK");
    console.error(error);
    res.status(500).send({ message: "Error inserting products" });
  }
});

module.exports = router;
