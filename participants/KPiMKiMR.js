const shobu = require('../shobu.js');

function cloneDeep(obj) {
	return JSON.parse(JSON.stringify(obj));
}

class Node {
	constructor(state, player, isMaximizing) {
		this.node = cloneDeep(state);
		this.score = this.ScoringFunc(player, isMaximizing);
		this.player = cloneDeep(player);
		this.children = [];
		this.isMaximizing = isMaximizing;
	}

	MakeChildren() {
		let moves = shobu.getMoves(this.node, this.player);
		moves.forEach(move => {
			this.children.push(
				new Node(
					shobu.applyMove(cloneDeep(this.node), move),
					this.player ^ 1,
					!this.isMaximizing
				),
			);
		})
	}

	ScoringFunc(color, isMaximizing) {
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
				return isMaximizing ? Infinity : -Infinity;
			}
			if (ret === 0) {
				return isMaximizing ? -Infinity : Infinity;
			}
			if (bestRet < ret / enemyRet) {
				bestRet = ret / enemyRet;
			}
			if (bestEnemyRet < enemyRet / ret) {
				bestEnemyRet = -(enemyRet / ret);
			}
		}

		return isMaximizing
			? bestEnemyRet
			: bestRet;
	}
}

function alphabeta(node, timeLimit, A, B, maximizingPlayer, color, startTime) {
	let timeRemaining = timeLimit - (Date.now() - startTime);
	if (node.score === -Infinity || node.score === Infinity || timeRemaining <= 0) {
		return node.score;
	}
	node.MakeChildren();
	if (maximizingPlayer) {
		let value = -Infinity;
		for (let i = 0; i < node.children.length; i++) {
			const child = node.children[i];
			value = Math.max(value, alphabeta(child, timeLimit, A, B, false, color ^ 1, startTime))
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
			value = Math.min(value, alphabeta(child, timeLimit, A, B, true, color ^ 1, startTime))
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
			const moves = shobu.getMoves(this.state, this.color);
			const move = moves[selectMoveFromMoves(moves, this.state, this.color)];
			shobu.applyMove(this.state, move);

			return move;
		},
		applyOpponentMove(opponentMove) {
			shobu.applyMove(this.state, opponentMove);
		},
		updateWithResult(winnerColor) { },
	}

	function selectMoveFromMoves(moves, state, color) {
		let max = -Infinity;
		let bestIndex = 0;
		for (let index = 0; index < moves.length; index++) {
			let start = Date.now(),
				move = moves[index],
				_sc = cloneDeep(state),
				_color = color ^ 1;

			shobu.applyMove(_sc, move);
			let node = new Node(_sc, _color, false);
			let _ab = alphabeta(node, 4000 / moves.length, -Infinity, Infinity, false, _color, start);
			if (_ab > max) {
				bestIndex = index;
				max = _ab;
			}
			if (max === Infinity) {
				return bestIndex;
			}
		}
		return max !== -Infinity ? bestIndex : Math.floor(Math.random() * moves.length);
	}
};
