const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const db = new Pool({
  hostname: "localhost",
  user: "postgres",
  password: "lolo79",
  database: "Stockontrol_DB",
});

// router.get("/", (req, res) => {
//   res.status(200).json({ message: "Tous les fournisseurs" });
// });

// router.get("/:id", (req, res) => {
//   req.params.id;
//   res.status(200).json({
//     id: req.params.id,
//   });
// });

router.get("/get", (req, res) => {
  const { searchSupplierName } = req.query;
  const formattedSearchSupplierName = `%${searchSupplierName || ""}%`;

  const sqlSelectByName = `
      SELECT * FROM suppliers
      WHERE 
        supplier_name ILIKE $1
    `;

  db.query(sqlSelectByName, [formattedSearchSupplierName], (err, result) => {
    if (err) {
      console.error(err);
      res
        .status(500)
        .send("Un error ha ocurrido en el proceso de búsqueda de proveedor.");
    } else {
      res.send(result.rows);
    }
  });
});

router.post("/create", (req, res) => {
  const supplierName = req.body.supplierName;

  if (!supplierName) {
    return res.status(400).send("Supplier name is required");
  }

  const sqlInsert = "INSERT INTO suppliers (supplier_name) VALUES ($1)";
  db.query(sqlInsert, [supplierName], (err, result) => {
    if (err) {
      console.error("Error executing query", err.stack);
      return res.status(500).send("Error creating supplier");
    }
    return res.status(200).send("Supplier created successfully");
  });
});

router.put("/update/:supplier_id", (req, res) => {
  const { supplier_name } = req.body;
  const supplier_id = req.params.supplier_id;

  const sqlUpdate =
    "UPDATE suppliers SET supplier_name = $1 WHERE supplier_id = $2";
  db.query(sqlUpdate, [supplier_name, supplier_id], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Erreur lors de la mise à jour du produit");
    } else {
      res.status(200).send("Produit mis à jour avec succès");
    }
  });
});

router.delete("/delete/:supplier_name", (req, res) => {
  const name = req.params.supplier_name;
  const sqlDelete = "DELETE FROM suppliers WHERE supplier_name = $1";
  db.query(sqlDelete, [name], (err, result) => {
    if (err) {
      console.error("Error deleting supplier:", err);
      res.status(500).send("Erreur lors de la suppression du fournisseur.");
    } else {
      res
        .status(200)
        .send({ message: `Le fournisseur ${name} a été éliminé avec succès!` });
    }
  });
});

module.exports = router;
