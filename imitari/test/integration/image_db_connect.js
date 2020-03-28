// const chai = require("chai");
// const http = require("chai-http");
// const sharp = require("sharp");
// const tools = require("../tools");
// const sinon = require("sinon");

// chai.use(http);

// describe.only("database connection", () => {
//     it("should return error on database connection", (done) => {
//         let stubDb = sinon.stub(tools.service.db, "connect")
//         stubDb
//             .callsArgWith(0, new Error());
//         // stubDb
//         //     .callThrough();

//         chai
//             .request(tools.service)
//             .get("/stats")
//             .end((err, res) => {

//                 chai.expect(res).to.have.status(500);
//                 // chai.expect(res.body).to.have.property("total", 6);
//                 // chai.expect(res.body).to.have.property("size", 333258);

//                 stubDb.restore();

//                 return done();

//             });
//     });
// });