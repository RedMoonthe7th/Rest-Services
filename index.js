const express = require('express');
const Ajv = require("ajv")
const cors = require('cors');
const jwt = require('jsonwebtoken');
const TOKEN_SECRET = process.env.TOKEN_SECRET;
const dotenv = require("dotenv");
const mysql = require('mysql2/promise');
dotenv.config();
const app = express();
app.use(cors());
app.use((req, res, next) => {
    express.json()(req, res, err => {
        if (err) {
            return res.status(400).send({
                message: "Could not parse JSON"
            });
        }
        next();
    })
});
app.use(express.urlencoded({ extended: true }))
const ajv = new Ajv() // options can be passed, e.g. {allErrors: true}
const schema = {
  type: "object",
  properties: {
    id: {type: "integer"},
    title: { type: "string" },
    completed: { type: "integer" },
  },
  required: ["title", "completed"],
    additionalProperties:false
}
const validate = ajv.compile(schema)

// Create an async pool object with promisified methods 
const pool = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})

async function query(sql, params) {
    try {
        const [rows, fields] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        throw error;
    }
}

// Function to check the connection 
async function checkConnection() {
    try {
        // Execute a simple query to check the connection 
        await pool.query('SELECT 1');
        console.log('Connected to the MySQL server.');
    } catch (err) {
        console.error('Error connecting to MySQL server:', err);
    } finally {
        // Close the connection pool 
    }
}

// Call the function to check the connection 
checkConnection();
// Get Function
app.get('/todos', async function (req, res) {
    try {
        const sql = "SELECT * FROM todos";
        var todos = await query(sql);
        console.log(todos);
        if (todos.length == 0) {
            res.status(404).json({
                status: 404,
                message: "keine Todos gefunden"
            });
            return;
        }
        //console.log(todos); 
        var row = todos.length;
        res.status(200).json({
            status: 200,
            todos,
            row
        });
        return;
    } catch (err) {
        res.status(500).send({
            status: 500,
            message: err
        });
    }
    return;
});
// Post Function
app.post('/todos', async function (req, res) {
    let todo = req.body;

    const isValid = validate(todo)
    if (!isValid) {
        console.log(validate.errors);
        res.send("Invalid data")
        return;
    }

    try {
        const sql = "INSERT INTO todos (title,completed) VALUES (?,?)";
        var todos = await query(sql, [todo.title, todo.completed]);
        //console.log(todos);
        res.send("Data saved")
        return;

    } catch (err) {
        console.log(err);
        res.status(500).send({
            status: 500,
            message: err
        });
        res.send("Fehler...");
        return;
    }
    return;
});
// Put Function
app.put('/todos', async function (req, res) {
    let todo = req.body;

    const isValid = validate(todo)
    if (!isValid) {
        console.log(validate.errors);
        res.send("Invalid data")
        return;
    }
    
    try {
        const sql = "UPDATE todos SET completed =? WHERE id = ?";
        var todos = await query(sql, [todo.completed, todo.id]);

        console.log(sql);
        console.log("id:", todo.id, " completed:",todo.completed);
        res.send("Data updated")
        return;

    } catch (err) {
        console.log(err);
        res.status(500).send({
            status: 500,
            message: err
        });
        res.send("Fehler...");
        return;
    }
    return;
});
// Delete Function
app.delete('/todos/:id', async function (req, res) {
    try {
        const sql = "DELETE FROM todos WHERE id =?";
        var todos = await query(sql, [parseInt(req.params.id)]);
        res.send("Data deleted")
        return;

    } catch (err) {
        console.log(err);
        res.status(500).send({
            status: 500,
            message: err
        });
        res.send("Fehler...");
        return;
    }
    return;
});



app.get('/', (req, res) => {
    res.send("hallo ihr schueler");
});

///Zugriffe auf Pfade mit :  
// Apfrage mit Parameter  /hello?name=xxx 
app.get('/hello', (req, res) => {
    res.send("hallo mein query ist:" + req.query.name);
});
// Abfrage mit Platzhalter in /hello/markus 
app.get('/hello/:name', (req, res) => {
    console.log(req.params.name);
    res.send("hallo mein Name ist auch " + req.params.name);
});
app.post('/hello/body', function (req, res) {
    console.log(req.body);
    res.send(req.body);
});

// LOGIN 
app.get('/user/login', async function (req, res) {
    data = req.body;
    let sql = "select username, password from user where username = ? and password = ?";
    const values = [req.body.username, req.body.password];
    try {
        const results = await query(sql, values);
        if (results.length === 0) {
            return res.status(409).json({ status: 409, message: "username oder password falsch" });
        }
        const token = generateAccessToken({ username: req.body.username });
        return res.status(201).json({
            token: token,
            status: 201,
            message: "erfolgreich eingeloggt und token erstellt"
        })
    } catch (err) {
        console.error("Database error:", err);
        return res.status(500).json({ status: 500, message: "Datenbankfehler: " + err.message });
    }
})

app.listen(3000, () => console.log("Example REST gestartet")); 