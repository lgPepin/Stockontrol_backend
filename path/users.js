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
  const { searchUserLastName } = req.query;
  const formattedSearchUserLastName = `%${searchUserLastName || ""}%`;

  const sqlSelectByName = `
      SELECT * FROM users
      WHERE 
        user_lastname ILIKE $1
    `;

  db.query(sqlSelectByName, [formattedSearchUserLastName], (err, result) => {
    if (err) {
      console.error(err);
      res
        .status(500)
        .send("Un error ha ocurrido en el proceso de búsqueda de usuario.");
    } else {
      res.send(result.rows);
    }
  });
});

router.post("/create", (req, res) => {
  const userLastName = req.body.userLastName;
  const userFirstName = req.body.userFirstName;
  const role = req.body.role;
  const status = req.body.status;

  if (!userLastName || !userFirstName || !role || !status) {
    return res.status(400).send("Todos los campos deben ser llenados");
  }

  const sqlInsert =
    "INSERT INTO users (user_lastname, user_firstname, role, status) VALUES ($1, $2, $3, $4)";
  db.query(
    sqlInsert,
    [userLastName, userFirstName, role, status],
    (err, result) => {
      if (err) {
        console.error("Error en la execución del query", err.stack);
        return res.status(500).send("Error de creación del usuario");
      }
      return res.status(200).send("Usuario creado con éxito");
    }
  );
});

router.put("/update/:user_id", (req, res) => {
  const { user_lastname, user_firstname, role, status } = req.body;
  const user_id = req.params.user_id;

  if (!user_lastname || !user_firstname || !role || !status) {
    return res.status(400).send("Todos los campos deben ser llenados.");
  }

  const sqlUpdate =
    "UPDATE users SET user_lastname = $1, user_firstname = $2, role = $3, status = $4 WHERE user_id = $5";
  db.query(
    sqlUpdate,
    [user_lastname, user_firstname, role, status, user_id],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error en la actualización del usuario");
      } else {
        res.status(200).send("El usuario ha sido actualizado con éxito");
      }
    }
  );
});

router.delete("/delete/:user_id", (req, res) => {
  const userId = req.params.user_id;

  const sqlSelect =
    "SELECT user_firstname, user_lastname FROM users WHERE user_id = $1";
  db.query(sqlSelect, [userId], (err, result) => {
    if (err) {
      console.error("Error en la búsqueda del usuario:", err);
      return res.status(500).send("Error en la búsqueda del usuario.");
    }

    if (result.rows.length === 0) {
      return res.status(404).send("Usuario no encontrado.");
    }

    const user = result.rows[0];

    const sqlDelete = "DELETE FROM users WHERE user_id = $1";
    db.query(sqlDelete, [userId], (err, result) => {
      if (err) {
        console.error("Error a la supresión del usuario:", err);
        return res.status(500).send("Error a la supresión del usuario.");
      }

      res
        .status(200)
        .send({
          message: `El usuario ${user.user_firstname} ${user.user_lastname} ha sido eliminado con éxito!`,
        });
    });
  });
});

module.exports = router;
