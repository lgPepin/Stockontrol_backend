const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const bcrypt = require("bcrypt");
const saltRounds = 10;

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
      SELECT u.user_id, u.username, u.user_lastname, u.user_firstname, r.role, st.status, u.password
      FROM users u
      JOIN status st ON u.status_id = st.status_id
      JOIN roles r ON u.role_id = r.role_id
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
  const userName = req.body.userName;
  const userLastName = req.body.userLastName;
  const userFirstName = req.body.userFirstName;
  const roleId = req.body.roleId;
  const statusId = req.body.statusId;
  const password = req.body.password;

  if (
    !userName ||
    !userLastName ||
    !userFirstName ||
    !roleId ||
    !statusId ||
    !password
  ) {
    return res.status(400).send("Todos los campos deben ser llenados");
  }

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    }

    const sqlInsert =
      "INSERT INTO users (username, user_lastname, user_firstname, role_id, status_id, password) VALUES ($1, $2, $3, $4, $5, $6)";
    db.query(
      sqlInsert,
      [userName, userLastName, userFirstName, roleId, statusId, hash],
      (err, result) => {
        if (err) {
          console.error("Error en la execución del query", err.stack);
          return res.status(500).send("Error de creación del usuario");
        }
        return res.status(200).send("Usuario creado con éxito");
      }
    );
  });
});

router.put("/update/:user_id", (req, res) => {
  const {
    username,
    user_lastname,
    user_firstname,
    role_id,
    status_id,
    password,
  } = req.body;
  const user_id = req.params.user_id;

  if (
    !username ||
    !user_lastname ||
    !user_firstname ||
    !role_id ||
    !status_id ||
    !password
  ) {
    return res.status(400).send("Todos los campos deben ser llenados.");
  }

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    }

    const sqlUpdate =
      "UPDATE users SET username = $1, user_lastname = $2, user_firstname = $3, role_id = $4, status_id = $5, password = $6 WHERE user_id = $7";

    db.query(
      sqlUpdate,
      [
        username,
        user_lastname,
        user_firstname,
        role_id,
        status_id,
        hash,
        user_id,
      ],
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

      res.status(200).send({
        message: `El usuario ${user.user_firstname} ${user.user_lastname} ha sido eliminado con éxito!`,
      });
    });
  });
});

//--------------------------------------------------------------------------------------------------------
//LOGIN

router.get("/login", (req, res) => {
  if (req.session.user) {
    res.send({ loggedIn: true, user: req.session.user });
  } else {
    res.send({ loggedIn: false });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Erreur lors de la déconnexion.");
    }
    res.clearCookie("connect.sid");
    res.send({ loggedIn: false });
  });
});

router.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  console.log("Username received:", username);
  console.log("Password received:", password);

  db.query(
    `
    SELECT u.*, r.role 
    FROM users u 
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.username = $1
  `,
    [username],
    (err, result) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.send({ err: err });
      }

      console.log("SQL query result:", result);

      if (result.rowCount > 0) {
        bcrypt.compare(password, result.rows[0].password, (error, response) => {
          if (response) {
            req.session.user = result;
            res.send(result);
          } else {
            res.send({ message: "Error en la combinación usuario/password" });
          }
        });
      } else {
        res.send({ message: "El usuario no existe" });
      }
    }
  );
});

//----------------------------------------------------------------------------------------------------
//REGISTRATION
router.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log(err);
    }
    db.query(
      "INSERT INTO users (username, user_lastname, user_firstname, role_id, status_id, password) VALUES ($1, $2, $3, $4, $5, $6)",
      [username, "Laurent", "Pepin", 1, 1, hash],
      (err, result) => {
        console.log(err);
      }
    );
  });
});

//---------------------------------------------------------------------------------------------------
module.exports = router;
