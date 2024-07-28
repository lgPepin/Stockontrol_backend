const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const db = new Pool({
  hostname: "localhost",
  user: "postgres",
  password: "lolo79",
  database: "Stockontrol_DB",
});

router.get("/get", (req, res) => {
  const { searchCategoryName } = req.query;
  const formattedSearchCategoryName = `%${searchCategoryName || ""}%`;

  const sqlSelectByName = `
      SELECT * FROM categories
      WHERE 
        category_name ILIKE $1
    `;

  db.query(sqlSelectByName, [formattedSearchCategoryName], (err, result) => {
    if (err) {
      console.error(err);
      res
        .status(500)
        .send("Un error ha ocurrido en el proceso de búsqueda de categoria.");
    } else {
      res.send(result.rows);
    }
  });
});

router.post("/create", (req, res) => {
  const categoryName = req.body.categoryName;

  if (!categoryName) {
    return res.status(400).send("Todos los campos deben ser llenados");
  }

  const sqlInsert = "INSERT INTO categories (category_name) VALUES ($1)";
  db.query(sqlInsert, [categoryName], (err, result) => {
    if (err) {
      console.error("Error en la execución del query", err.stack);
      return res.status(500).send("Error de creación de la categoria");
    }
    return res.status(200).send("Categoria creada con éxito");
  });
});

router.put("/update/:category_id", (req, res) => {
  const { category_name } = req.body;
  const category_id = req.params.category_id;

  if (!category_name) {
    return res.status(400).send("Todos los campos deben ser llenados.");
  }

  const sqlUpdate =
    "UPDATE categories SET category_name = $1 WHERE category_id = $2";
  db.query(sqlUpdate, [category_name, category_id], (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error en la actualización de la categoria");
    } else {
      res.status(200).send("La categoria ha sido actualizado con éxito");
    }
  });
});

router.delete("/delete/:category_name", (req, res) => {
  const name = req.params.category_name;
  const sqlDelete = "DELETE FROM categories WHERE category_name = $1";
  db.query(sqlDelete, [name], (err, result) => {
    if (err) {
      console.error("Error a la supresión de la categoria:", err);
      res.status(500).send("Error a la supresión de la categoria.");
    } else {
      res
        .status(200)
        .send({ message: `La categoria ${name} ha sido eliminada con éxito!` });
    }
  });
});

module.exports = router;
