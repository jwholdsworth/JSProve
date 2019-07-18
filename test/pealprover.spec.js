/* eslint-disable no-undef */
'use strict';
const chai = require('chai');
const expect = chai.expect;
const sut = require('../js/pealprover');

describe('Peal Prover', () => {
  describe('Validate Method', () => {
    it('Returns an error if an invalid stage is given', () => {
      const result = sut.validateMethod('K', 'b &-3-4', 'boris');
      expect(result).to.equal(false);
    });
  });

  describe('Create Composition', () => {
    it('Creates a composition with valid user input', () => {
      const input = {
        composition: 'AAA',
        methods: [
          {
            notation: 'c &-5-4-56-36-4-5.36-36.1',
            shorthand: 'A',
          },
        ],
        stage: 8,
        calls: [
          {
            notation: '14',
            symbol: '/',
          },
        ],
      };

      const result = sut.createComposition(input);
      expect(result.comp.stage).to.equal(8);
      expect(result.comp.methods.length).to.equal(3);
      expect(result.comp.calls.length).to.equal(3);
      expect(result.comp.leadends.length).to.equal(0);
    });
  });
});
