
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




function CheckerStack() { }

CheckerStack.prototype.init = function() {
    this.checkers = new Array();
    this.pointnum = 0;
}

CheckerStack.prototype.constructor = CheckerStack();

CheckerStack.prototype.push = function(checker) {
    checker.move(this, this.pointnum, this.checkers.length);
    return this.checkers.push(checker);
}

CheckerStack.prototype.pop = function() {
    return this.checkers.pop();
}

CheckerStack.prototype.owner = function() {
    if (this.checkers.length == 0) return undefined;
    return this.checkers[0].color;
}

CheckerStack.prototype.peek = function() {
    if (this.checkers.length == 0) return undefined;
    return this.checkers[this.checkers.length -1];
}

CheckerStack.prototype.size = function() {
    return this.checkers.length;
}

Point.prototype = new CheckerStack();
Point.prototype.constructor = Point;
function Point(pointnum) {
    CheckerStack.prototype.init.call(this);
    this.pointnum = pointnum;
    this.checkers = [];
    this.rect = this.point_rect();
}


Point.prototype.point_rect = function() {
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
}

Point.prototype.is_owned_by = function(player) {
    if (this.checkers.length == 0) return undefined;
    return this.checkers[0].color == player;
}

Point.prototype.hittest = function(x, y) {
    return point_in_rect(x,y, this.rect);
}

Point.prototype.draw = function(ctx) {
    var self = this;
    this.checkers.forEach(function (p, stacknum) {
        p.draw(ctx, stacknum, self.checkers.length);
    });

    ctx.fillText("" + (this.pointnum + 1), this.get_center(), this.pointnum >= 12? 10 : 435);
}

Point.prototype.get_center = function() {
    var pos = [
      599, 549, 504, 450, 406, 359,
    279, 232, 184, 137, 90, 41
      ];

    if(this.pointnum >= 12) {
        return pos[23-this.pointnum];
    }
    return pos[this.pointnum];
}


Bar.prototype = new CheckerStack();
Bar.prototype.constructor = Bar;
function Bar(pointnum) {
    CheckerStack.prototype.init.call(this);
    this.pointnum = pointnum;
}


Bar.prototype.get_center = function() {
    return 319;
}

Bar.prototype.hittest = function(x, y) {
    return point_in_rect(x,y, [310, 0, 330, 430]);
}

Bar.prototype.draw = function(ctx) {
    this.checkers.forEach(function (p) {
        p.draw(ctx);
    });
}

Bar.prototype.has_player = function(player) {
    return this.owner() == player;
}

function Checker(color) {
    this.color = color;
    this.width = 40;
    this.height = 30;
}

Checker.prototype.move = function(stack, pointnum, stacknum) {
    this.stack = stack;
    this.pointnum = pointnum;
    this.stacknum = stacknum;
}


Checker.prototype.draw = function(ctx, stacknum, totalcheckers) {
    if (! checkerImages[this.color] ) return;

    // on the bar?
    var onbar = board.bar[this.color].checkers.indexOf(this);

    if (onbar == -1 ) {
        var pos = this.get_position(stacknum, totalcheckers);
        var left = pos[0];
        var top = pos[1];
        ctx.drawImage(checkerImages[this.color], left-this.width/2, top);
    } 
    else {
        var left = this.stack.get_center() - this.width/2;
        ctx.drawImage(checkerImages[this.color], left, 100 + 50*onbar);
    }
}

Checker.prototype.get_position = function (stacknum, totalcheckers) {

    var stackoffset;
    if (totalcheckers > 5) {
        stackoffset = 20
    }
    else {
        stackoffset = 35
    }

    var x0, y0;
    var top1 = 17;
    var top2 = 385;
    x0 = this.stack.get_center();
    if (this.pointnum >= 12) {
        y0 = top1 + stacknum*stackoffset;
    }
    else {
        y0 = top2 - stacknum*stackoffset;
    }
    return [x0, y0];
}

function Die() {
    this.roll();
    this.visible = false;
    this.taken = false;
}

Die.prototype.draw = function(ctx, x, y) {
    if (!dieImages[this.value]) return;
    if (this.visible) {
        ctx.save();
        ctx.globalAlpha = this.taken? 0.3: 1;
        ctx.drawImage(dieImages[this.value], x, y);
        ctx.restore();
    }
}

Die.prototype.roll = function() {
    this.value = Math.floor( Math.random() * 6 );
}


function Skip() {
    this.visible = false;
    this.rect = [ 650, 300, 700, 330 ];
}

Skip.prototype.draw = function(ctx, x, y) {
    if (!this.visible) return;
    ctx.save();
    ctx.fillStyle = "#300";
    ctx.fillRect(this.rect[0], this.rect[1], this.rect[2]-this.rect[0], this.rect[3]-this.rect[1]);
    ctx.fillStyle = "#fff";
    ctx.fillText("skip", 10 + this.rect[0], 20 + this.rect[1]);
    ctx.restore();
}

Skip.prototype.hittest = function(x, y) {
    return point_in_rect(x, y, this.rect);
}


function Player() {
}


Off.prototype = new CheckerStack();
Off.prototype.constructor = Off;
function Off(player) {
    CheckerStack.prototype.init.call(this);
    this.player = player;
}


Off.prototype.draw = function(ctx, x, y) {
    var str = this.player == 0? "white" : "black";
    ctx.fillText(str + " " + this.checkers.length, x, y);
}

function Board() {
    this.dice = [ new Die(), new Die(), new Die(), new Die() ];
    this.off = [ new Off(0), new Off(1) ];
    this.points = new Array(24);
    this.state = 0;
    this.bar =  [ new Bar(24), new Bar(-1) ];
    this.skip = new Skip();
    for (var i = 0; i<24; i++) {
        this.points[i] = new Point(i);
    }
    this.current_player = 0;
}

Board.prototype.all_in_home = function(player) {
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
}

Board.prototype.setup = function() {
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

}

Board.prototype.draw = function(ctx) {
    var self = this;
    if (boardImage) {
        ctx.drawImage(boardImage, 0, 0);
    }

    this.points.forEach(function(point, point_index) {
        point.draw(ctx);
    });

    this.dice[0].draw(ctx, 450, 200);
    this.dice[1].draw(ctx, 350, 200);
    this.dice[2].draw(ctx, 250, 200);
    this.dice[3].draw(ctx, 150, 200);

    this.skip.draw(ctx);
    this.bar[0].draw(ctx);
    this.bar[1].draw(ctx);
    this.off[1].draw(ctx, 650, 100);
    this.off[0].draw(ctx, 650, 400);

    var str = this.current_player == 0 ? "white" : "black";
    ctx.fillText("> " + str, 650, 230);
}


function update() {
    redraw();
}


function redraw() {
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

    move(xpos, ypos);
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



function move_checker(point, amount) {
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
    var point_target = board.points[target];

    if (is_off(target, board.current_player)) {
        if (board.all_in_home(board.current_player)) {
            board.off[board.current_player].push(point.checkers.pop());
            return true;
        }
        else {
            return false;
        }
    }
    else if (point_target.owner() == 1-board.current_player) {
        if (point_target.size() == 1) {

            board.bar[1-board.current_player].push(point_target.pop());
            point_target.push(point.pop());
            return true;
        } 
        else {
            return false;
        }
    }
    else {
        point_target.push(point.pop());
        return true;
    }
}

function finish_move() {
    board.dice.forEach( function(d) {
        d.visible = false;
        d.taken = false;
    });
    board.state = 0;
    board.skip.visible = false;


    // test finished
    if (board.off[board.current_player].checkers.length == 15) {
        // won!!!
        board.state =0;
        board.bar[0].checkers = [];
        board.bar[1].checkers = [];
        board.off[0].checkers = [];
        board.off[1].checkers = [];
        board.points.forEach(function(point) {
            point.checkers = [];
        });
        board.setup();
    }

    board.current_player = 1- board.current_player;
}


function move(xpos, ypos) {

    switch (board.state) {
      case 0:

        board.dice[0].roll();
        board.dice[1].roll();
        board.dice[0].visible = board.dice[1].visible = true;

        board.skip.visible = true;
        if (board.dice[0].value == board.dice[1].value) {
            board.dice[2].value = board.dice[3].value = board.dice[0].value;
            board.dice[2].visible = board.dice[3].visible = true;
            board.nmove = 4;
        }
        else {
            board.nmove = 2;
        }

        board.state = 1;
        break;
      case 1:
        var point;
        if (board.skip.hittest(xpos, ypos)) {
            finish_move();
            break;
        }
        else if (board.bar[board.current_player].size() > 0) {
            var hit = board.bar[board.current_player].hittest(xpos, ypos);
            if (!hit) break;
            point = board.bar[board.current_player];
        }
        else {
            point = get_point(xpos, ypos, board.current_player);
            if (point == undefined) break;
            console.log (" hite point " + point.pointnum );
        }


        var die = board.dice[board.nmove-1];
        if (move_checker(point, die.value)) {
            board.nmove --;
            die.taken = true;
            if (board.nmove == 0)  {
                finish_move();
                board.state = 0;
            }
            else {
                // stay
            }
        }
        break;

    }
    redraw();
}


var board = new Board();
var checkerImages = new Array(2);
var dieImages = new Array(6);
var boardImage;

$(document).ready(function() {

    board.setup();
    window.setInterval(redraw, 500);
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
