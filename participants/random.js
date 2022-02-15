const shobu = require('../shobu.js');

/*
  A simple random player.
*/
module.exports = function () {
	return {
		init() {},
		startNextGame(color) {
			this.color = color;
			this.state = shobu.createInitialState();
		},
		getNextMove() {
			const moves = shobu.getMoves(this.state, this.color);
			const move = moves[Math.floor(Math.random() * moves.length)];
			shobu.applyMove(this.state, move);
			return move;
		},
		applyOpponentMove(opponentMove) {
			shobu.applyMove(this.state, opponentMove);
		},
		updateWithResult(winnerColor) {}
	}
};