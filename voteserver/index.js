"use strict";
// system
// local
function handleAjax(req, res) {
    let responseJson = {
        ok: true,
        req: req.body
    };
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(responseJson));
}
module.exports.handleAjax = handleAjax;
function index(req, res) {
    res.send(`
<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" href="assets/stylesheets/reset.css">
    <link rel="stylesheet" href="assets/stylesheets/builder.css">
    <link rel="stylesheet" href="assets/stylesheets/app.css">
</head>

<body>

<div id="root"></div>

<script src="client.js"></script>

</body>

</html>
`);
}
module.exports.index = index;
