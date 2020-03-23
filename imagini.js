const express = require("express");
const sharp = require("sharp");
const app = express();
const bodyparser = require("body-parser");
const path = require("path");
const fs = require("fs");

//route parameters - They allow us pre-process any route that uses
//a parameter and check whether it's valid 
//and do all kinds of stuff such as fetching
//additional information from a database or another server
app.param("image", (req, res, next, image) => {
    if (!image.match(/\.(png|jpg)$/i)) {
        return res.status(req.method == POST ? 403 : 404).end();
    }

    req.image = image;
    req.localpath = path.join(__dirname, "uploads", req.image);

    return next();
});

app.param("width", (req, res, next, width) => {
    //we had + in front of width to cast width to number type
    req.width = +width;

    return next();
});

app.param("height", (req, res, next, height) => {
    ////we had + in front of height to cast width to number type
    req.height = +height;

    return next();
});

app.param("greyscale", (req, res, next, greyscale) => {
    if (greyscale != "bw") {
        return next("route");
    }

    req.greyscale = true;

    return next();
});

function download_image(req, res) {
    fs.access(req.localpath, fs.constants.R_OK, (err) => {
        if (err) {
            return res.status(404).end();
        }

        let image = sharp(req.localpath);

        if (req.width && req.height) {
            /**
             * no more ignoreAspectRatio, instead use the below
             */
            image.resize(req.width, req.height, {
                // kernel: sharp.kernel.nearest,
                fit: 'fill',
                // position: 'right top',
                // background: { r: 255, g: 255, b: 255, alpha: 0.5 }
            });
        }

        if (req.width || req.height) {
            image.resize(req.width, req.height);
        }

        if (req.greyscale) {
            image.greyscale();
        }

        res.setHeader("Content-Type", "image/" + path.extname(req.image).substr(1));

        image.pipe(res);
    })
}


app.post("/uploads/:image", bodyparser.raw({
    limit: "10mb",
    type: "image/*"
}), (req, res) => {

    //create a stream to the local file where we'll save our image
    //the name of the file will be the name of our image
    let fd = fs.createWriteStream(path.join(req.localpath), {
        flags: "w+",
        encoding: "binary"
    });

    //we write the image(which is stored in the body, 
    //thanks to body-parser module ) 
    //to the file
    fd.end(req.body);

    //close the file stream
    fd.on("close", () => {
        res.send({ status: "ok", size: req.body.length });
    })
});

//the HEAD verb is just like a GET request
//but without a body(no content)
//it is used to request only 
//informational(headers) from a path
app.head("/uploads/:image", (req, res) => {
    //check if the current process has 
    //read access to the local file
    fs.access(
        path.join(req.localpath),
        fs.constants.R_OK,
        (err) => {
            res.status(err ? 404 : 200);
            res.end();
        }
    )
});

app.get("/uploads/:width(\\d+)x:height(\\d+)-:greyscale-:image", download_image);
app.get("/uploads/:width(\\d+)x:height(\\d+)-:image", download_image);
app.get("/uploads/_x:height(\\d+)-:greyscale-:image", download_image);
app.get("/uploads/_x:height(\\d+)-:image", download_image);
app.get("/uploads/:width(\\d+)x_-:greyscale-:image", download_image);
app.get("/uploads/:width(\\d+)x_-:image", download_image);
app.get("/uploads/:greyscale-:image", download_image);
app.get("/uploads/:image", download_image);

// app.get("/uploads/:image", (req, res) => {
//     //check if the image extention is .png or jpg
//     //if not we return 404 (not found) response.
//     if (!ext.match(/^\.(png|jpg)$/)) {
//         return res.status(404).end();
//     }

//     //create readable stream to the image file path
//     let fd = fs.createReadStream(path.join(__dirname, "uploads", req.params.image));

//     //error handler to ctahc any errors when reading the local file.
//     fd.on("error", (e) => {
//         res.status(e.code === "ENOENT" ? 404 : 500).end();
//     });

//     //set content type returned to the user, in order to 
//     //identify the image tyoe we're sending.
//     res.setHeader("Content-Type", "image/" + req.image.substr(1));

//     //triggers reads from the file stream and write them to the response
//     //after the whole file as been read the resposne is ended automatically
//     fd.pipe(res);
// });


app.get(/\/thumbnail\.(jpg|png)/, (req, res, next) => {
    let format = (req.params[0] == "png" ? "png" : "jpeg");
    let width = parseInt(req.query.width) || 300;
    let height = parseInt(req.query.height) || 200;
    let border = parseInt(req.query.border) || 5;
    let bgcolor = req.query.bgcolor || "#fcfcfc";
    let fgcolor = req.query.fgcolor || "#ddd";
    let textcolor = req.query.textcolor || "#aaa";
    let textsize = parseInt(req.query.textsize) || 24;

    //this creates an empty image using sharp
    let image = sharp({
        create: {
            width: width,
            height: height,
            channels: 4,
            background: { r: 0, g: 0, b: 0 }
        }
    });

    //create an SVG file with an ouer border, two crossing lines
    //a text in the middle with the size of the image
    const thumbnail = new Buffer.from(
        `<svg width="${width}" height="${height}">
            <rect
                x="0" y="0"
                width="${width}" height="${height}"
                fill="${fgcolor}" />
            <rect
                x="${border}" y="${border}"
                width="${width - border * 2}" height="${height - border * 2}"
                fill="${bgcolor}" />
            <line
                x1="${border * 2}" y1="${border * 2}"
                x2="${width - border * 2}" y2="${height - border * 2}"
                stroke-width="${border}" stroke="${fgcolor}" />
            <line
                x1="${width - border * 2}" y1="${border * 2}"
                x2="${border * 2}" y2="${height - border * 2}"
                stroke-width="${border}" stroke="${fgcolor}" />
            <rect
                x="${border}" y="${(height - textsize) / 2}"
                width="${width - border * 2}" height="${textsize}"
                fill="${bgcolor}" />
            <text
                x="${width / 2}" y="${height / 2}" dy="8"
                font-family="Helvetica" font-size="${textsize}"
                fill="${textcolor}" text-anchor="middle">${width} x ${height}</text>
        </svg>`

    );

    //     //we then overlay the SVG on our empty image, and output the result to the user
    image.composite([{ input: thumbnail }])[format]().pipe(res)

});

app.listen(3000, () => {
    console.log("Ready");
});