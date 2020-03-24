const express = require("express");
const sharp = require("sharp");
const app = express();
const bodyparser = require("body-parser");
const path = require("path");
const fs = require("fs");
const setting = require("./settings");
const mysql = require("mysql");
const db = mysql.createConnection(setting.db);

db.connect((err) => {
    if (err) throw err;

    console.log("db: ready");
})

db.query(
    `CREATE TABLE IF NOT EXISTS images
    (
        id INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
        date_created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date_used TIMESTAMP NULL DEFAULT NULL,
        name VARCHAR(300) NOT NULL,
        size INT(11) UNSIGNED NOT NULL,
        data LONGBLOB NOT NULL,

        PRIMARY KEY (id),
        UNIQUE KEY name (name)
    )
    ENGINE=InnoDB DEFAULT CHARSET=utf8`
);


//route parameters - They allow us pre-process any route that uses
//a parameter and check whether it's valid 
//and do all kinds of stuff such as fetching
//additional information from a database or another server
app.param("image", (req, res, next, image) => {
    if (!image.match(/\.(png|jpg)$/i)) {
        //put POST in "", dude didn't do that o.
        return res.status(req.method == "POST" ? 403 : 404).end();
    }

    db.query("SELECT * FROM images WHERE name = ?", [image], (err, images) => {
        if (err || !images.length) {
            return res.status(404).end();
        }

        req.image = images[0];

        return next();
    });
});

function download_image(req, res) {

        let image = sharp(req.image.data);
        let width = +req.query.width;
        let height = +req.query.height;
        let blur = +req.query.blur;
        let sharpen = +req.query.sharpen;
        let greyscale = ["y", "yes", "1", "on"].includes(req.query.greyscale);
        let flip = ["y", "yes", "1", "on"].includes(req.query.flip);
        let flop = ["y", "yes", "1", "on"].includes(req.query.flop);

        if (width > 0 && height > 0) {
            /**
             * no more ignoreAspectRatio, instead use the below
             */
            image.resize(width, height, {
                // kernel: sharp.kernel.nearest,
                fit: 'fill',
                // position: 'right top',
                // background: { r: 255, g: 255, b: 255, alpha: 0.5 }
            });
        }

        if (width > 0 || height > 0) {
            image.resize(width || null, height || null);
        }


        if (flip) {
            image.flip();
        }

        if (flop) {
            image.flop();
        }

        if (blur) {
            if (blur > 1000) {
                res.status(400).send({
                    error: "blur as to be a Number value between 0.3 and 1000"
                });
            }
            image.blur(blur);
        }

        if (sharpen > 0) {
            image.sharpen(sharpen);
        }

        if (greyscale) {
            image.greyscale();
        }

        // image.rotate(-240);

        db.query(
            "UPDATE images " +
            "SET date_used =  UTC_TIMESTAMP " +
            "WHERE id = ?", [req.image.id]
        );

        res.setHeader("Content-Type", "image/" + path.extname(req.image.name).substr(1));

        image.pipe(res);
}


app.post("/uploads/:name", bodyparser.raw({
    limit: "10mb",
    type: "image/*"
}), (req, res) => {

    db.query("INSERT INTO images SET ?", {
        name: req.params.name,
        size: req.body.length,
        data: req.body
    }, (err) => {
        if (err) {
            return res.send({
                status: "error",
                "code": err.code
            });
        }

        res.send({
            status: "ok",
            size: req.body.length
        });
    });
});

//the HEAD verb is just like a GET request
//but without a body(no content)
//it is used to request only 
//informational(headers) from a path
app.head("/uploads/:image", (req, res) => {
    return res.status(200).end();
});

// app.get("/uploads/:width(\\d+)x:height(\\d+)-:greyscale-:image", download_image);
// app.get("/uploads/:width(\\d+)x:height(\\d+)-:image", download_image);
// app.get("/uploads/_x:height(\\d+)-:greyscale-:image", download_image);
// app.get("/uploads/_x:height(\\d+)-:image", download_image);
// app.get("/uploads/:width(\\d+)x_-:greyscale-:image", download_image);
// app.get("/uploads/:width(\\d+)x_-:image", download_image);
// app.get("/uploads/:greyscale-:image", download_image);
// app.get("/uploads/:image", download_image);

app.get("/uploads/:image", (req, res) => {

    let image = sharp(req.image.data);
    let width = +req.query.width;
    let height = +req.query.height;
    let blur = +req.query.blur;
    let sharpen = +req.query.sharpen;
    let greyscale = ["y", "yes", "1", "on"].includes(req.query.greyscale);
    let flip = ["y", "yes", "1", "on"].includes(req.query.flip);
    let flop = ["y", "yes", "1", "on"].includes(req.query.flop);

    if (width > 0 && height > 0) {
        /**
         * no more ignoreAspectRatio, instead use the below
         */
        image.resize(width, height, {
            // kernel: sharp.kernel.nearest,
            fit: 'fill',
            // position: 'right top',
            // background: { r: 255, g: 255, b: 255, alpha: 0.5 }
        });
    }

    if (width > 0 || height > 0) {
        image.resize(width || null, height || null);
    }


    if (flip) {
        image.flip();
    }

    if (flop) {
        image.flop();
    }

    if (blur) {
        if (blur > 1000) {
            res.status(400).send({
                error: "blur as to be a Number value between 0.3 and 1000"
            });
        }
        image.blur(blur);
    }

    if (sharpen > 0) {
        image.sharpen(sharpen);
    }

    if (greyscale) {
        image.greyscale();
    }

    // image.rotate(-240);

    db.query(
        "UPDATE images " +
        "SET date_used =  UTC_TIMESTAMP " +
        "WHERE id = ?", [req.image.id]
    );

    res.setHeader("Content-Type", "image/" + path.extname(req.image.name).substr(1));

    image.pipe(res);
});

app.delete("/uploads/:image", (req, res) => {
    db.query("DELETE FROM images WHERE id =?", [req.image.id],
        (err) => {
            return res.status(err ? 500 : 200).end();
        });
});

app.get("/stats", (req, res) => {

    db.query("SELECT COUNT(*) total" +
        ", SUM(size) size " +
        ", MAX(date_created) last_used " +
        "FROM images",

        (err, rows) => {
            if (err) {
                return res.status(500).end();
            }

            rows[0].uptime = process.uptime();

            return res.send(rows[0]);
        });
});

app.get(/\/thumbnail\.(jpg|png)/, (req, res, next) => {
    let format = (req.params[0] == "png" ? "png" : "jpeg");
    let width = +req.query.width || 300;
    let height = +req.query.height || 200;
    let border = +req.query.border || 5;
    let bgcolor = req.query.bgcolor || "#fcfcfc";
    let fgcolor = req.query.fgcolor || "#ddd";
    let textcolor = req.query.textcolor || "#aaa";
    let textsize = +req.query.textsize || 24;

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

    //we then overlay the SVG on our empty image, and output the result to the user
    image.composite([{ input: thumbnail }])[format]().pipe(res)

});


setInterval(() => {
    //deletes images that were not used in the past month(but where used before)
    //or images that were not used in the past week(and never used before)
    db.query("DELETE FROM images " +
    "WHERE (date_created < UTC_TIMESTAMP - INTERVAL 1 WEEK AND date_used IS NULL)" +
    " OR (date_used < UTC_TIMESTAMP - INTERVAL 1 MONTH");
}, 360 * 1000);

app.listen(3000, () => {
    console.log("Ready");
});