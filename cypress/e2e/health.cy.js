describe('health check', () => {
  it('responds with ok to the /ping api', () => {
    cy.request("http://localhost:8081/ping").then((response) => {
      expect(response.status).to.eq(200);
    })
  })
})