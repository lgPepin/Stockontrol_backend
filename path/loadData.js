const express = require("express");
const router = express.Router();
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "lolo79",
  database: "Stockontrol_DB",
});

router.delete("/deleteSuppliers", async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const keepSupplierQuery =
      "SELECT supplier_id FROM suppliers WHERE supplier_name = $1";
    const keepSupplierResult = await client.query(keepSupplierQuery, [
      "Proveedor no conocido",
    ]);

    const idsToKeep = keepSupplierResult.rows.map((row) => row.supplier_id);

    const deleteStockControlListsQuery =
      "DELETE FROM products_stock_control_lists";
    await client.query(deleteStockControlListsQuery);

    const deleteProductsQuery = "DELETE FROM products";
    await client.query(deleteProductsQuery);

    if (idsToKeep.length > 0) {
      const deleteSuppliersQuery =
        "DELETE FROM suppliers WHERE supplier_id <> ALL($1::int[])";
      await client.query(deleteSuppliersQuery, [idsToKeep]);
    } else {
      const deleteSuppliersQuery = "DELETE FROM suppliers";
      await client.query(deleteSuppliersQuery);
    }

    await client.query("COMMIT");

    res.status(200).json({
      message:
        "Listas, productos y proveedores eliminados con éxito, excepto 'Proveedor no conocido'.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error.message);
    res.status(500).json({ error: "Error al suprimir los datos" });
  } finally {
    client.release();
  }
});

router.post("/insertSuppliers", async (req, res) => {
  const client = await pool.connect();

  try {
    const statusResult = await client.query(
      "SELECT status_id FROM status WHERE status = $1",
      ["Activo"]
    );
    if (statusResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Estado "Activo" no encontrado.' });
    }
    const activoStatusId = statusResult.rows[0].status_id;

    const categorias = req.body.categorias;

    const insertPromises = categorias.map((categoria) => {
      return client.query(
        "INSERT INTO suppliers (supplier_name, identification_number, address, phone, contact_name, order_day, delivery_day, status_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          categoria,
          0,
          "no hay datos",
          "no hay datos",
          "no hay datos",
          "no hay datos",
          "no hay datos",
          activoStatusId,
        ]
      );
    });

    await Promise.all(insertPromises);

    res.status(201).json({ message: "Proveedores insertados con éxito" });
  } catch (error) {
    console.error("Error al insertar los proveedores:", error);
    res.status(500).json({
      message: "Error del servidor al insertar los proveedores.",
    });
  } finally {
    client.release();
  }
});

router.post("/insertProducts", async (req, res) => {
  const client = await pool.connect();

  try {
    const statusResult = await client.query(
      "SELECT status_id FROM status WHERE status = $1",
      ["Activo"]
    );
    if (statusResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Estado "Activo" no encontrado.' });
    }
    const activoStatusId = statusResult.rows[0].status_id;

    const categoryResult = await client.query(
      "SELECT category_id FROM categories WHERE category_name = $1",
      ["No hay datos"]
    );
    if (categoryResult.rows.length === 0) {
      return res
        .status(404)
        .json({ message: 'Catégoría "No hay datos" no encontrada.' });
    }
    const noDataCategoryId = categoryResult.rows[0].category_id;

    const products = req.body.products;

    const insertPromises = products.map(async (product) => {
      const supplierResult = await client.query(
        "SELECT supplier_id FROM suppliers WHERE supplier_name = $1",
        [product.supplier_name]
      );
      if (supplierResult.rows.length === 0) {
        throw new Error(`Proveedor "${product.supplier_name}" no encontrado.`);
      }
      const supplierId = supplierResult.rows[0].supplier_id;

      const sanitizedProduct = {
        ...product,
        stock: product.stock || 0,
        purchase_price: product.purchase_price || 0.0,
        selling_price: product.selling_price || 0.0,
      };

      return client.query(
        "INSERT INTO products (product_name, supplier_id, category_id, stock, purchase_price, selling_price, status_id, from_search_page) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          sanitizedProduct.product_name,
          supplierId,
          noDataCategoryId,
          sanitizedProduct.stock,
          sanitizedProduct.purchase_price,
          sanitizedProduct.selling_price,
          activoStatusId,
          false,
        ]
      );
    });

    await Promise.all(insertPromises);

    res.status(201).json({ message: "Productos insertados con éxito" });
  } catch (error) {
    console.error("Error al insertar los productos :", error);
    res
      .status(500)
      .json({ message: "Error del servidor al insertar los productos." });
  } finally {
    client.release();
  }
});

module.exports = router;
