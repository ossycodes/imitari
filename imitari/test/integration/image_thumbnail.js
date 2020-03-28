const chai = require("chai");
const http = require("chai-http");
const sharp = require("sharp");
const tools = require("../tools");

chai.use(http);

describe("Downloading image", () => {
    it("should return a png thumbnail", (done) => {
        chai
            .request(tools.service)
            .get("/thumbnail.png")
            .end((err, res) => {
                chai.expect(res).to.have.status(200);
               
                return done();

            });
    });

    it("should return a jpeg thumbnail", (done) => {
        chai
            .request(tools.service)
            .get("/thumbnail.jpg")
            .end((err, res) => {
                chai.expect(res).to.have.status(200);
               
                return done();

            });
    });
});    