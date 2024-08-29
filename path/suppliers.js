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
  const { searchSupplierName } = req.query;
  const formattedSearchSupplierName = `%${searchSupplierName || ""}%`;

  const sqlSelectByName = `
      SELECT s.supplier_id, s.supplier_name, s.identification_number, s.address, s.phone, s.contact_name, s.order_day, s.delivery_day, st.status
      FROM suppliers s
      JOIN status st ON s.status_id = st.status_id
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
  const supplierName = req.body.supplierName.toUpperCase();
  const identificationNumber = req.body.identificationNumber;
  const address = req.body.address;
  const phone = req.body.phone;
  const contactName = req.body.contactName;
  const orderDay = req.body.orderDay;
  const deliveryDay = req.body.deliveryDay;
  const statusId = req.body.statusId;

  if (
    !supplierName ||
    !identificationNumber ||
    !address ||
    !phone ||
    !contactName ||
    !orderDay ||
    !deliveryDay ||
    !statusId
  ) {
    return res.status(400).send("Todos los campos deben ser llenados");
  }

  const sqlInsert =
    "INSERT INTO suppliers (supplier_name, identification_number, address, phone, contact_name, order_day, delivery_day, status_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
  db.query(
    sqlInsert,
    [
      supplierName,
      identificationNumber,
      address,
      phone,
      contactName,
      orderDay,
      deliveryDay,
      statusId,
    ],
    (err, result) => {
      if (err) {
        console.error("Error en la execución del query", err.stack);
        return res.status(500).send("Error de creación del proveedor");
      }
      return res.status(200).send("Proveedor creado con éxito");
    }
  );
});

router.put("/update/:supplier_id", (req, res) => {
  const supplier_name = req.body.supplier_name.toUpperCase();
  const identification_number = req.body.identification_number;
  const address = req.body.address;
  const phone = req.body.phone;
  const contact_name = req.body.contact_name;
  const order_day = req.body.order_day;
  const delivery_day = req.body.delivery_day;
  const status_id = req.body.status_id;
  const supplier_id = req.params.supplier_id;

  if (
    !supplier_name ||
    !identification_number ||
    !address ||
    !phone ||
    !contact_name ||
    !order_day ||
    !delivery_day ||
    !status_id
  ) {
    return res.status(400).send("Todos los campos deben ser llenados.");
  }

  const sqlUpdate =
    "UPDATE suppliers SET supplier_name = $1, identification_number = $2, address = $3, phone = $4, contact_name = $5, order_day = $6, delivery_day = $7, status_id = $8 WHERE supplier_id = $9";
  db.query(
    sqlUpdate,
    [
      supplier_name,
      identification_number,
      address,
      phone,
      contact_name,
      order_day,
      delivery_day,
      status_id,
      supplier_id,
    ],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error en la actualización del proveedor");
      } else {
        res.status(200).send("El proveedor ha sido actualizado con éxito");
      }
    }
  );
});

router.patch("/update-products/:supplier_name", (req, res) => {
  const name = req.params.supplier_name;

  const sqlUpdateProducts = `
    UPDATE products
    SET supplier_id = (
      SELECT supplier_id 
      FROM suppliers 
      WHERE supplier_name = 'Proveedor no conocido'
    )
    WHERE supplier_id = (
      SELECT supplier_id 
      FROM suppliers 
      WHERE supplier_name = $1
    )
  `;

  db.query(sqlUpdateProducts, [name], (err, result) => {
    if (err) {
      console.error("Error al actualizar productos:", err);
      return res.status(500).send("Error al actualizar productos.");
    } else {
      return res.status(200).send({
        message: `Los productos asociados al proveedor ${name} han sido actualizados.`,
      });
    }
  });
});

router.delete("/delete/:supplier_name", (req, res) => {
  const name = req.params.supplier_name;
  const sqlDelete = "DELETE FROM suppliers WHERE supplier_name = $1";
  db.query(sqlDelete, [name], (err, result) => {
    if (err) {
      console.error("Error a la supresión del proveedor:", err);
      res.status(500).send("Error a la supresión del proveedor.");
    } else {
      res
        .status(200)
        .send({ message: `El proveedor ${name} ha sido eliminado con éxito!` });
    }
  });
});

module.exports = router;
