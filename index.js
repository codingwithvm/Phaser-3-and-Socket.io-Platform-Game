const express = require('express')
const app = express()
const http = require('http')
const path = require('path')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

app.use('/public', express.static(`${__dirname}/public`))
app.use(express.static('public'))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'))
})

const players = {}
const stars = {}

class Player {
    constructor({ id, position }) {
        this.id = id
        this.position = position
    }
}

io.on('connection', socket => {
    console.log(`user with ID : ${socket.id} has connected`)

    players[socket.id] = new Player({
        id: socket.id,
        position: {
            x: Math.floor(Math.random() * 800),
            y: Math.floor(Math.random() * 600 / 2)
        }
    })

    socket.emit('currentPlayers', players)
    socket.broadcast.emit('newPlayer', players[socket.id])

    socket.on('currentPlayerPos', playerInfo => {
        const { id, x, y } = playerInfo

        players[id].position.x = x
        players[id].position.y = y

        socket.broadcast.emit('sendNewPos', {
            id,
            x,
            y
        })
    })

    socket.on('sendKeyEvent', playerKeyEventUpdate => {
        const { id, key } = playerKeyEventUpdate

        socket.broadcast.emit('updatePlayerKeyEvent', {
            id,
            key
        })
    })

    setInterval(() => {
        const id = Math.floor(Math.random() * 10000000)
        const x = Math.floor(Math.random() * 800)
        const y = Math.floor(Math.random() * 600 / 2)

        socket.broadcast.emit('setInterval', {
            id, 
            x: x, 
            y: y
        })
    }, 12000)

    socket.on('disconnect', () => {
        console.log(`user with ID : ${socket.id} has disconnected`)

        delete players[socket.id]
        socket.broadcast.emit('disconnectPlayer', socket.id)
    })
})

server.listen(3000, () => {
    console.log('Listening on port 3000')
})