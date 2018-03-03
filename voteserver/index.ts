function index(req:any,res:any){
  res.send(`
<!DOCTYPE html>
<html>

<head>
    <title>Lichess Vote</title>
    <link rel="stylesheet" href="assets/stylesheets/reset.css">
    <link rel="stylesheet" href="assets/stylesheets/builder.css">
    <link rel="stylesheet" href="assets/stylesheets/app.css">
</head>

<body>

<div id="root"></div>

<script src="client.js"></script>

</body>

</html>
`)
}

module.exports.index=index