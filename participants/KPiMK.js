const shobu = require('../shobu.js');
const ld = require('lodash');

class Node {
	constructor(state, player) {
		//HACK sprawdzic czy dziala
		this.node = ld.cloneDeep(state);
		this.score = this.ScoringFunc(player);
		this.player = ld.cloneDeep(player);
		this.children = [];
	}

	MakeChildren() {
		let moves = shobu.getMoves(this.node, this.player);
		moves.forEach(move => {
			this.children.push([new Node(shobu.applyMove(ld.cloneDeep(this.node), move), this.player ^ 1), move]);
		})
	}

	//TODO score per board
	ScoringFunc(color) {
		//let score = -10;
		let bestRet = 0;
		let bestEnemyRet = 0;
		for (let map = 0; map < 4; map++) {
			let ret = 0;
			let enemyRet = 0;
			let mask = 1;
			for (let i = 0; i < 22; i++) {

				ret += (this.node[map >> 1][map & 1][color] & mask) != 0;
				enemyRet += (this.node[map >> 1][map & 1][(color ^ 1)] & mask) != 0;
				mask *= 2;
			}
			if (enemyRet === 0) {
				return Infinity;
			}
			if (ret === 0) {
				return -Infinity;
			}
			if (bestRet < ret) {
				bestRet = ret;
			}
			if (bestEnemyRet < enemyRet) {
				bestEnemyRet = enemyRet;
			}
		}
		return bestEnemyRet - bestRet;
	}

}

function alphabeta(node, depth, A, B, maximizingPlayer, color) {
	if (depth == 0 || node.score == -Infinity || node.score == Infinity) {
		return node.score;
	}
	node.MakeChildren();
	if (maximizingPlayer) {
		let value = -Infinity;
		for (let i = 0; i < node.children.length; i++) {
			const child = node.children[i];
			value = Math.max(value, alphabeta(child[0], depth - 1, A, B, false, color ^ 1))
			if (value >= B) {
				break; /* β cutoff */
			}
			A = Math.max(A, value)
		}
		return value
	}
	else {
		let value = Infinity;
		for (let i = 0; i < node.children.length; i++) {
			const child = node.children[i];
			value = Math.min(value, alphabeta(child[0], depth - 1, A, B, true, color ^ 1))
			if (value <= A) {
				break; /* α cutoff */
			}
			B = Math.min(B, value)
		}
		return value
	}
}

/*
  A simple random player.
*/
module.exports = function () {
	return {
		init() { },
		startNextGame(color) {
			this.color = color;
			this.state = shobu.createInitialState();
		},
		getNextMove() {
			const node = new Node(this.state, this.color);
			let test = alphabeta(node, 2, -Infinity, Infinity, true, this.color);
			const moves = shobu.getMoves(this.state, this.color);
			const move = moves[Math.floor(Math.random() * moves.length)];
			shobu.applyMove(this.state, move);
			return move;
		},
		applyOpponentMove(opponentMove) {
			shobu.applyMove(this.state, opponentMove);
		},
		updateWithResult(winnerColor) { },
	}
};


