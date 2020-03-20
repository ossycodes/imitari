let express = require("express");
let body = require("body-parser");

// we create an express.Route and attached it to our service
// at the last but one line, we can use this to move our
// route definition to a seperate file and make it URL agnostic
// (see how we only metion /stack once, when attaching)

let route = express.Router();
let app	    = express();
let stack   = [];

app.use(body.text({ type: "*/*"}));

route.post("/", (req, res, next) => {
	// let buffer = "";
	// req.on("data", (data) => {
	// 	// console.log("data recieving" .data);
	// 	buffer += data;
	// });
	// req.on("end", () => {
	// 	stack.push(buffer);
	// 	//next() tells express to pass to the next route available
	// 	//in our case it is the route that is been defined that's 
	// 	//using the use method. (app.use())
	// 	return next();
	// });

	//instead of reading the body like we did above
	//we now uses a middleware body-parser, which handles
	//it for use and supports several body types and 
	//compression
	stack.push(req.body);
	return next();
});

route.delete("/", (req, res) => {
	stack.pop();
	//next() tells express to pass to the next route available route
	//in our case it is the route that is been defined that's
	//using the use method (app.use or route.use)
	return next();
});

route.get("/:index", (req, res, next) => {
	let index = req.params.index;
	if(index >= 0 && index < stack.length) {
		return res.end("" + stack[index]);
	}
	res.status(404).end();
});

//this is a catch all for all HTTP verb
//Remember route definition order is important
//and that's why the catch all is done at the end.
route.use('/stack', (req, res) => {
	res.send(stack);
})


//this is where we attached our created route to our service
app.use('/stack', route);

//port server listens on.
app.listen(3000);
