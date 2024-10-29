const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const cors = require("cors");

const app = express();

const dbPath = path.join(__dirname, "edulab-backend.db");

let db = null;

app.use(express.json());
app.use(cors());

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.get("/document-type", async (req, res) => {
  const getDocumentsQuery = `
    SELECT * FROM document_type;
  `;
  const docArray = await db.all(getDocumentsQuery);
  res.send(docArray);
});

app.post("/document-type", async (req, res) => {
  const { documentName, type } = req.body;
  const addDocumentQuery = `
    INSERT INTO document_type (document_name, type) 
    VALUES (?, ?);
  `;
  try {
    await db.run(addDocumentQuery, [documentName, type]);
    res.send("Document Added Successfully");
  } catch (error) {
    res.status(500).json({
      error: true,
      message: "Failed to add document",
      details: error.message,
    });
  }
});

app.get("/document-fields", async (req, res) => {
  const { documentType } = req.query;

  if (!documentType) {
    return res.status(400).json({
      error: true,
      message: "Document type is required",
    });
  }

  try {
    // Convert documentType to table name format (e.g., "Health Care" to "health_care")
    const tableName = documentType.toLowerCase().replace(/\s+/g, "_");

    // First check if the table exists
    const tableExists = await db.get(
      `
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' AND name=?
    `,
      [tableName]
    );

    if (!tableExists) {
      return res.status(404).json({
        error: true,
        message: "Invalid document type",
      });
    }

    // Get field information from the table
    const fieldsQuery = `PRAGMA table_info(${tableName})`;
    const fields = await db.all(fieldsQuery);

    // Transform the result to match the previous format
    const formattedFields = fields.map((field) => ({
      field_id: field.cid + 1, // Adding 1 to match previous format where IDs started at 1
      field_name: field.name,
    }));

    res.json(formattedFields);
  } catch (error) {
    res.status(500).json({
      error: true,
      message: "Failed to fetch document fields",
      details: error.message,
    });
  }
});

app.post("/document-fields", async (req, res) => {
  const { documentType, field_name, field_type } = req.body;

  if (!documentType || !field_name || !field_type) {
    return res.status(400).json({
      error: true,
      message: "Please provide documentType, field_name, and field_type",
    });
  }

  try {
    const tableName = documentType.toLowerCase().replace(/\s+/g, "_");

    // Check if table exists
    const tableExists = await db.get(
      `
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' AND name=?
    `,
      [tableName]
    );

    if (!tableExists) {
      return res.status(404).json({
        error: true,
        message: "Invalid document type",
      });
    }

    // Add the new column to the table
    const alterTableQuery = `ALTER TABLE ${tableName} ADD COLUMN ${field_name} ${field_type}`;
    await db.run(alterTableQuery);

    res.json({
      error: false,
      message: `Field "${field_name}" added successfully to document type "${documentType}"`,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: "Failed to add field",
      details: error.message,
    });
  }
});

app.get("/export-data", async (req, res) => {
  const { documentType, exportType, selectedFields } = req.query;

  if (!documentType) {
    return res.status(400).json({
      error: true,
      message: "Document type is required",
    });
  }

  if (!exportType) {
    return res.status(400).json({
      error: true,
      message: "Export type is required",
    });
  }

  try {
    const tableName = documentType.toLowerCase().replace(/\s+/g, "_");
    const tableExists = await db.get(
      `SELECT name 
       FROM sqlite_master 
       WHERE type='table' AND name=?`,
      [tableName]
    );

    if (!tableExists) {
      return res.status(404).json({
        error: true,
        message: "Invalid document type",
      });
    }

    let fields = "*";
    if (selectedFields) {
      const fieldArray = selectedFields.split(",").map((field) => field.trim());
      const tableInfo = await db.all(`PRAGMA table_info(${tableName})`);
      const validFields = tableInfo.map((col) => col.name);

      const invalidFields = fieldArray.filter(
        (field) => !validFields.includes(field)
      );
      if (invalidFields.length > 0) {
        return res.status(400).json({
          error: true,
          message: `Invalid fields: ${invalidFields.join(", ")}`,
        });
      }

      fields = fieldArray.join(", ");
    }

    let query = "";
    switch (exportType) {
      case "all":
        query = `SELECT ${fields} FROM ${tableName}`;
        break;

      case "filtered":
        if (!selectedFields) {
          return res.status(400).json({
            error: true,
            message: "Selected fields are required for filtered export",
          });
        }
        query = `SELECT ${fields} FROM ${tableName}`;
        break;

      case "5records":
        query = `SELECT ${fields} FROM ${tableName} LIMIT 5`;
        break;

      case "template":
        const tableInfo = await db.all(`PRAGMA table_info(${tableName})`);
        let template;
        if (selectedFields) {
          const fieldArray = selectedFields
            .split(",")
            .map((field) => field.trim());
          template = tableInfo
            .filter((col) => fieldArray.includes(col.name))
            .map((col) => ({ [col.name]: "" }));
        } else {
          template = tableInfo.map((col) => ({ [col.name]: "" }));
        }
        return res.json({
          error: false,
          data: template,
        });

      default:
        return res.status(400).json({
          error: true,
          message: "Invalid export type",
        });
    }

    const data = await db.all(query);
    if (data.length === 0) {
      return res.json({
        error: false,
        message: "No data found",
        data: [],
      });
    }

    res.json({
      error: false,
      message: "Data exported successfully",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: "Internal server error",
      details: error.message,
    });
  }
});
