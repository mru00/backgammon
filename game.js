
var Hashids = require('hashids'),
    hashids = new Hashids('xoasld8ouo98dfg');


var CheckerStack = new Class( {
    initialize: function() {
        this.checkers = new Array();
        this.pointnum = 0;
    },
    push: function(checker, namespace) {
        var that = this;
        this.checkers.push(checker);
        this.checkers.forEach(function(c, i){
            c.move(that, that.pointnum, i, namespace);
        });
    },
    pop : function(namespace) {
        var c = this.checkers.pop();
        var that = this;
        this.checkers.forEach(function(c, i){
            c.move(that, that.pointnum, i, namespace);
        });
        return c;
    },
    owner : function() {
        if (this.checkers.length == 0) return undefined;
        return this.checkers[0].color;
    },
    peek : function() {
        if (this.checkers.length == 0) return undefined;
        return this.checkers[this.checkers.length -1];
    },
    size : function() {
        return this.checkers.length;
    }
});


var Point = new Class({
    Extends: CheckerStack,
    initialize : function (pointnum) {
        this.parent();
        this.pointnum = pointnum;
        this.checkers = [];
    },
    is_owned_by : function(player) {
        if (this.checkers.length == 0) return undefined;
        return this.checkers[0].color == player;
    }
});

var Bar = new Class({

    Extends: CheckerStack,
    initialize: function (pointnum) {
        this.parent();
        this.pointnum = pointnum;
    },
    has_player : function(player) {
        return this.owner() == player;
    }
});


var Checker = new Class({
    initialize: function (color) {
        this.color = color;
        this.pointnum = 0;
        this.stacknum = 0;
    },
    move : function(stack, pointnum, stacknum, namespace) {
        //this.stack = stack;
        if (namespace != undefined)
          namespace.emit('move', { from: [this.pointnum, this.stacknum], to: [pointnum, stacknum] });
        this.pointnum = pointnum;
        this.stacknum = stacknum;
    }
});


function Player(color) {
    this.score = 0;
    this.color = color;
    this.opponent = 1-color;
}

var Off = new Class({
    Extends: CheckerStack,
    initialize: function (player) {
        this.parent();
        this.player = player;
    }
});

var Die = new Class({
    initialize : function () {
        this.taken = false;
    },
    roll : function() {
        // visibility will be set by animation
        this.visible = true;
        this.value = Math.floor( Math.random() * 6 );
    }

});

var Dice = new Class({

    initialize: function() {
        this.dice = [ new Die(), new Die(), new Die(), new Die() ];
    },
    roll: function() {
        var that = this;
        this.dice[0].roll();
        this.dice[1].roll();
        if (that.is_double()) {
            that.dice[2].value = that.dice[3].value = that.dice[0].value;
        }
        // visibility set by animation
        that.dice[2].visible = that.dice[3].visible = that.is_double();
    },
    is_double: function() {
        return this.dice[0].value == this.dice[1].value;
    }
});

var Game = new Class({
    initialize: function(id) {
        this.id = id;
        console.log("creating game for id " + id);
        this.board = new Board();
        this.namespace = undefined;
    },
    listen: function(sio){

        var self = this;
        console.log("connecting socket for id " + self.id);

        this.namespace = sio.of('/game/' + self.id);
        this.namespace.on('connection', function(socket) { self.onconnect(socket);} )


    },
    onconnect: function(socket) {
        var self = this;
        console.log('a socket connected to a game ' + this.id);
        socket.emit("id", { id: this.id });
        socket.emit('gamestate', this.board);
        socket.on('roll', function(data, callback) {

            self.board.dice.roll();

            self.board.skip.visible = true;
            self.board.nmove = self.board.dice.is_double()? 4: 2;
            self.board.state = 1;

            self.namespace.emit('gamestate', self.board);
            self.namespace.emit('rolled');
        });
        socket.on('skip', function(data, callback) {
            self.board.finish_move();
            self.namespace.emit('gamestate', self.board);
            socket.emit('finish_move');
        });
        socket.on('bar', function(data, callback) {

            point = self.board.bar[self.board.current_player];
            var die = self.board.dice.dice[self.board.nmove-1];
            if (self.board.test_move(point, die.value, self.namespace)) {
                self.board.nmove --;
                die.taken = true;
                self.board.test_finish_game();
                if (self.board.nmove == 0)  {
                    self.board.finish_move();
                    self.board.state = 0;
                }
                else {
                    // stay
                }

                self.namespace.emit('gamestate', self.board);
            }

        });
        socket.on('point', function(data, callback) {
            point = self.board.points[data];
            var die = self.board.dice.dice[self.board.nmove-1];
            if (self.board.bar[self.board.current_player].size() == 0 && self.board.test_move(point, die.value)) {
                self.board.nmove --;
                die.taken = true;
                self.board.test_finish_game();
                if (self.board.nmove == 0)  {
                    self.board.finish_move();
                    self.board.state = 0;
                }
                else {
                    // stay
                }
                self.namespace.emit('gamestate', self.board);
            }
        });

    }

});


var Board = new Class({
    initialize: function () {
        this.dice = new Dice();
        this.off = [ new Off(0), new Off(1) ];
        this.points = new Array(24);
        this.state = 0;
        this.bar =  [ new Bar(24), new Bar(-1) ];
        for (var i = 0; i<24; i++) {
            this.points[i] = new Point(i);
        }
        this.current_player = 0;
        this.skip = { visible: false };
        this.place_checkers();
    },

    all_in_home : function(player) {
        if (this.bar[player].size() > 0) return false;

        var begin, end;
        if (player == 0) {
            begin = 6; 
            end = 24;
        }
        else {
            begin = 0;
            end = 18;
        }

        for (var i = begin; i < end; i++) {
            var point = this.points[i];
            if ( point.owner() == player) {
                return false;
            }
        }

        return true;
    },

    place_checkers : function() {
        var that = this;
        that.checkers = new Array(30);
        for (var i = 0; i < 15; i ++) {
            that.checkers[i] = new Checker(0);
        }
        for (var i = 15; i < 30; i++) {
            that.checkers[i] = new Checker(1);
        }

        that.points.forEach(function(p,i) {
            p.checkers = [];
        });
        var idx = 0;
        function add_checker(color, pointnum) {
            that.points[pointnum].push(that.checkers[idx++]);
        }

        add_checker(1, 0); add_checker(1, 0);
        add_checker(1, 11); add_checker(1, 11); add_checker(1, 11); add_checker(1, 11); add_checker(1, 11); 
        add_checker(1, 16); add_checker(1, 16); add_checker(1, 16);
        add_checker(1, 18); add_checker(1, 18); add_checker(1, 18); add_checker(1, 18); add_checker(1, 18);


        add_checker(0, 23); add_checker(0, 23);
        add_checker(0, 12); add_checker(0, 12); add_checker(0, 12); add_checker(0, 12); add_checker(0, 12);
        add_checker(0, 7); add_checker(0, 7); add_checker(0, 7);
        add_checker(0, 5); add_checker(0, 5); add_checker(0, 5); add_checker(0, 5); add_checker(0, 5);

    },


    test_move : function(point, amount, namespace) {
        var peeked_checker = point.peek();
        if (peeked_checker == undefined)
          return false;

        if (point.owner() != this.current_player) {
            return false;
        }

        var i = point.pointnum;

        function is_off(target, player) {
            if (player == 0)
              return target < 0;
            return target > 23;
        }

        amount += 1;
        var target = peeked_checker.color == 0 ? i-amount : i+amount;
        var point_target = this.points[target];

        if (is_off(target, this.current_player)) {
            if (this.all_in_home(this.current_player)) {
                this.off[this.current_player].push(point.checkers.pop(namespace), namespace);
                return true;
            }
            return false;
        }

        if (point_target.owner() == 1-this.current_player) {
            if (point_target.size() == 1) {

                this.bar[1-this.current_player].push(point_target.pop(namespace), namespace);
                point_target.push(point.pop(namespace), namespace);
                return true;
            } 
            return false;
        }


        point_target.push(point.pop(namespace), namespace);
        return true;
    },

    test_finish_game : function() {
        // test finished
        if (this.off[this.current_player].checkers.length == 15) {
            this.finish_game();
        }
    },

    finish_game : function() {
        this.finish_move();

        // won!!!
        this.state =0;
        this.bar[0].checkers = [];
        this.bar[1].checkers = [];
        this.off[0].checkers = [];
        this.off[1].checkers = [];
        this.points.forEach(function(point) {
            point.checkers = [];
        });
        this.place_checkers();
    },

    finish_move : function() {

        this.dice.dice.forEach( function(d) {
            d.visible = false;
            d.taken = false;
        });
        this.state = 0;
        this.skip.visible = false;


        this.current_player = 1- this.current_player;
    }

});
var Games = new Class({


    initialize: function() {
        this.games = [];
    },
    create: function(socket) {
        var self = this;
        var id = hashids.encrypt(this.games.length+ 100);
        var game = new Game(id);
        game.listen(socket);
        this.games.push(game);
        console.log('created game ' + id);
    }

});


module.exports = Games;
