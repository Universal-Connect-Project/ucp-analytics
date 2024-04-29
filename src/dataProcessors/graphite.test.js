const { providersData } = require("../test/testData/providers")
const ex = require("./graphite")

describe("graphite data processor", () => {
    describe("uvcs", () => {
        describe("get_providers", () => {
            it("returns a list of providers", async () => {
                expect(await ex.uvcs.get_providers()).toEqual(providersData.values.map(({ value }) => value))
            })
        })
    })
})