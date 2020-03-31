const express = require("express");
const path = require("path");
let initialState = require("./botanica-doc.js"); // 导入redux中的数据结构模板
// bodyParser to make the req.body populated with client sent data
const bodyParser = require("body-parser"); // 否则将无法从 req 中提取客户端传过来的数据
const MongoClient = require('mongodb').MongoClient;

const app = express();
let callback = express.static(path.join(__dirname, "build"));

// 设置临时变量，存储用户名和密码
let clientNameTmp = "";
let clientPasswordTmp = "";

// use the body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 对于不同路径的请求，使用静态资源提供服务。比如浏览器端请求 /login，那么服务端发送给浏览器静态资源。
// 浏览器加载后，根据前端的 App.js 中的路由设置，/login 自动匹配 logpage 视图。
app.use("/", callback);
app.use("/login", callback);
app.use("/playground", callback);
app.use("/playground/garden", callback);
app.use("/playground/warehouse", callback);
app.use("/playground/shop", callback);
app.use("/playground/diary", callback);
app.use("/playground/encyclopedia", callback);
app.use("/login-failure", express.static(path.join(__dirname, "server-info-pages", "login-failure.html")));
app.use("/register-success", express.static(path.join(__dirname, "server-info-pages", "register-success.html")));
app.use("/register-failure", express.static(path.join(__dirname, "server-info-pages", "register-failure.html")));
app.use("/register-empty", express.static(path.join(__dirname, "server-info-pages", "register-failure-empty.html")));

// 浏览器端请求 /login并用 post方式的时候，也即填写用户名和密码后：
app.post("/login", function (req, res) {
    // if the user has an account, then retrieve from req object the username and password
    // 因为之前已经 require 了 bodyParser，所以可以从 req.body中提取传过来的数据
    let clientName = req.body.username;
    let clientPassword = req.body.password;
    // store the client name and password to the tmp variables for later use
    clientNameTmp = clientName;
    clientPasswordTmp = clientPassword;

    // try matching the username and password with mongodb cloud database
    const uri = "mongodb+srv://botanica-player:botanica-player@botanica-database-hli2x.mongodb.net/test?retryWrites=true&w=majority";
    const client = new MongoClient(uri, { useNewUrlParser: true });
    // 链接 Mongodb Atlas Cluster 云端数据库
    client.connect(err => {
        if (err) {
            res.send(err);
            client.close();
        } else {
            console.log("Connected successfully to botanica mongodb cloud server");
            // 获取 botanica 数据库中的 saves 集合
            const saves = client.db("botanica").collection("saves");
            // 查找集合中的对应与刚才用户名和密码的文档
            saves.find({ "userCredentials.userName": clientName, "userCredentials.passWord": clientPassword }).toArray(function (err, docs) {

                if (err) {
                    res.send(err);
                    client.close();
                } else {
                    // 获取文档，如果文档为 undefined，说明用户名或者密码错误，不存在该文档
                    let userDoc = docs[0];
                    if (typeof userDoc === "undefined") {
                        res.redirect("/login-failure");
                    } else {
                        // 否则就是找到了对应的文档，那么服务器端重定向 /playground，
                        // serve 给浏览器端 /playground 对应的静态资源。即进入应用界面。
                        res.redirect("/playground");
                    }
                    client.close(); // 关闭刚才创建的 mongodb 实例
                }
            });
        }
    });
});
// 浏览器请求 /register 并用 post请求时，注册新用户
app.post("/register", function (req, res) {
    let newUserName = req.body.username; // obtain the front end submitted new user name
    let newPassWord = req.body.password; // obtain the front end submitted new password
    let newAvatar = parseInt(req.body.headimgindex); // obtain the fron end submitted user chosen avatar index
    if (newUserName === "" || newPassWord === "") {
        res.redirect("/register-empty");
    } else {
        const uri = "mongodb+srv://botanica-player:botanica-player@botanica-database-hli2x.mongodb.net/test?retryWrites=true&w=majority";
        const client = new MongoClient(uri, { useNewUrlParser: true });
        client.connect(err => {
            if (err) {
                res.send(err);
                client.close();
            } else {
                console.log("Connected successfully to botanica mongodb cloud server");
                const saves = client.db("botanica").collection("saves");
                saves.find({ "userCredentials.userName": newUserName }).toArray(function (err, docs) {
                    if (err) {
                        res.send(err);
                        client.close();
                    } else {
                        let userDoc = docs[0];
                        if (typeof userDoc === "undefined") {
                            // new user name to be registered does not exist in database, create new user
                            try {
                                saves.insertOne({
                                    userCredentials: {
                                        userName: newUserName,
                                        passWord: newPassWord,
                                        avatarIndex: newAvatar
                                    },
                                    userSave: initialState
                                });
                            } catch (err) {
                                console.log(err.stack);
                            }
                            res.redirect("/register-success");
                        } else {
                            // user name to be registered already exists, inform front end to re-try
                            res.redirect("/register-failure");
                        }
                        client.close();
                    }
                });
            }
        });
    }
});
// 如果用户已经在 botanica应用的界面之内了，那么应用自动发送 get 请求 /loadSave，要求加载云存档。
app.get("/loadSave", function (req, res) {
    const uri = "mongodb+srv://botanica-player:botanica-player@botanica-database-hli2x.mongodb.net/test?retryWrites=true&w=majority";
    const client = new MongoClient(uri, { useNewUrlParser: true });
    client.connect(err => {
        if (err) {
            res.send(err);
            client.close();
        } else {
            console.log("Connected successfully to botanica mongodb cloud server");
            const saves = client.db("botanica").collection("saves");
            // 将之前 node express服务器上临时存储的用户名和密码，填写于此，进行查询。
            // 因为用户已经成功登陆了 botanica 的游戏内界面，所以一定可以找到对应用户名和密码的存档文档。
            saves.find({ "userCredentials.userName": clientNameTmp, "userCredentials.passWord": clientPasswordTmp }).toArray(function (err, docs) {
                if (err) {
                    res.send(err);
                    client.close();
                } else { // 提取对应用户名和密码的文档（save），并且 json 形式响应给浏览器端。浏览器需要接受。
                    let userDoc = docs[0];
                    res.json(userDoc);
                    client.close();
                }
            });
        }
    });
});
// 用户已经在botanica界面内，POST请求 /uploadSave，则上传前端 Redux Store数据至后台，进而上传 mongodb 数据库
app.post("/uploadSave", function (req, res) {
    let uploadedData = req.body; // 获取前端提交过来的数据
    const uri = "mongodb+srv://botanica-player:botanica-player@botanica-database-hli2x.mongodb.net/test?retryWrites=true&w=majority";
    const client = new MongoClient(uri, { useNewUrlParser: true });
    try {
        client.connect(err => {
            if (err) {
                res.send(err);
                client.close();
            } else {
                // 如果成功链接mongodb：
                console.log("Connected successfully to botanica mongodb cloud server");
                const saves = client.db("botanica").collection("saves"); // 获取saves集合
                saves.findOneAndUpdate({ "userCredentials.userName": clientNameTmp, "userCredentials.passWord": clientPasswordTmp }, { $set: { "userSave": uploadedData } });
            }
        });
    } catch (err) {
        console.log(err.stack);
    }
    // 更新完mongodb数据库，结束响应。通知前端。
    res.send("REDUX STATE HAS BEEN SUCCESSFULLY UPLOADED TO MONGODB CLOUD DATABASE.");
    client.close();
});

// depending on the real server ip and port, the below things should be replaced.
app.listen("8080", function () {
    console.log("Botanica server is running at http://localhost:8080/");
});