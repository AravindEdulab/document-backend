const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
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
    INSERT INTO document_type (document_name, type) VALUES
    ('${documentName}','${type}');
    `;
  await db.run(addDocumentQuery);
  res.send("Document Added Successfully");
});

app.get("/document-fields", async (req, res) => {
  const getFieldsQuery = `SELECT * FROM document_fields;`;
  const responseArr = await db.all(getFieldsQuery);
  res.send(responseArr);
});

app.post("/document-fields", async (req, res) => {
  const { fieldName } = req.body;
  const insertQuery = `INSERT INTO document_fields (field_name)
  VALUES ('${fieldName}');`;
  await db.run(insertQuery);
  res.send("Field Added Successfully");
});
