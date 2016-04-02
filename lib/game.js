var util = require('util')
var http = require('http')
var path = require('path')
var ecstatic = require('ecstatic')
var io = require('socket.io')

var Player = require('./Player')
var Interactions = require('./Interactions')

var port = process.env.PORT || 3333

/* ************************************************
** GAME VARIABLES
************************************************ */
var socket	// Socket controller
var players	// Array of connected players

/* ************************************************
** GAME INITIALISATION
************************************************ */

// Create and start the http server
var server = http.createServer(
  ecstatic({ root: path.resolve(__dirname, '../build') })
)
server.listen(port, function (err) {
  if (err) {
    throw err
  }

  init()
})

var tiles = {
    '0,1': 6,
    '0,2': 5,
    '0,3': 9,
    '0,4': 8,
    '0,5': 7,
}
var items = {}
var money = 0

function init () {
  // Create an empty array to store players
  players = []

  socket = io(server, {origins:'localhost:* 192.168.*.*:* http://chrislhall.net:* http://www.chrislhall.net:* http://chrislhall.net/hotdog http://www.chrislhall.net/hotdog'})

  // Start listening for events
  setEventHandlers()

  setInterval(updateMap, 300)
}

var SPAWN_PROB = 0.1
var GRIND_PROB = 1
var PACK_PROB = 0.3
var COOK_PROB = 0.5
// Process the map
function updateMap () {
  var newItems = {}
  for (var loc in tiles) {
    var type = tiles[loc]
    var bits = loc.split(',')
    var x = parseInt(bits[0])
    var y = parseInt(bits[1])

    if (Interactions.tileDefs[type].spawns && Math.random() < SPAWN_PROB) {
      if (!(items[loc]) && !(newItems[loc])) {
        newItems[loc] = Interactions.tileDefs[type].spawns
      }
    }
  }
  for (var loc in items) {
    var setNewItem = false
    var type = items[loc]
    var bits = loc.split(',')
    var x = parseInt(bits[0])
    var y = parseInt(bits[1])
    var tileType = tiles[loc]
    var downLoc = x.toString() + ',' + (y + 1).toString()

    if (Interactions.itemDefs[type].type === 'creature') { // && Math.random() < 0.2) {
      if (tileType && Interactions.tileDefs[tileType].action == 'grinds'
          && Math.random() < GRIND_PROB) {
        if (!(items[downLoc]) && !(newItems[downLoc])) {
          newItems[downLoc] = Interactions.itemDefs[type].grinds
          setNewItem = true
        }
      } 
      if (!setNewItem) {
        var deltas = [-1, 0, 1]
        var dx = deltas[Math.floor(Math.random() * deltas.length)];
        var dy = deltas[Math.floor(Math.random() * deltas.length)];
        var newLoc = (x + dx).toString() + ',' + (y + dy).toString()
        if (!(items[newLoc]) && !(newItems[newLoc])) {
          newItems[newLoc] = type
          setNewItem = true
        }
      }
    } else if (Interactions.itemDefs[type].type === 'product') {
      if (tileType && Interactions.tileDefs[tileType].action == 'sells') {
        money += Interactions.itemDefs[type].sells
        setNewItem = true
      } else if (tileType && Interactions.tileDefs[tileType].action == 'moves') {
        var dx = Interactions.tileDefs[tileType].movex
        var dy = Interactions.tileDefs[tileType].movey
        var newLoc = (x + dx).toString() + ',' + (y + dy).toString()
        if (!(items[newLoc]) && !(newItems[newLoc])) {
          newItems[newLoc] = type
          setNewItem = true
        }
      } else if (tileType && Interactions.tileDefs[tileType].action == 'grinds'
          && Interactions.itemDefs[type].packs) { //move blood down
        if (!(items[downLoc]) && !(newItems[downLoc])) {
          newItems[downLoc] = type
          setNewItem = true
        }
      } else if (tileType && Interactions.tileDefs[tileType].action == 'packs'
          && Interactions.itemDefs[type].packs
          && Math.random() < PACK_PROB) {
        newItems[loc] = Interactions.itemDefs[type].packs
        setNewItem = true
      } else if (tileType && Interactions.tileDefs[tileType].action == 'packs'
          && Interactions.itemDefs[type].cooks) { // move raw sausage down
        if (!(items[downLoc]) && !(newItems[downLoc])) {
          newItems[downLoc] = type
          setNewItem = true
        }
      } else if (tileType && Interactions.tileDefs[tileType].action == 'cooks'
          && Interactions.itemDefs[type].cooks
          && Math.random() < COOK_PROB) {
        newItems[loc] = Interactions.itemDefs[type].cooks
        setNewItem = true
      } else if (tileType && Interactions.tileDefs[tileType].action == 'cooks'
          && Interactions.itemDefs[type].sells > 0) { // move finished sausage down
        if (!(items[downLoc]) && !(newItems[downLoc])) {
          newItems[downLoc] = type
          setNewItem = true
        }
      }
    }

    if (!setNewItem) {
      newItems[loc] = type
    }
  }

  items = newItems
}

/* ************************************************
** GAME EVENT HANDLERS
************************************************ */
var setEventHandlers = function () {
  // Socket.IO
  socket.sockets.on('connection', onSocketConnection)
}

// New socket connection
function onSocketConnection (client) {
  util.log('New player has connected: ' + client.id)

  // Listen for client disconnected
  client.on('disconnect', onClientDisconnect)

  // Listen for new player message
  client.on('new player', onNewPlayer)

  // Listen for move player message
  client.on('move player', onMovePlayer)

  client.on('change tile', onChangeTile)

  client.on('query map', onQueryMap)

  client.on('query tile cost', onQueryTileCost)
}

// Socket client has disconnected
function onClientDisconnect () {
  util.log('Player has disconnected: ' + this.id)

  var removePlayer = playerById(this.id)

  // Player not found
  if (!removePlayer) {
    util.log('Player not found: ' + this.id)
    return
  }

  // Remove player from players array
  players.splice(players.indexOf(removePlayer), 1)

  // Broadcast removed player to connected socket clients
  this.broadcast.emit('remove player', {id: this.id})
}

// New player has joined
function onNewPlayer (data) {
  // Create a new player
  var newPlayer = new Player(data.x, data.y)
  newPlayer.id = this.id

  // Broadcast new player to connected socket clients
  this.broadcast.emit('new player', {id: newPlayer.id, x: newPlayer.getX(), y: newPlayer.getY()})

  // Send existing players to the new player
  var i, existingPlayer
  for (i = 0; i < players.length; i++) {
    existingPlayer = players[i]
    this.emit('new player', {id: existingPlayer.id, x: existingPlayer.getX(), y: existingPlayer.getY()})
  }

  // Add new player to the players array
  players.push(newPlayer)
}

// Player has moved
function onMovePlayer (data) {
  // Find player in array
  var movePlayer = playerById(this.id)

  // Player not found
  if (!movePlayer) {
    util.log('Player not found: ' + this.id)
    return
  }

  // Update player position
  movePlayer.setX(data.x)
  movePlayer.setY(data.y)

  // Broadcast updated position to connected socket clients
  this.broadcast.emit('move player', {id: movePlayer.id, x: movePlayer.getX(), y: movePlayer.getY()})
}

function onQueryMap (data) {
  this.emit('update map', {items: items, tiles: tiles, money: money})
}

function onQueryTileCost (data) {
  var cost = (data.tileId === 0) ? 0 : Interactions.tileDefs[data.tileId].cost
  this.emit('update tile cost', {tileId: data.tileId, cost: cost})
}

function onChangeTile (data) {
  // data.x, data.y, data.tileId
  var coord = data.x.toString() + ',' + data.y.toString()
  if (data.tileId === 0 && items[coord]) {
    newItems = {}
    for (var loc in items) {
      if (loc !== coord) {
        newItems[loc] = items[loc]
      }
    }
    items = newItems
  } else if (data.tileId === 0 && tiles[coord]) {
    if (!(data.x === 0 && data.y >= 1 && data.y <= 5)) { // protected zone
      // delete this tile
      newTiles = {}
      for (var loc in tiles) {
        if (loc !== coord) {
          newTiles[loc] = tiles[loc]
        }
      }
      tiles = newTiles
    }
  } else if (data.tileId !== 0) {
    if (!(data.x === 0 && data.y >= 1 && data.y <= 5)) { // protected zone
      var cost = Interactions.tileDefs[data.tileId].cost
      if (money >= cost) {
        tiles[coord] = data.tileId
        money -= cost
      }
    }
  }

  this.broadcast.emit('update map', {items: items, tiles: tiles, money: money})
}

/* ************************************************
** GAME HELPER FUNCTIONS
************************************************ */
// Find player by ID
function playerById (id) {
  var i
  for (i = 0; i < players.length; i++) {
    if (players[i].id === id) {
      return players[i]
    }
  }

  return false
}
