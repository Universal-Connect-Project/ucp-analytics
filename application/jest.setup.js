const { server } = require('./test/testServer')

jest.mock("./infra/logger")
 
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())