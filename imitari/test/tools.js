const fs= require("fs");
const path = require("path");

exports.service = require("../imitari");
exports.sample = fs.readFileSync(path.join(__dirname, "sample.png"));
