
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





function Pike(pikenum) {
    this.pikenum = pikenum;
    this.rect = this.pike_rect();
    this.pieces = [];
}

Pike.prototype.pike_rect = function() {
    var center = Pike.get_pike_center(this.pikenum);

    var y0, y1;
    var top1 = 17;
    var top2 = 385;
    var testheight = 170;
    if (this.pikenum >= 12) {
        y0 = top1 - 30;
        y1 = top1 + testheight;
    }
    else {
        y0 = top2 - testheight;
        y1 = top2 + 30;
    }
    return [ center - 25, y0, center +25, y1];
}

Pike.prototype.is_owned_by = function(player) {
    if (this.pieces.length == 0) return undefined;
    return this.pieces[0].color == player;
}

Pike.prototype.hittest = function(x, y) {
    return point_in_rect(x,y, this.rect);
}

Pike.prototype.draw = function(ctx) {
    var self = this;
    this.pieces.forEach(function (p, stacknum) {
        p.draw(ctx, stacknum, self.pieces.length);
    });

    ctx.fillText("" + (this.pikenum + 1), Pike.get_pike_center(this.pikenum), this.pikenum >= 12? 10 : 435);
}

Pike.get_pike_center = function(pikenum) {
    var pos = [
      599, 549, 504, 450, 406, 359,
    279, 232, 184, 137, 90, 41
      ];

    if(pikenum >= 12) {
        return pos[23-pikenum];
    }
    return pos[pikenum];
}


function Bar() {
    this.pieces = [];
    this.pikenum = -1;
}

Bar.prototype.hittest = function(x, y) {
    return point_in_rect(x,y, [310, 0, 330, 430]);
}

Bar.prototype.draw = function(ctx) {
    this.pieces.forEach(function (p) {
        p.draw(ctx);
    });
}

Bar.prototype.has_player = function(player) {
    if (this.pieces.length == 0) return false;
    return this.pieces[0].color == player;
}

function Piece(color, pikenum, stacknum) {
    this.color = color;
    this.width = 30;
    this.height = 30;
    this.move(pikenum, stacknum);
}

Piece.prototype.move = function(pikenum, stacknum) {
    this.pikenum = pikenum;
    this.stacknum = stacknum;
}


Piece.prototype.draw = function(ctx, stacknum, totalpieces) {
    if (! pieceImages[this.color] ) return;

    // on the bar?
    var onbar = board.bar.pieces.indexOf(this);

    if (onbar == -1 ) {
        var pos = this.get_position(stacknum, totalpieces);
        var left = pos[0];
        var top = pos[1];
        ctx.drawImage(pieceImages[this.color], left-this.width/2, top);
    } 
    else {
        ctx.drawImage(pieceImages[this.color], 290, 100 + 50*onbar);
    }
}

Piece.prototype.get_position = function (stacknum, totalpieces) {

    var stackoffset;
    if (totalpieces > 5) {
        stackoffset = 20
    }
    else {
        stackoffset = 35
    }

    var x0, y0;
    var top1 = 17;
    var top2 = 385;
    x0 = Pike.get_pike_center(this.pikenum);
    if (this.pikenum >= 12) {
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
    ctx.fillStyle = "#800";
    ctx.fillRect(this.rect[0], this.rect[1], this.rect[2]-this.rect[0], this.rect[3]-this.rect[1]);
    ctx.restore();
    ctx.fillText("skip", this.rect[0], 20 + this.rect[1]);
}

Skip.prototype.hittest = function(x, y) {
    return point_in_rect(x, y, this.rect);
}


function Player() {
}


function Off(player) {
    this.player = player;
    this.pieces = [];
}

Off.prototype.draw = function(ctx, x, y) {
    var str = this.player == 0? "white" : "black";
    ctx.fillText(str + " " + this.pieces.length, x, y);
}

function Board() {
    this.dice = [ new Die(), new Die(), new Die(), new Die() ];
    this.off = [ new Off(0), new Off(1) ];
    this.pikes = new Array(24);
    this.state = 0;
    this.bar = new Bar();
    this.skip = new Skip();
    for (var i = 0; i<24; i++) {
        this.pikes[i] = new Pike(i);
    }
    this.current_player = 0;
}

Board.prototype.all_in_home = function(player) {
    if (board.bar.has_player(player)) return false;

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
        var pike = this.pikes[i];
        if ( pike.pieces.length > 0 && pike.pieces[0].color == player) {
          return false;
        }
    }

    return true;
}

Board.prototype.setup = function() {
    var self = this;
    function add_piece(color, pikenum) {
        self.pikes[pikenum].pieces.push(new Piece(color, pikenum, self.pikes[pikenum].pieces.length));
    }

    add_piece(0, 0);
    add_piece(0, 0);
    add_piece(0, 11);
    add_piece(0, 11);
    add_piece(0, 11);
    add_piece(0, 11);
    add_piece(0, 11);

    add_piece(0, 16);
    add_piece(0, 16);
    add_piece(0, 16);

    add_piece(0, 18);
    add_piece(0, 18);
    add_piece(0, 18);
    add_piece(0, 18);
    add_piece(0, 18);


    add_piece(1, 23);
    add_piece(1, 23);

    add_piece(1, 12);
    add_piece(1, 12);
    add_piece(1, 12);
    add_piece(1, 12);
    add_piece(1, 12);

    add_piece(1, 7);
    add_piece(1, 7);
    add_piece(1, 7);

    add_piece(1, 5);
    add_piece(1, 5);
    add_piece(1, 5);
    add_piece(1, 5);
    add_piece(1, 5);
}

Board.prototype.draw = function(ctx) {
    var self = this;
    if (boardImage) {
        ctx.drawImage(boardImage, 0, 0);
    }

    this.pikes.forEach(function(pike, pike_index) {
        pike.draw(ctx);
    });

    this.dice[0].draw(ctx, 450, 200);
    this.dice[1].draw(ctx, 350, 200);
    this.dice[2].draw(ctx, 250, 200);
    this.dice[3].draw(ctx, 150, 200);

    this.skip.draw(ctx);
    this.bar.draw(ctx);
    this.off[1].draw(ctx, 650, 100);
    this.off[0].draw(ctx, 650, 400);

    var str = this.current_player == 0? "white" : "black";
    if (this.all_in_home(this.current_player)) {
        str += " home!";
    }
    else {
        str += " not home";
    }
    ctx.fillText(str, 20, 10);
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

function get_pike(x, y, player) {
    for (var i = 0; i < 24; i++) {
        var pike = board.pikes[i];
        if (pike.pieces.length == 0) continue;
        if (pike.pieces[0].color != player) continue;
        if (pike.hittest(x, y)) {
            return pike;

        }
    }
    return undefined;
}


function move_to_bar(piece) {
    board.bar.pieces.push(piece);
}


function move_piece(pike, amount) {
    if (pike.pieces.length == 0)
      return false;
    var piece = pike.pieces[pike.pieces.length-1];
    var i = pike.pikenum;
    // special: pike is bar
    if (pike.pikenum == -1 ) {
        if (piece.color == 0) {
            i = 24;
        }
    }

    function is_off(target, player) {
        if (player == 0)
          return target < 0;
        return target > 23;
    }

    amount += 1;
    var target = piece.color == 0 ? i-amount : i+amount;
    var pike_target = board.pikes[target];

    if (board.all_in_home(piece.color) && is_off(target, piece.color)) {
        pike.pieces.pop();
        board.off[piece.color].pieces.push(piece);
        return true;
    }
    else if (is_off(target, piece.color)) {
        return false;
    }
    else if (pike_target.pieces.length == 1 && pike_target.pieces[0].color != piece.color) {
        move_to_bar(pike_target.pieces.pop());
        pike.pieces.pop();
        piece.move(target, pike_target.pieces.length);
        pike_target.pieces.push(piece);
        return true;
    }
    else if (pike_target.pieces.length > 0 && pike_target.pieces[0].color != piece.color) {
        return false;
    }
    else {

        pike.pieces.pop();
        piece.move(target, pike_target.pieces.length);
        pike_target.pieces.push(piece);
        return true;
    }
}

function finish_move() {
    board.dice.forEach( function(d) {
        d.visible = false;
        d.taken = false;
    });
    board.state = 0;
    board.current_player = 1- board.current_player;
    board.skip.visible = false;
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
        var pike;
        if (board.skip.hittest(xpos, ypos)) {
            finish_move();
            break;
        }
        else if (board.bar.has_player(board.current_player)) {
            var hit = board.bar.hittest(xpos, ypos);
            if (!hit) break;
            pike = board.bar;
        }
        else {
            pike = get_pike(xpos, ypos, board.current_player);
            if (pike == undefined) break;
        }


        var die = board.dice[board.nmove-1];
        if (move_piece(pike, die.value)) {
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
var pieceImages = new Array(2);
var dieImages = new Array(6);
var boardImage;

$(document).ready(function() {

    board.setup();
    window.setInterval(redraw, 500);
    boardImage = new Image();
    boardImage.src = "/board.png";
    pieceImages[0] = new Image();
    pieceImages[1] = new Image();
    pieceImages[0].src = "/piece_white.png";
    pieceImages[1].src = "/piece_black.png";
    for (var i = 0; i < 6; i++ ) {
        dieImages[i] = new Image();
        dieImages[i].src = "/die_" + (i+1) + ".png"
    }
    redraw();

    $('#canvas').bind('mousedown', onclick);
});
