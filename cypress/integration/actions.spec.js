/* eslint-disable no-undef */
// / <reference types="Cypress" />

context('Actions', () => {
  beforeEach(() => {
    cy.visit('http://localhost:8080');
  });

  describe('UI Components for adding methods', () => {
    it('Remove Methods from the method selector', () => {
      cy.get('.removeMethod').click({
        multiple: true,
      });
      cy.get('#method0')
          .should('not.exist');
    });

    it('Adds Methods to the method selector', () => {
      cy.get('#searchMethod').click();
      cy.get('#methodSelect').select('Jovium');
      cy.get('#insertMethod').click();
      cy.get('#notation10').should('have.value', 'd &-3-4-2.5.6-34-5-6-5');
    });

    it('Keeps the letters unique', () => {
      cy.get('#searchMethod').click();
      cy.get('#methodSelect').select('Belfast');
      cy.get('#insertMethod').click();
      cy.get('#notation10').should('not.exist');
      cy.get('#alert')
          .should('contain.text', 'A method with shortcut B already exists');
    });
  });

  describe('Proving a sample Major method', () => {
    it('Can use the shorthand to generate and prove a method', () => {
      cy.get('#shorthand').clear();
      cy.get('#shorthand').type('whwh');
      cy.get('#generateShorthand').click();
      cy.get('#composition').should('have.value', 'AAAAA/AA/\nAAAAA/AA/\n');
      cy.get('#courseEnds').should('have.text', '14523678\n12345678\n\n');
      cy.get('#results').should('have.class', 'success');
    });

    it('Proves an obvious touch as false', () => {
      cy.get('#shorthand').clear();
      cy.get('#shorthand').type('hhshhhsh');
      cy.get('#generateShorthand').click();
      cy.get('#composition')
          .should('have.value',
              'AAAAAAA/\nAAAAAAA/\nAAAAAAA;\nAAAAAAA/\nAAAAAAA/\nAAAAAAA;\n'
          );
      cy.get('#results')
          .should('have.class', 'error')
          .should('contain.text', 'Touch is false');
    });

    it('Can handle multiple methods', () => {
      cy.get('#composition')
          .clear()
          .type('B/\nDDDL/\nDDCL/\nBDDDDB/\n');
      cy.get('#results')
          .should('have.class', 'info');
      cy.get('#com')
          .should('contain.text', '8 changes of method');
    });
  });
});
