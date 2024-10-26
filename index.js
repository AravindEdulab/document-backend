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

//fields Array
const customFields = {
  Customer: [
    { field_id: 1, field_name: "id" },
    { field_id: 2, field_name: "Customer Name" },
    { field_id: 3, field_name: "Customer Type" },
    { field_id: 4, field_name: "Customer Address" },
    { field_id: 5, field_name: "Customer Contact" },
  ],
  "Health Care": [
    { field_id: 1, field_name: "id" },
    { field_id: 6, field_name: "Patient Name" },
    { field_id: 7, field_name: "Patient Age" },
    { field_id: 8, field_name: "Diagnosis" },
    { field_id: 9, field_name: "Treatment" },
  ],
  Users: [
    { field_id: 1, field_name: "id" },
    { field_id: 10, field_name: "Username" },
    { field_id: 11, field_name: "Role" },
    { field_id: 12, field_name: "Permissions" },
    { field_id: 13, field_name: "Status" },
  ],
  Account: [
    { field_id: 1, field_name: "id" },
    { field_id: 14, field_name: "Account Holder" },
    { field_id: 15, field_name: "Account Number" },
    { field_id: 16, field_name: "Account Type" },
    { field_id: 17, field_name: "Balance" },
  ],
  "Academic Team": [
    { field_id: 1, field_name: "id" },
    { field_id: 18, field_name: "Faculty Name" },
    { field_id: 19, field_name: "Department" },
    { field_id: 20, field_name: "Position" },
    { field_id: 21, field_name: "Years of Experience" },
  ],
  "Academic Year": [
    { field_id: 1, field_name: "id" },
    { field_id: 22, field_name: "Year" },
    { field_id: 23, field_name: "Semester" },
    { field_id: 24, field_name: "Start Date" },
    { field_id: 25, field_name: "End Date" },
  ],
  "Activity Cost": [
    { field_id: 1, field_name: "id" },
    { field_id: 26, field_name: "Activity Name" },
    { field_id: 27, field_name: "Budget" },
    { field_id: 28, field_name: "Expenses" },
    { field_id: 29, field_name: "Remaining Funds" },
  ],
  "Custom Field": [
    { field_id: 1, field_name: "id" },
    { field_id: 30, field_name: "Custom Label" },
    { field_id: 31, field_name: "Custom Value" },
    { field_id: 32, field_name: "Category" },
    { field_id: 33, field_name: "Date Added" },
  ],
};

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
  const { documentType } = req.query;

  const fieldsForType = customFields[documentType] || [];
  res.send(fieldsForType);
});

// Endpoint to add fields to a specific document type
app.post("/document-fields", (req, res) => {
  const { documentType, field_name } = req.body;

  // Check if both documentType and field_name are provided
  if (!documentType || !field_name) {
    return res
      .status(400)
      .send("Please provide both documentType and field_name.");
  }

  // Define a new field with an auto-incremented field_id based on the length of the existing fields
  const newField = {
    field_id: customFields[documentType]
      ? customFields[documentType].length + 1
      : 1,
    field_name,
  };

  // If the documentType exists, add the new field to the existing array
  if (customFields[documentType]) {
    customFields[documentType].push(newField);
  } else {
    // If it doesn't exist, create a new array for the document type with the "id" field and the new field
    customFields[documentType] = [{ field_id: 1, field_name: "id" }, newField];
  }

  res.send(
    `Field "${field_name}" added successfully to document type "${documentType}".`
  );
});
