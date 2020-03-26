const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
// bodyParser is to make the req.body populated with client sent data

const app = express();
let callback = express.static(path.join(__dirname, "build"));

// use the body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", callback);
app.use("/login", callback);
app.use("/playground", callback);
app.use("/playground/garden", callback);
app.use("/playground/warehouse", callback);
app.use("/playground/shop", callback);
app.use("/playground/diary", callback);
app.use("/playground/encyclopedia", callback);
app.post("/login", function (req, res) {
    // if the user has an account, then retrieve from req object the username and password
    let clientName = req.body.username;
    let clientPassword = req.body.password;
    // try matching the username and password with mongodb cloud database
    if (clientName === "test") {
        res.redirect("/playground");
    } else {
        console.log(req.body);
        res.end();
    }
});

app.listen("8080", function () {
    console.log("Botanica server (developed with node express) runs at http://localhost:8080/");
});