const expect = require("chai").expect;
const encryption = require("../library/encryption");

describe("Encryption", () => {
  it("should encrypt and decrypt strings correctly", () => {
    const testData = "Hello World";
    const password = "helloTest";
    const encryptedData = encryption.encrypt(testData, password);
    expect(Object.keys(encryptedData)).to.eql(["iv", "content"]);
    expect(encryptedData.iv).to.not.eql(testData);
    expect(encryptedData.content).to.not.eql(testData);
    const decryptedData = encryption.decrypt(encryptedData, password);
    expect(decryptedData).to.be.a("string");
    expect(decryptedData).to.eql(testData);
  });
});
