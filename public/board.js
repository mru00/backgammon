
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
    push: function(checker) {
        var self = this;
        this.checkers.push(checker);
        this.checkers.forEach(function(c, i){
            c.move(self, self.pointnum, i);
        });
    },
    pop : function() {
        var c = this.checkers.pop();
        var self = this;
        this.checkers.forEach(function(c, i){
            c.move(self, self.pointnum, i);
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
        this.rect = this.point_rect();
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
        var self = this;
        this.checkers.forEach(function (p, stacknum) {
            p.draw(ctx, self.get_position(stacknum));
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
    get_center : function() {
        return 319;
    },
    hittest : function(x, y) {
        return point_in_rect(x,y, [310, 0, 330, 430]);
    },
    draw : function(ctx) {
        var self = this;
        this.checkers.forEach(function (p, i) {
            p.draw(ctx, [ self.get_center(), 100 + 50*i ] );
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
        var self = this;

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
    },

    move : function(stack, pointnum, stacknum) {
        if (this.stack != undefined) {
            var from_position = [this.position[0], this.position[1]];
            var to_position = stack.get_position(stacknum);
            var self = this;

            new Animation(10, function(alpha) {
                self.position = alpha_blend_position(alpha, from_position, to_position);
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

var Die = new Class({
    initialize : function (position) {
        this.roll();
        this.visible = false;
        this.taken = false;
        this.target_position = position;
        this.position = [ position[0], position[1] ];
        this.rotation = 0;
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

    roll : function(on_finish) {
        var self = this;
        this.visible = true;
        this.value = Math.floor( Math.random() * 6 );
        this.position = [ 600, 300 ];
        new Animation(10, function(alpha) {
            self.position = alpha_blend_position(alpha, [600, 300], self.target_position);
            self.rotation = alpha;
        }, on_finish);
    }

});


var Skip = new Class({

    initialize: function () {
        this.visible = false;
        this.rect = [ 650, 300, 700, 330 ];
    },

    draw : function(ctx, x, y) {
        if (!this.visible) return;
        ctx.save();
        ctx.fillStyle = "#300";
        ctx.fillRect(this.rect[0], this.rect[1], this.rect[2]-this.rect[0], this.rect[3]-this.rect[1]);
        ctx.fillStyle = "#fff";
        ctx.fillText("skip", 10 + this.rect[0], 20 + this.rect[1]);
        ctx.restore();
    },

    hittest : function(x, y) {
        return point_in_rect(x, y, this.rect);
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
    draw : function(ctx, x, y) {
        var str = this.player == 0? "white" : "black";
        ctx.fillText(str + " " + this.checkers.length, x, y);
    },
    get_position: function() {
        return [ 600, 300];
    }

});


var Dice = new Class({

    initialize: function() {
        this.dice = [ new Die([450, 200]), new Die([350, 200]), new Die([250, 200]), new Die([150, 200]) ];
    },
    roll: function() {
        var self = this;
        this.dice[0].roll();
        this.dice[1].roll(function() {
            if (self.is_double()) {
                self.dice[2].value = self.dice[3].value = self.dice[0].value;
                new Animation(10, function(alpha){

                    self.dice[2].position = alpha_blend_position(alpha, self.dice[0].target_position, self.dice[2].target_position);
                    self.dice[3].position = alpha_blend_position(alpha, self.dice[3].target_position, self.dice[3].target_position);

                    self.dice[2].visible = self.dice[3].visible = true;
                });
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
        for (var i = 0; i<24; i++) {
            this.points[i] = new Point(i);
        }
        this.current_player = 0;
    },

    all_in_home : function(player) {
        if (board.bar[player].size() > 0) return false;

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

    setup : function() {
        var self = this;
        function add_checker(color, pointnum) {
            self.points[pointnum].push(new Checker(color));
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

    draw : function(ctx) {
        var self = this;
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

    test_move : function(point, amount) {
        var peeked_checker = point.peek();
        if (peeked_checker == undefined)
          return false;

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
                this.off[this.current_player].push(point.checkers.pop());
                return true;
            }
            return false;
        }

        if (point_target.owner() == 1-this.current_player) {
            if (point_target.size() == 1) {

                this.bar[1-this.current_player].push(point_target.pop());
                point_target.push(point.pop());
                return true;
            } 
            return false;
        }


        point_target.push(point.pop());
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
        this.setup();
    },

    finish_move : function() {

        this.dice.dice.forEach( function(d) {
            d.visible = false;
            d.taken = false;
        });
        this.state = 0;
        this.skip.visible = false;


        this.current_player = 1- this.current_player;
    },


    onaction : function(xpos, ypos) {

        running_animations.forEach(function(a) {
            a.stop();
        });

        switch (this.state) {
          case 0:

            this.dice.roll();

            this.skip.visible = true;
            if (this.dice.is_double()){
                this.nmove = 4;
            }
            else {
                this.nmove = 2;
            }

            this.state = 1;
            break;
          case 1:
            var point;
            if (this.skip.hittest(xpos, ypos)) {
                this.finish_move();
                break;
            }
            else if (this.bar[this.current_player].size() > 0) {
                var hit = this.bar[this.current_player].hittest(xpos, ypos);
                if (!hit) break;
                point = this.bar[this.current_player];
            }
            else {
                point = get_point(xpos, ypos, this.current_player);
                if (point == undefined) break;
                console.log ("hit point " + point.pointnum );
            }


            var die = this.dice.dice[this.nmove-1];
            if (this.test_move(point, die.value)) {
                this.nmove --;
                die.taken = true;
                this.test_finish_game();
                if (this.nmove == 0)  {
                    this.finish_move();
                    this.state = 0;
                }
                else {
                    // stay
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
        if (point.owner() == player && point.hittest(x, y)) {
            return point;
        }
    }
    return undefined;
}





var board = new Board();
var checkerImages = new Array(2);
var dieImages = new Array(6);
var boardImage;

$(document).ready(function() {

    board.setup();
    window.setInterval(redraw, 50);
    boardImage = new Image();
    boardImage.src = "/board.png";
    checkerImages[0] = new Image();
    checkerImages[1] = new Image();
    checkerImages[0].src = "/piece_white.png";
    checkerImages[1].src = "/piece_black.png";
    for (var i = 0; i < 6; i++ ) {
        dieImages[i] = new Image();
        dieImages[i].src = "/die_" + (i+1) + ".png"
    }
    redraw();

    $('#canvas').bind('mousedown', onclick);
});
