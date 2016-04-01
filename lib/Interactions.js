/* Interactions.js */

// definitions for tiles, by ID
// all tiles have "cost"
// must define "action" as: "spawns", "moves", "grinds", "packs", "cooks", "sells"
// use "movex" and "movey" as -1, 0, 1
// use "spawns" for caves to define what ids they spawn
var Interactions = {
  tileDefs: {
    1: {
      cost: 2,
      action: 'moves',
      movex: 0,
      movey: 1,
    },
    2: {
      cost: 2,
      action: 'moves',
      movex: 0,
      movey: -1,
    },
    3: {
      cost: 2,
      action: 'moves',
      movex: -1,
      movey: 0,
    },
    4: {
      cost: 2,
      action: 'moves',
      movex: 1,
      movey: 0,
    },

    5: {
      cost: 10,
      action: 'grinds',
    },

    6: {
      cost: 20,
      action: 'spawns',
      spawns: 4,
    },
    7: {
      cost: 30,
      action: 'sells',
    },
    8: {
      cost: 10,
      action: 'cooks',
    },
    9: {
      cost: 10,
      action: 'packs',
    },
  },

  // definitions for items, by ID
  // types are "creature", "product"
  // all items have "sells" aka value
  // actions are "grinds", "packs", "cooks" ... what is the resulting ID
  itemDefs: {
    1: {
      type: 'product',
      sells: 0,
      packs: 2,
    },
    2: {
      type: 'product',
      sells: 0,
      cooks: 3,
    },
    3: {
      type: 'product',
      sells: 1,
    },
    4: {
      type: 'creature',
      sells: 0,
      grinds: 1,
    },
  },
}

module.exports = Interactions