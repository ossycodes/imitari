const chai = require("chai");
const http = require("chai-http");
const sharp = require("sharp");
const tools = require("../tools");
const sinon = require("sinon");

chai.use(http);

describe("Statistics", () => {

    //delete/empty database at the end of everything mehn!
    // after((done) => {
    //     chai
    //         .request(tools.service)
    //         .post("/delete/test_stats_image_upload.png")
    //         .end((err, res) => {
    //             chai.expect(res).to.have.status(200);
    //             return done();
    //         });
    // });

    it("should return an object with total size,last_used and uptime", (done) => {
        chai
            .request(tools.service)
            .get("/stats")
            .end((err, res) => {
                chai.expect(res).to.have.status(200);
                chai.expect(res.body).to.have.property("total");
                chai.expect(res.body).to.have.property("size");
                chai.expect(res.body).to.have.property("last_used");
                chai.expect(res.body).to.have.property("uptime");

                return done();
            });
    });

    it("should reflect changes on image upload", (done) => {
        chai
            .request(tools.service)
            .post("/uploads/test_stats_image_upload.png")
            .set("Content-Type", "image/png")
            .send(tools.sample)
            .end((err, res) => {
                chai.expect(res).to.have.status(200);

                chai
                    .request(tools.service)
                    .get("/stats")
                    .end((err, res) => {

                        chai.expect(res).to.have.status(200);
                        chai.expect(res.body).to.have.property("total", 6);
                        chai.expect(res.body).to.have.property("size", 333258);

                        return done();

                    });
            });
    });

    it("should return 500 if a database error happens", (done) => {
        let query = sinon.stub(tools.service.db, "query");

        query
            .withArgs("SELECT COUNT(*) total, SUM(size) size, MAX(date_used) last_used FROM images")
            .callsArgWithAsync(1, new Error("Fake"));

        query
            .callThrough();

        chai
            .request(tools.service)
            .get("/stats")
            .end((err, res) => {
                chai.expect(res).to.have.status(500);

                query.restore();

                return done();
            })
    });
});