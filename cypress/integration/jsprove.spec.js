/* eslint-disable no-undef */
// eslint-disable-next-line spaced-comment
/// <reference types="Cypress" />

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
      cy.get('#methodDropDown .bs-searchbox input:first').type('Jovium', {'force': true});
      cy.get('#methodDropDown li.active a').click();
      cy.get('#insertMethod').click();
      cy.get('#notation10').should('have.value', 'd &-3-4-2.5.6-34-5-6-5');
    });

    it('Keeps the letters unique', () => {
      cy.get('#searchMethod').click();
      cy.get('#methodDropDown .bs-searchbox input:first').type('Belfast', {'force': true});
      cy.get('#methodDropDown li.active a').click();
      cy.get('#insertMethod').click();
      cy.get('#notation10').should('not.exist');
      cy.get('#alert')
          .should('contain.text', 'A method with shortcut B already exists');
    });
  });

  describe('Proving 8-bell methods', () => {
    it('Can use the shorthand to generate and prove a method', () => {
      cy.get('#shorthand').clear();
      cy.get('#shorthand').type('whwh');
      cy.get('#generateShorthand').click();
      cy.get('#composition').should('have.value', 'AAAAA/AA/\nAAAAA/AA/\n');
      cy.get('#courseEnds').should('have.text', '14523678\n12345678\n\n');
      cy.get('#results').should('have.class', 'text-success');
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
          .should('have.class', 'text-error')
          .should('contain.text', 'Touch is false');
    });

    it('Can handle multiple methods using a collection', () => {
      cy.get('#collectionChoice select').select('Pitman\'s 4');
      const composition = 'LSL/\nL/B/B/S/CSC/\nLSCSC/\nL/B/B/S/CSC/\nLCL/\nL/BBBBBBB/\nCS/CS\nSSS/B/S/CSC/\nLS/L\nL/B/LLLLL/B/L\nL/SL/\nCSC/S/B/SSS\nSC/SC/\nBBBBBBB/L/\nLCL/\nCSC/S/B/B/L/\nCSCSL/\nCSC/S/B/B/L/\nLS/L/B/B/\nLC/SSS\nLC/L/\nLC/B/B/L/\nCSC/CL \nCSC/SL/\nCS/BBBB/\nBBBB/SC/\nLS/CSC\nLC/CSC/\nL/B/B/CL/';
      cy.get('#composition')
          .clear()
          .type(composition);
      cy.get('#results')
          .should('have.class', 'text-success')
          .should('contain.text', '5024 changes');
      cy.get('#com')
          .should('contain.text', '109 changes of method');
    });
  });

  describe('Calls and Music', () => {
    it('Can handle different calls in the shorthand', () => {
      // Arrange
      cy.get('#callsTab').click();
      cy.get('#callNtn0').clear().type('16');
      cy.get('#callNtn1').clear().type('1678');
      cy.get('#methodsTab').click();

      cy.get('.removeMethod').click({
        multiple: true,
      });
      cy.get('#searchMethod').click();
      cy.get('#methodDropDown .bs-searchbox input:first').type('Madurai', {'force': true});
      cy.get('#methodDropDown li.active a').click();
      cy.get('#insertMethod').click();
      cy.get('#shorthand').clear().type('oooi8oi768is3s3ivvvs4s7iiis6vs2ooos2vvs4o64i');

      // Act
      cy.get('#generateShorthand').click();
      cy.get('#composition').type('MM');

      // Assert
      cy.get('#results').should('have.class', 'text-success');
      cy.get('#music')
          .should('contain.text', '21\t8765****')
          .should('contain.text', '24\t****5678');
    });

    it('Can handle more than 2 call types', () => {
      // Arrange
      cy.get('#callsTab').click();
      cy.get('#btnAddMoreCalls').click();
      cy.get('#symbol2').clear().type('#');
      cy.get('#callNtn2').clear().type('18');
      cy.get('#methodsTab').click();

      cy.get('#methodRank').select('Maximus');
      cy.get('#method10 .removeMethod').click();
      cy.get('#method11 .removeMethod').click();

      // Act
      const composition = 'CCC#CCC\nCCCCCC;CCCCC\nCCCCC;C/CCCCC/';
      cy.get('#composition').clear().type(composition);

      // Assert
      cy.get('#results')
          .should('contain.text', 'Touch is true: 1344 changes')
          .should('have.class', 'text-success');
    });
  });
});
