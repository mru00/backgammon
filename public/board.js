
// not index-corrected:
//
// 13 14 15 16 17 18 | 19 20 21 22 23 24
// 
// 12 11 10  9  8  7 |  6  5  4  3  2  1 


function point_in_rect(x, y, rect) {
    if ( x < rect[0] ) return false;
    if ( y < rect[1] ) return false;
    if ( x > rect[2] ) return false;
    if ( y > rect[3] ) return false;
    return true;
}

function alpha_blend_position(alpha, from, to) {
    return [ ((1-alpha) * from[0] + (alpha)*to[0]),
           ((1-alpha) * from[1] + alpha*to[1])
             ];
}

var CheckerStack = new Class( {
    initialize: function() {
        this.checkers = new Array();
        this.pointnum = 0;
    },
    load: function(data) {
        var that = this;
        that.checkers = [];
        data.checkers.forEach(function(e,i) {
            var checker = new Checker();
            checker.load(e);
            that.checkers.push(checker);
        });
        this.checkers.forEach(function(c, i){
            c.move(that, that.pointnum, i);
        });
    },
    size: function() {
        return this.checkers.length;
    }
});


var Point = new Class({
    Extends: CheckerStack,
    initialize : function (pointnum) {
        this.parent();
        this.pointnum = pointnum;
        this.checkers = [];
        this.rect = this.point_rect();
    },
    load: function(data) {
        this.parent(data);
        this.pointnum = data.pointnum;
    },
    point_rect: function() {
        var center = this.get_center();

        var y0, y1;
        var top1 = 17;
        var top2 = 385;
        var testheight = 170;
        if (this.pointnum >= 12) {
            y0 = top1 - 30;
            y1 = top1 + testheight;
        }
        else {
            y0 = top2 - testheight;
            y1 = top2 + 30;
        }
        return [ center - 25, y0, center +25, y1];
    },

    is_owned_by : function(player) {
        if (this.checkers.length == 0) return undefined;
        return this.checkers[0].color == player;
    },

    hittest : function(x, y) {
        return point_in_rect(x,y, this.rect);
    },

    draw : function(ctx) {
        var that = this;
        this.checkers.forEach(function (p, stacknum) {
            p.draw(ctx, that.get_position(stacknum));
        });

        ctx.fillText("" + (this.pointnum + 1), this.get_center(), this.pointnum >= 12? 10 : 435);
    },

    get_center : function() {
        var pos = [
          599, 549, 504, 450, 406, 359,
        279, 232, 184, 137, 90, 41
          ];

        if(this.pointnum >= 12) {
            return pos[23-this.pointnum];
        }
        return pos[this.pointnum];
    },

    get_position : function (stacknum) {

        var stackoffset;
        if (this.size() > 5) {
            stackoffset = 20
        }
        else {
            stackoffset = 35
        }

        var x0, y0;
        var top1 = 17;
        var top2 = 385;
        x0 = this.get_center();
        if (this.pointnum >= 12) {
            y0 = top1 + stacknum*stackoffset;
        }
        else {
            y0 = top2 - stacknum*stackoffset;
        }
        return [x0, y0];
    }
});

var Bar = new Class({

    Extends: CheckerStack,
    initialize: function (pointnum) {
        this.parent();
        this.pointnum = pointnum;
    },
    load: function(data) {
        this.parent(data);
        this.pointnum = data.pointnum;
    },
    get_center : function() {
        return 319;
    },
    hittest : function(x, y) {
        return point_in_rect(x,y, [310, 0, 330, 430]);
    },
    draw : function(ctx) {
        var that = this;
        this.checkers.forEach(function (p, i) {
            p.draw(ctx, [ that.get_center(), 100 + 50*i ] );
        });
    },
    has_player : function(player) {
        return this.owner() == player;
    }, 
    get_position: function() {
        return [ this.get_center(), 100 ];
    }
});


var running_animations = [];
var Animation = new Class({
    initialize: function(steps, on_step, on_finished) {
        this.step = 0;
        this.steps = steps;
        this.is_running = true;
        this.on_finish = on_finished;
        this.on_step = on_step;
        running_animations.push(this);
        var that = this;

    },
    advance: function() {
        if (!this.is_running) {
            running_animations.splice(running_animations.indexOf(this), 1);
            return;
        }
        this.step ++;
        this.on_step(this.step/this.steps);
        if (this.step == this.steps) {
            this.finish();
        }
    },
    stop: function() {
        if (!this.is_running)
          return;
        this.finish();
    },
    is_running: false,
    finish: function() {
        this.is_running = false;
        if (this.step < this.steps) {
            this.on_step(1);
        }
        if (this.on_finish != null) this.on_finish();
    }
});


var Checker = new Class({
    initialize: function (color) {
        this.color = color;
        this.width = 40;
        this.height = 30;
        this.position = [0, 0];
        this.stacknum = 0;
        this.pointnum = 0;
    },

    load: function(data) {
        this.color = data.color;



        this.pointnum = data.pointnum;
        this.stacknum = data.stacknum;
    },
    move : function(stack, pointnum, stacknum) {
        if (this.stack != undefined) {
            var from_position = [this.position[0], this.position[1]];
            var to_position = stack.get_position(stacknum);
            var that = this;

            new Animation(10, function(alpha) {
                that.position = alpha_blend_position(alpha, from_position, to_position);
            });

        }
        else {
            this.position = stack.get_position(stacknum);
        }
        this.stack = stack;
        this.pointnum = pointnum;
        this.stacknum = stacknum;
    },


    draw : function(ctx, position) {
        if (! checkerImages[this.color] ) return;

        var left = this.position[0];
        var top = this.position[1];
        ctx.drawImage(checkerImages[this.color], left-this.width/2, top);
    }
});



var Button = new Class({

    initialize: function (rect, title) {
        this.visible = false;
        this.rect = rect;
        this.title = title;
    },

    draw : function(ctx, x, y) {
        if (!this.visible) return;
        ctx.save();
        ctx.fillStyle = "#300";
        ctx.fillRect(this.rect[0], this.rect[1], this.rect[2]-this.rect[0], this.rect[3]-this.rect[1]);
        ctx.fillStyle = "#fff";
        ctx.fillText(this.title, 10 + this.rect[0], 20 + this.rect[1]);
        ctx.restore();
    },

    hittest : function(x, y) {
        return point_in_rect(x, y, this.rect);
    }

});


var Skip = new Class({
    Extends: Button,
    initialize: function () {
        this.parent([ 650, 300, 700, 330 ], "skip");
        this.visible = false;
    },
    load: function(data) {
        this.visible = data.visible;
    }
});


var Roll = new Class({
    Extends: Button,
    initialize: function () {
        this.parent([ 650, 100, 700, 130 ], "roll");
        this.visible = false;
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
    },
    load: function(data) {
        this.parent(data);
        this.player = data.player;
    },
    draw : function(ctx, x, y) {
        var str = this.player == 0? "white" : "black";
        if (this.player == board.current_player) {
            ctx.save();
            ctx.fillStyle = "green";
            ctx.fillRect(x - 5, y - 9, 40, 20);
            ctx.restore();
        }
        ctx.fillText(str + " " + this.checkers.length, x, y);
    },
    get_position: function() {
        return [ 600, 300];
    }

});


var Die = new Class({
    initialize : function (position) {
        this.roll();
        this.visible = false;
        this.taken = false;
        this.target_position = position;
        this.position = [ position[0], position[1] ];
        this.rotation = 0;
        this.start_position = [ 600, 300 ];
    },

    draw : function(ctx, x, y) {
        if (!dieImages[this.value]) return;
        if (this.visible) {
            ctx.save();
            ctx.globalAlpha = this.taken? 0.3: 1;
            ctx.translate(this.position[0], this.position[1]); 
            ctx.rotate(100*this.rotation);
            ctx.drawImage(dieImages[this.value], -24, -24);
            ctx.restore();
        }
    },
    load: function(data) {
        for (key in data) {
            this[key] = data[key];
        }
    },

    roll : function(on_finish) {
        var that = this;
        this.visible = true;
        this.position = that.start_position;
        new Animation(10, function(alpha) {
            that.position = alpha_blend_position(alpha, that.start_position, that.target_position);
            that.rotation = alpha;
        }, on_finish);
    }

});
var Dice = new Class({

    initialize: function() {
        this.dice = [ new Die([470, 220]), new Die([370, 220]), new Die([270, 220]), new Die([170, 220]) ];
        this.dice[2].start_position = this.dice[0].start_position;
        this.dice[3].start_position = this.dice[1].start_position;
    },
    load: function(data) {
        var that = this;
        for (var i = 0; i < 4; i++) {
            that.dice[i].load(data.dice[i]);
        }
    },
    roll: function(data) {
        var that = this;
        this.dice[0].roll();
        this.dice[1].roll(function() {
            if (that.is_double()) {
                that.dice[2].roll();
                that.dice[3].roll();
            }
        });
    },
    draw: function(ctx) {
        this.dice.forEach(function(d) { d.draw(ctx); });
    },
    is_double: function() {
        return this.dice[0].value == this.dice[1].value;
    }
});

var Board = new Class({
    initialize: function () {
        this.dice = new Dice();
        this.off = [ new Off(0), new Off(1) ];
        this.points = new Array(24);
        this.state = 0;
        this.bar =  [ new Bar(24), new Bar(-1) ];
        this.skip = new Skip();
        this.checkers = new Array(30);
        for (var i = 0; i<24; i++) {
            this.points[i] = new Point(i);
        }
        this.current_player = 0;
        this.socket = undefined; // set later
    },
    load: function(data) {
        var that = this;
        console.log('loading gamestate, state=' + data.state);
        this.current_player = data.current_player;
        this.bar.forEach(function(e,i) { e.load(data.bar[i]); });
        this.off.forEach(function(e,i) { e.load(data.off[i]); });
        this.dice.load(data.dice);
        this.skip.load(data.skip);
        this.checkers.forEach(function(e,i) {
            e.load(data.checkers[i]);
        });
        this.points.forEach(function(e,i) { e.load(data.points[i]);  });
        this.state = data.state;
        needs_redraw = true;
    },

    draw : function(ctx) {
        var that = this;
        if (boardImage) {
            ctx.drawImage(boardImage, 0, 0);
        }

        this.points.forEach(function(point) {
            point.draw(ctx);
        });

        this.dice.draw(ctx);

        this.skip.draw(ctx);
        this.bar[0].draw(ctx);
        this.bar[1].draw(ctx);
        this.off[1].draw(ctx, 650, 100);
        this.off[0].draw(ctx, 650, 400);

        var str = this.current_player == 0 ? "white" : "black";
        ctx.fillText("> " + str, 650, 230);
    },



    onaction : function(xpos, ypos) {
        var that = this;

        console.log("action, state=" + this.state);
        running_animations.forEach(function(a) {
            a.stop();
        });

        switch (this.state) {
          case 0:

            socket.emit('roll');
            that.state = -1;

            break;
          case 1:
            var point;
            if (this.skip.hittest(xpos, ypos)) {
                socket.emit('skip');
                state = -1;
                break;
            }
            else if (this.bar[this.current_player].hittest(xpos, ypos)) {
                socket.emit('bar');
                state = -1;
                break;
            }
            else {
                point = get_point(xpos, ypos, this.current_player);
                if (point != undefined) {
                    console.log('clicked point');
                    socket.emit('point', point.pointnum);
                    state = -1;
                }
            }

            break;

        }
        needs_redraw = true;
    }

});


function update() {
    needs_redraw = true;
}


var needs_redraw = true;
function redraw() {

    running_animations.forEach(function (a) {
        a.advance();
    });

    if (!imageHandler.is_complete()) return;
    if (running_animations.length ==0 && !needs_redraw) return;

    needs_redraw = false;
    var canvas = $("#canvas")[0];
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    board.draw(ctx);
}

function onclick(evt) {

    var xpos, ypos;
    var canvas = $('#canvas');
    if(evt.offsetX==undefined) // this works for Firefox
      {
        xpos = evt.pageX-canvas.offset().left;
        ypos = evt.pageY-canvas.offset().top;
      }             
    else                     // works in Google Chrome
      {
        xpos = evt.offsetX;
        ypos = evt.offsetY;
      }

    board.onaction(xpos, ypos);
    return false;
}

function get_point(x, y, player) {
    for (var i = 0; i < 24; i++) {
        var point = board.points[i];
        if (point.hittest(x, y)) {
            return point;
        }
    }
    return undefined;
}


var ImageHandler = new Class({
    initialize: function() {
        this.waiting = 0;
    },
    load_image: function(url) {
        this.waiting ++;
        var that = this;
        var img = new Image();
        img.onload = function() { that.waiting --; }
        img.src = url;
        return img;
    },
    is_complete: function() {
        return this.waiting == 0;
    }

});



var board = new Board();
var checkerImages = new Array(2);
var dieImages = new Array(6);
var boardImage;
var imageHandler = new ImageHandler();
var socket = undefined;


$(document).ready(function() {

    window.setInterval(redraw, 20);
    boardImage = imageHandler.load_image("/board.png");
    checkerImages[0] = imageHandler.load_image("/piece_white.png");
    checkerImages[1] = imageHandler.load_image("/piece_black.png");
    for (var i = 0; i < 6; i++ ) {
        dieImages[i] = imageHandler.load_image("/die_" + (i+1) + ".png")
    }
    redraw();

    $('#canvas').bind('mousedown', onclick);


    socket = io.connect('ws://backgammon-mru.rhcloud.com:8000/game/qkV');
    socket.on('id', function(data) {
        
    });
    socket.on('gamestate', function(data) {
        board.load(data);
    });
    socket.on('rolled', function(data) {
        board.dice.roll();
    });
    socket.on('move', function(data) {

    });
    socket.on('finish_move', function(data) {
    });
    board.socket = socket;
});
