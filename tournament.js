const fs = require('fs');
const implementjs = require('implement-js');
const robin = require('roundrobin');
const { performance } = require('perf_hooks');
const shobu = require('./shobu.js');
const implement = implementjs.default;
const { Interface, type } = implementjs;

// The participant interface.
const IParticipant = Interface('IParticipant')({
	init: type('function'),
	startNextGame: type('function'),
	getNextMove: type('function'),
	applyOpponentMove: type('function'),
	updateWithResult: type('function')
},{
	error: true,
	strict: true
});

// A helper function for checking correctness of moves.
Array.prototype.equals = function (array) {
    if (! array) return false;
    if (this.length != array.length) return false;
    for (let i = 0, l=this.length; i < l; i++) {
        if (this[i] != array[i]) return false;         
    }
    return true;
}

const args = process.argv.slice(2).concat(['tournament', '']);

// The number of games in a single match.
let NUMBER_OF_GAMES = 1;
// The limit of moves in a single game.
let LIMIT_OF_MOVES = 2000;
// The set of participants.
let participants = [];

switch (args[0]) {
	case 'test':
		NUMBER_OF_GAMES = 10;
		participants = [
			['rnd1', require('./participants/random')(), [], []],
			['rnd2', require('./participants/random')(), [], []],
			['rnd3', require('./participants/random')(), [], []]
		];
		break;
	case 'timetest':
		NUMBER_OF_GAMES = 5;
		participants = [
			['rnd', require('./participants/random')(), [], []],
			[args[1].substr(0, args[1].length - 3), require('./participants/' + args[1])(), [], []]
		];
		break;
	case 'teststudents':
		NUMBER_OF_GAMES = 2;
		participants = [
			['rnd', require('./participants/random')(), [], []]
		];
		// Read all participants from the dir.
		fs.readdirSync('./participants/').forEach(file => {
			participants.push([file.substr(0, file.length - 3), require('./participants/' + file)(), [], []]);
		});
		break;
	default:
		NUMBER_OF_GAMES = 100;
		participants = [
			['rnd', require('./participants/random')(), [], []]
		];
		// Read all participants from the dir.
		fs.readdirSync('./participants/').forEach(file => {
			participants.push([file.substr(0, file.length - 3), require('./participants/' + file)(), [], []]);
		});
}

// Validate all participants.
participants.forEach((participant) => {
	implement(IParticipant)(participant[1]);
});

// Initialize all participants.
participants.forEach((participant) => {
	participant[1].init();
});

// Creating the scoreboard.
const scoreboard = [...Array(participants.length).keys()].map(_ => [...Array(participants.length)].fill(0));

// Creating the matches schedule.
const schedule = robin(participants.length);

// Running the actual tournament.
for (let i = 0; i < schedule.length; ++i) {
	for (let j = 0; j < schedule[i].length; ++j) {
		
		let pairing = schedule[i][j].map(x => x - 1);
		
		console.log('[Match: ' + participants[pairing[0]][0] + ' vs. ' + participants[pairing[1]][0] + ']');
		
		for (let g = 0; g < NUMBER_OF_GAMES; ++g) {
			
			let black = g < NUMBER_OF_GAMES / 2 ? 0 : 1;
			let white = g < NUMBER_OF_GAMES / 2 ? 1 : 0;
			
			console.log('+ Game#' + (g+1) + ': ' + participants[pairing[black]][0] + ' as black vs. '
				+ participants[pairing[white]][0] + ' as white');
			
			participants[pairing[black]][1].startNextGame(shobu.BLACK);
			participants[pairing[white]][1].startNextGame(shobu.WHITE);
			
			let start = null;
			let time = null;
			let move = null;
			let moves = [];
			let gameState = shobu.createInitialState();
			let moveNo = 0;
			let partOfGame = 0;
			while (true) {

				if (moveNo >= LIMIT_OF_MOVES) {
					scoreboard[pairing[white]][pairing[black]] += 0.5;
					scoreboard[pairing[black]][pairing[white]] += 0.5;
					participants[pairing[black]][1].updateWithResult(-1);
					participants[pairing[white]][1].updateWithResult(-1);
					console.log('+---------------------------------------------------+');
					console.log('Result: draw.');
					console.log('+---------------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				
				// Black first...
				if (shobu.isWhiteWinner(gameState)) {
					scoreboard[pairing[white]][pairing[black]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.WHITE);
					participants[pairing[white]][1].updateWithResult(shobu.WHITE);
					console.log('+---------------------------------------------------+');
					console.log('Result: white won by the rules.');
					console.log('+---------------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				moves = shobu.getMoves(gameState, shobu.BLACK);
				if (moves.length === 0) {
					scoreboard[pairing[white]][pairing[black]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.WHITE);
					participants[pairing[white]][1].updateWithResult(shobu.WHITE);
					console.log('+---------------------------------------------------+');
					console.log('Result: white won by the rules (black has no more moves).');
					console.log('+---------------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				start = performance.now();
				try {
					move = participants[pairing[black]][1].getNextMove();
				} catch (error) {
					scoreboard[pairing[white]][pairing[black]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.WHITE);
					participants[pairing[white]][1].updateWithResult(shobu.WHITE);
					console.log('+---------------------------------------------+');
					console.log('Result: white won by the opponent script error.', error);
					console.log('+---------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				time = performance.now() - start;
				if (time > 5000) {
					scoreboard[pairing[white]][pairing[black]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.WHITE);
					participants[pairing[white]][1].updateWithResult(shobu.WHITE);
					console.log('+----------------------------------------------------------+');
					console.log('Result: white won by the timeout exceedance by the opponent.');
					console.log('+----------------------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				if (moves.some(validMove => move.equals(validMove)) === false) {
					scoreboard[pairing[white]][pairing[black]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.WHITE);
					participants[pairing[white]][1].updateWithResult(shobu.WHITE);
					console.log('+-------------------------------------------------------+');
					console.log('Result: white won by the rules (playing an illegal move).');
					console.log('+-------------------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				shobu.applyMove(gameState, move);
				console.log(`[Move no. ${moveNo}] black played: ${shobu.debug.move(move, false)}`);
				if (args[0] === 'timetest') {
					participants[pairing[black]][2].push(time);
					partOfGame = Math.floor(moveNo / 10);
					if (typeof participants[pairing[black]][3][partOfGame] === 'undefined') {
						participants[pairing[black]][3][partOfGame] = [];
					}
					participants[pairing[black]][3][partOfGame].push(time);
				}
				moveNo++;
				try {
					participants[pairing[white]][1].applyOpponentMove(move);
				} catch (error) {
					scoreboard[pairing[black]][pairing[white]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.BLACK);
					participants[pairing[white]][1].updateWithResult(shobu.BLACK);
					console.log('+---------------------------------------------+');
					console.log('Result: black won by the opponent script error.', error);
					console.log('+---------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				
				// ... then White.
				if (shobu.isBlackWinner(gameState)) {
					scoreboard[pairing[black]][pairing[white]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.BLACK);
					participants[pairing[white]][1].updateWithResult(shobu.BLACK);
					console.log('+---------------------------------------------------+');
					console.log('Result: black won by the rules.');
					console.log('+---------------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				moves = shobu.getMoves(gameState, shobu.WHITE);
				if (moves.length === 0) {
					scoreboard[pairing[black]][pairing[white]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.BLACK);
					participants[pairing[white]][1].updateWithResult(shobu.BLACK);
					console.log('+---------------------------------------------------+');
					console.log('Result: black won by the rules (white has no more moves).');
					console.log('+---------------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				start = performance.now();
				try {
					move = participants[pairing[white]][1].getNextMove();
				} catch (error) {
					scoreboard[pairing[black]][pairing[white]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.BLACK);
					participants[pairing[white]][1].updateWithResult(shobu.BLACK);
					console.log('+---------------------------------------------+');
					console.log('Result: black won by the opponent script error.', error);
					console.log('+---------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				time = performance.now() - start;
				if (time > 5000) {
					scoreboard[pairing[black]][pairing[white]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.BLACK);
					participants[pairing[white]][1].updateWithResult(shobu.BLACK);
					console.log('+----------------------------------------------------------+');
					console.log('Result: black won by the timeout exceedance by the opponent.');
					console.log('+----------------------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				if (moves.some(validMove => move.equals(validMove)) === false) {
					scoreboard[pairing[black]][pairing[white]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.BLACK);
					participants[pairing[white]][1].updateWithResult(shobu.BLACK);
					console.log('+-------------------------------------------------------+');
					console.log('Result: black won by the rules (playing an illegal move).');
					console.log('+-------------------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				shobu.applyMove(gameState, move);
				console.log(`[Move no. ${moveNo}] white played: ${shobu.debug.move(move, false)}`);
				if (args[0] === 'timetest') {
					participants[pairing[white]][2].push(time);
					partOfGame = Math.floor(moveNo / 10);
					if (typeof participants[pairing[white]][3][partOfGame] === 'undefined') {
						participants[pairing[white]][3][partOfGame] = [];
					}
					participants[pairing[white]][3][partOfGame].push(time);
				}
				moveNo++;
				try {
					participants[pairing[black]][1].applyOpponentMove(move);
				} catch (error) {
					scoreboard[pairing[white]][pairing[black]] += 1;
					participants[pairing[black]][1].updateWithResult(shobu.WHITE);
					participants[pairing[white]][1].updateWithResult(shobu.WHITE);
					console.log('+---------------------------------------------+');
					console.log('Result: white won by the opponent script error.', error);
					console.log('+---------------------------------------------+');
					shobu.debug.state(gameState);
					break;
				}
				
			}
			
		}
		
	}
}

const PAD_SIZE = 12;

console.log('');
console.log('The matches:');
let c = 1;
for (let i = 0; i < schedule.length; ++i) {
	for (let j = 0; j < schedule[i].length; ++j) {
		let pairing = schedule[i][j].map(x => x - 1);
		console.log(
			((c++)+'. ').padStart(5,' ') + ' '
			+ participants[pairing[0]][0].padStart(PAD_SIZE, ' ')
			+ ' vs. '
			+ participants[pairing[1]][0].padEnd(PAD_SIZE, ' ')
			+ '  '
			+ scoreboard[pairing[0]][pairing[1]]
			+ ':'
			+ scoreboard[pairing[1]][pairing[0]]
		);
	}
}

console.log('');
console.log('The scoreboard:');
console.log(' '.repeat(PAD_SIZE) + participants.reduce((carry, participant) => carry + '|' + participant[0].padStart(PAD_SIZE, ' '), ''));
scoreboard.forEach((a,b) => {
    console.log(participants[b][0].padStart(PAD_SIZE, ' ') + a.reduce((carry, score, opponent) => carry + '|' + (''+(b == opponent ? '-' : (score == scoreboard[opponent][b] ? 0.5 : (score > scoreboard[opponent][b] ? 1 : 0)))).padStart(PAD_SIZE, ' '), ''));
});

console.log('');
console.log('The standings:');
let standings = scoreboard.map((scores, participant) => {
	return {
		name: participants[participant][0].padEnd(PAD_SIZE, ' '),
		points: scores.reduce((carry, score, opponent) => carry + (participant == opponent ? 0 : (score == scoreboard[opponent][participant] ? 0.5 : (score > scoreboard[opponent][participant] ? 1 : 0))), 0)
	};
});
standings.sort((a,b) => parseFloat(b.points) - parseFloat(a.points)).forEach((a,b) => {
	console.log(((b+1)+'. ').padStart(4,' ') + a.name + ' ' + a.points);
});

if (args[0] === 'timetest') {
	console.log('');
	console.log('The time test:');
	participants.forEach(participant => {
		console.log(' + ' + participant[0]);
		console.log('   - Average time per move (all moves): ' + (participant[2].reduce((a,b) => a + b, 0) / participant[2].length) + ' ms.');
		console.log('   - Maximum time per move (all moves): ' + Math.max(...participant[2]) + ' ms.');
		console.log('   - Minimum time per move (all moves): ' + Math.min(...participant[2]) + ' ms.');
		for (let i = 0; i < participant[3].length; ++i) {
			console.log('   + Move from ' + (i * 10 + 1) + ' to ' + ((i + 1) * 10) + ':');
			console.log('     - Average time per move: ' + (participant[3][i].reduce((a,b) => a + b, 0) / participant[3][i].length) + ' ms.');
			console.log('     - Maximum time per move: ' + Math.max(...participant[3][i]) + ' ms.');
			console.log('     - Minimum time per move: ' + Math.min(...participant[3][i]) + ' ms.');
		}
	});
}