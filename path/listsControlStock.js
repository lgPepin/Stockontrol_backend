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
  const { searchListControlStockName } = req.query;
  const formattedSearchListControlStockName = `%${
    searchListControlStockName || ""
  }%`;

  const sqlSelectByName = `
  SELECT 
  scl.stock_control_list_id, 
  scl.stock_control_list_name, 
  ARRAY_AGG(
    jsonb_build_object(
      'product_id', p.product_id,
      'product_name', p.product_name,
      'supplier_name', s.supplier_name,
      'category_name', c.category_name,
      'stock_system', pscl.stock_system,
      'stock_real', pscl.stock_real,
      'stock', p.stock,
      'purchase_price', p.purchase_price,
      'selling_price', p.selling_price,
      'status', ps.status  
    )
  ) AS products_info, 
  scl_status.status AS stock_control_list_status  
FROM 
  stock_control_lists scl
JOIN 
  products_stock_control_lists pscl 
  ON scl.stock_control_list_id = pscl.stock_control_list_id
JOIN 
  products p 
  ON pscl.product_id = p.product_id
JOIN 
  status ps 
  ON p.status_id = ps.status_id  
JOIN 
  status scl_status
  ON scl.status_id = scl_status.status_id  
JOIN 
  suppliers s
  ON p.supplier_id = s.supplier_id
JOIN 
  categories c
  ON p.category_id = c.category_id
WHERE 
  scl.stock_control_list_name ILIKE $1
GROUP BY 
  scl.stock_control_list_id, 
  scl.stock_control_list_name, 
  scl_status.status;
  `;

  db.query(
    sqlSelectByName,
    [formattedSearchListControlStockName],
    (err, result) => {
      if (err) {
        console.error(err);
        res
          .status(500)
          .send(
            "Un error ha ocurrido en el proceso de búsqueda de lista de control de stock."
          );
      } else {
        res.send(result.rows);
      }
    }
  );
});

router.post("/create", async (req, res) => {
  const { stockControlListName, products } = req.body;

  if (
    !stockControlListName ||
    !Array.isArray(products) ||
    products.length === 0
  ) {
    return res
      .status(400)
      .send("El nombre de la lista y la lista de productos son obligatorios.");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const insertListResult = await client.query(
      "INSERT INTO stock_control_lists (stock_control_list_name, status_id) VALUES ($1, (SELECT status_id FROM status WHERE status = 'No activada')) RETURNING stock_control_list_id",
      [stockControlListName]
    );

    const stockControlListId = insertListResult.rows[0].stock_control_list_id;

    const productStocks = await Promise.all(
      products.map(async (productId) => {
        const { rows } = await client.query(
          "SELECT stock FROM products WHERE product_id = $1",
          [productId]
        );
        return { productId, stock: rows[0]?.stock || 0 };
      })
    );

    const productValues = productStocks
      .map(
        ({ productId, stock }) =>
          `(${stockControlListId}, ${productId}, ${stock})`
      )
      .join(", ");
    const insertProductsQuery = `INSERT INTO products_stock_control_lists (stock_control_list_id, product_id, stock_system) VALUES ${productValues}`;

    await client.query(insertProductsQuery);

    await client.query("COMMIT");

    res.status(201).send({
      message: "Lista de control de stock creada con exito",
      stockControlListId,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al crear la lista de control de stock: ", err);
    res.status(500).send("Error al crear la lista de control de stock");
  } finally {
    client.release();
  }
});

router.put("/update/:stock_control_list_id", async (req, res) => {
  const { stockControlListName, products } = req.body;
  const stockControlListId = req.params.stock_control_list_id;

  if (
    !stockControlListName ||
    !Array.isArray(products) ||
    products.length === 0 ||
    products.some((productId) => !productId)
  ) {
    return res
      .status(400)
      .send("El nombre de la lista y la lista de productos son obligatorios.");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      "UPDATE stock_control_lists SET stock_control_list_name = $1 WHERE stock_control_list_id = $2",
      [stockControlListName, stockControlListId]
    );

    await client.query(
      "DELETE FROM products_stock_control_lists WHERE stock_control_list_id = $1",
      [stockControlListId]
    );

    const productStocks = await Promise.all(
      products.map(async (productId) => {
        if (!productId) return null;

        const { rows } = await client.query(
          "SELECT stock FROM products WHERE product_id = $1",
          [productId]
        );
        return { productId, stock: rows[0]?.stock || 0 };
      })
    );

    const validProductStocks = productStocks.filter(Boolean);

    const productValues = validProductStocks
      .map(
        ({ productId, stock }) =>
          `(${stockControlListId}, ${productId}, ${stock})`
      )
      .join(", ");

    if (productValues.length > 0) {
      const insertProductsQuery = `INSERT INTO products_stock_control_lists (stock_control_list_id, product_id, stock_system) VALUES ${productValues}`;
      await client.query(insertProductsQuery);
    }

    await client.query("COMMIT");

    res.status(200).send({
      message: "Lista de control de stock actualizada con éxito.",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error al actualizar la lista de control de stock:", err);
    res.status(500).send("Error al actualizar la lista de control de stock");
  } finally {
    client.release();
  }
});

router.delete("/delete/:stock_control_list_id", (req, res) => {
  const id = req.params.stock_control_list_id;

  const sqlSelect =
    "SELECT stock_control_list_name FROM stock_control_lists WHERE stock_control_list_id = $1";
  db.query(sqlSelect, [id], (err, result) => {
    if (err) {
      console.error("Error al buscar la lista de control de stock:", err);
      res.status(500).send("Error al buscar la lista de control de stock.");
    } else if (result.rows.length === 0) {
      res.status(404).send("La lista de control de stock no existe.");
    } else {
      const name = result.rows[0].stock_control_list_name;

      const sqlDelete =
        "DELETE FROM stock_control_lists WHERE stock_control_list_id = $1";
      db.query(sqlDelete, [id], (err, result) => {
        if (err) {
          console.error(
            "Error a la supresión de la lista de control de stock:",
            err
          );
          res
            .status(500)
            .send("Error a la supresión de la lista de control de stock.");
        } else {
          res.status(200).send({
            message: `La lista de control de stock ${name} ha sido eliminada con éxito!`,
          });
        }
      });
    }
  });
});

//-------------------------------------------------------------------------

// router.patch("/refreshList/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     // Récupération des produits associés à la liste de contrôle de stock
//     const productsResult = await db.query(
//       `SELECT p.product_id, p.stock AS product_stock, pscl.stock_system
//        FROM products p
//        JOIN products_stock_control_lists pscl
//        ON p.product_id = pscl.product_id
//        WHERE pscl.stock_control_list_id = $1 FOR UPDATE`,
//       [id]
//     );

//     // Comparer et mettre à jour stock_system
//     for (const product of productsResult.rows) {
//       if (product.stock_system !== product.product_stock) {
//         await db.query(
//           `UPDATE products_stock_control_lists
//            SET stock_system = $1
//            WHERE product_id = $2 AND stock_control_list_id = $3`,
//           [product.product_stock, product.product_id, id]
//         );
//       }
//     }

//     res.status(200).json({ message: "Quantités mises à jour avec succès." });
//   } catch (error) {
//     console.error("Erreur lors de la mise à jour des quantités :", error);
//     res.status(500).json({ message: "Erreur serveur." });
//   }
// });

router.patch("/activate/:id", async (req, res) => {
  const { id } = req.params;
  const newStatusName = "Activada";

  try {
    const statusResult = await db.query(
      "SELECT status_id FROM status WHERE status = $1",
      [newStatusName]
    );

    if (statusResult.rows.length === 0) {
      return res.status(404).json({ message: "Estado no encontrado." });
    }

    const newStatusId = statusResult.rows[0].status_id;

    const result = await db.query(
      `UPDATE stock_control_lists
       SET status_id = $1
       WHERE stock_control_list_id = $2
       RETURNING *`,
      [newStatusId, id]
    );

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res
        .status(404)
        .json({ message: "Lista de control de stock no encontrada." });
    }
  } catch (error) {
    console.error("Error al activar la lista de control de stock :", error);
    res.status(500).json({ message: "Error servidor." });
  }
});

//---------------------------------------------------------------------------------

router.patch("/cancel/:id", async (req, res) => {
  const { id } = req.params;
  const newStatusName = "No activada";

  try {
    const statusResult = await db.query(
      "SELECT status_id FROM status WHERE status = $1",
      [newStatusName]
    );

    if (statusResult.rows.length === 0) {
      return res.status(404).json({ message: "Estado no encontrado." });
    }

    const newStatusId = statusResult.rows[0].status_id;

    const result = await db.query(
      `UPDATE stock_control_lists
       SET status_id = $1
       WHERE stock_control_list_id = $2
       RETURNING *`,
      [newStatusId, id]
    );

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res
        .status(404)
        .json({ message: "Lista de control de stock no encontrada." });
    }
  } catch (error) {
    console.error(
      "Error al activacion de la lista de control de stock :",
      error
    );
    res.status(500).json({ message: "Error servidor." });
  }
});

router.put("/terminate/:list_id", async (req, res) => {
  const { list_id } = req.params;
  const { products } = req.body;

  console.log("Datos recibidos :", { list_id, products });

  try {
    await db.query("BEGIN");

    for (const product of products) {
      const { product_id, stock_real, control_date } = product;

      console.log("Actualizacion del stock para el producto :", {
        product_id,
        stock_real,
        control_date,
      });

      const formattedControlDate = new Date(control_date)
        .toISOString()
        .split("T")[0];

      await db.query(
        `UPDATE products_stock_control_lists
         SET stock_real = $1
         WHERE stock_control_list_id = $2 AND product_id = $3`,
        [stock_real, list_id, product_id]
      );

      const { rows: stockRows } = await db.query(
        `SELECT stock_system FROM products_stock_control_lists
         WHERE stock_control_list_id = $1 AND product_id = $2`,
        [list_id, product_id]
      );

      const stock_system = stockRows[0]?.stock_system;

      console.log("Comparacion stock_system y stock_real :", {
        stock_system,
        stock_real,
      });

      if (stock_system !== stock_real) {
        await db.query(
          `UPDATE products
           SET stock = $1, checked = $2
           WHERE product_id = $3`,
          [stock_real, formattedControlDate, product_id]
        );
      }
    }

    const { rows: statusRows } = await db.query(
      `SELECT status_id FROM status WHERE status = 'Terminada'`
    );
    const status_id = statusRows[0]?.status_id;

    await db.query(
      `UPDATE stock_control_lists
       SET status_id = $1
       WHERE stock_control_list_id = $2`,
      [status_id, list_id]
    );

    await db.query("COMMIT");

    res.status(200).json({ message: "la lista fue terminada exitosamente." });
  } catch (error) {
    await db.query("ROLLBACK");

    console.error("Error al actualizar el stock :", error);

    res.status(500).json({
      error: error.message || "Error al actualizar el stock.",
    });
  }
});

module.exports = router;
