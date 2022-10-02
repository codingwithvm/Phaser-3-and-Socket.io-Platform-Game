export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene')
        this.platforms
        this.players
        this.stars = {}
        this.score = 0
        this.hud
        this.usernameField
        this.username = 'asdas'
        this.cursors
        this.socket
    }

    preload() {
        this.load.image('sky', '/public/assets/sky.png')
        this.load.image('ground', '/public/assets/platform.png')
        this.load.image('star', '/public/assets/star.png')
        this.load.image('bomb', '/public/assets/bomb.png')
        this.load.spritesheet('dude', '/public/assets/dude.png', {
            frameWidth: 32,
            frameHeight: 48
        })
    }

    addingPlatforms() {
        this.platforms = this.physics.add.staticGroup()
        this.platforms.create(400, 568, 'ground').setScale(2).refreshBody()
        this.platforms.create(600, 400, 'ground')
        this.platforms.create(50, 250, 'ground')
        this.platforms.create(750, 220, 'ground')
    }

    animations() {
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        })

        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 4 }],
            frameRate: 20
        })

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        })
    }

    showScore() {
        this.add.text(10, 10, 'SCORE  : ', { fontFamily: 'Roboto' })
        this.hud = this.add.text(80, 10, + this.score, { fontFamily: 'Roboto' })
    }

    create() {
        
        this.socket = io()
        this.socket.on('connect', () => {
            this.add.image(400, 300, 'sky')

            this.animations()
            this.addingPlatforms()
            this.showScore()

            this.socket.on('newPlayer', player => {
                this.players[player.id] = player
                const playerAdded = this.players[player.id]
                
                playerAdded.physics = this.physics.add.sprite(
                    player.position.x, 
                    player.position.y, 
                    'dude'
                )
                playerAdded.physics.setBounce(0.2)
                playerAdded.physics.setCollideWorldBounds(true)

                this.physics.add.collider(playerAdded.physics, this.platforms)
            })

            this.socket.on('currentPlayers', socketPlayers => {
                this.players = socketPlayers

                for(const i in this.players) {
                    const player = this.players[i]

                    player.physics = this.physics.add.sprite(
                        player.position.x, 
                        player.position.y, 
                        'dude'
                    )
                    player.physics.setBounce(0.2)
                    player.physics.setCollideWorldBounds(true)

                    this.physics.add.collider(player.physics, this.platforms)
                }
            })

            this.socket.on('setInterval', starInfo => {
                const { id, x, y } = starInfo
                this.stars[id] = {
                    x: x,
                    y: y
                }

                this.stars[id].physics = this.physics.add.sprite(this.stars[id].x, this.stars[id].y, 'star')
                this.stars[id].physics.setBounce(0.4)
                this.stars[id].physics.setCollideWorldBounds(true)

                this.physics.add.collider(this.stars[id].physics, this.platforms)
            })

            this.socket.on('disconnectPlayer', socketDisconnected => {
                this.players[socketDisconnected].physics.destroy()

                delete this.players[socketDisconnected]
            })

            // Updating pos
            this.socket.on('sendNewPos', playerInfo => {
                const { id, x, y } = playerInfo

                this.players[id].physics.x = x
                this.players[id].physics.y = y
            })

            // Update Key Event
            this.socket.on('updatePlayerKeyEvent', playerKeyEvent => {
                const { id, key } = playerKeyEvent

                if(key === 'movingLeft') {
                    this.players[id].physics.anims.play('left', true)
                }
                else if(key === 'movingRight') {
                    this.players[id].physics.anims.play('right', true)
                }
                else {
                    this.players[id].physics.anims.play('turn', true)
                }
            })

            this.cursors = this.input.keyboard.createCursorKeys()
        })
    }

    update() {
        // Gravity update
        if(this.players){
            this.hud.text = this.score

            if(this.usernameField) {
                this.usernameField.x = 
                    this.players[this.socket.id].physics.x -
                    this.players[this.socket.id].physics.width / 2
                this.usernameField.y = 
                    this.players[this.socket.id].physics.y -
                    this.players[this.socket.id].physics.height
            }

            for(const i in this.stars) {
                const star = this.stars[i].physics
    
                this.physics.add.collider(this.players[this.socket.id].physics, star, () => {
                    star.destroy()
                    delete this.stars[i]
                    this.score += 1
                })
            }

            this.socket.emit('currentPlayerPos', {
                id: this.socket.id,
                x: Math.floor(this.players[this.socket.id].physics.x),
                y: Math.floor(this.players[this.socket.id].physics.y)
            })

            // Curosors update
            if(this.cursors) {
                if(this.cursors.left.isDown) {
                    this.players[this.socket.id].physics.setVelocityX(-160),
                    this.players[this.socket.id].physics.anims.play('left', true)
                    this.socket.emit('sendKeyEvent', { id: this.socket.id, key: 'movingLeft' })
                }
                else if(this.cursors.right.isDown)  {
                    this.players[this.socket.id].physics.setVelocityX(160)
                    this.players[this.socket.id].physics.anims.play('right', true)
                    this.socket.emit('sendKeyEvent', { id: this.socket.id, key: 'movingRight' })
                }
                else {
                    this.players[this.socket.id].physics.setVelocityX(0)
                    this.players[this.socket.id].physics.anims.play('turn')
                    this.socket.emit('sendKeyEvent', { id: this.socket.id, key: 'turn' })
                }
        
                if(this.cursors.up.isDown && this.players[this.socket.id].physics.body.touching.down) {
                    this.players[this.socket.id].physics.setVelocityY(-330)
                }
            }
        }
    }
}