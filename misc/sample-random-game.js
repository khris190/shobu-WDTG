const shobu = require('../shobu.js');

const LIMIT_OF_MOVES = 2000;

let state = shobu.createInitialState();
let player = 0;
let nofMove = 0;
while (shobu.isGameOver(state) === false && nofMove < LIMIT_OF_MOVES)
{   
    shobu.debug.state(state);
    let moves = shobu.getMoves(state, player);
    console.log(`Player ${player === shobu.BLACK ? 'BLACK' : 'WHITE'} has ${moves.length} moves to play.`);
    if (moves.length === 0) {
        console.log(`${player === shobu.BLACK ? 'BLACK' : 'WHITE'} is the winner (due to no moves).`);
        break;
    }
    let move = moves[Math.floor(Math.random() * moves.length)];
    console.log(`[Move no. ${nofMove}] Player ${player === shobu.BLACK ? 'BLACK' : 'WHITE'} has chosen:`);
    shobu.debug.move(move);
    shobu.applyMove(state, move);
    player = player === 1 ? 0 : 1;
    nofMove++;
}
shobu.debug.state(state);
if (shobu.isGameOver(state)) {
    console.log(`${shobu.isBlackWinner(state) ? 'BLACK' : 'WHITE'} is the winner.`);
} else if (nofMove >= LIMIT_OF_MOVES) {
    console.log('DRAW');
}
