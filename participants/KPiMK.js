const shobu = require('../shobu.js');

//TODO score per board
function ScoringFunc(state, color) {
	//let score = -10;
	let ret = 0;
	let enemyRet = 0;
	let bestRet = 0;
	let bestEnemyRet = 0;
	for (let map = 0; map < 4; map++) {
		let mask = 1;
		for (let i = 0; i < 22; i++) {

			ret += (state[map & 2][map & 1][color] & mask) != 0;
			enemyRet += (state[map & 2][map & 1][(color + 1) & 1] & mask) != 0;
			mask *= 2;
		}
		if (enemyRet === 0) {
			return 10;
		}
		if (ret === 0) {
			return -10;
		}
		if (bestRet < ret) {
			bestRet = ret;
		}
		if (bestEnemyRet > enemyRet) {
			bestEnemyRet = enemyRet;
		}
	}
	return bestEnemyRet - bestRet;
}
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
			ScoringFunc(this.state, this.color);
			const move = moves[Math.floor(Math.random() * moves.length)];
			shobu.applyMove(this.state, move);
			return move;
		},
		applyOpponentMove(opponentMove) {
			shobu.applyMove(this.state, opponentMove);
		},
		updateWithResult(winnerColor) {},
	}
};


