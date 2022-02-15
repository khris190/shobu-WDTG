/*
A single board (either dark or light) is decoded as a 32-bit bitboard (JS handles bitwise operations as 32-bit integers).
The bitboard mask, which consist off-board separating bits, is used to simplify the handling of boundary conditions
and avoid adjacent rows being shifted into each other incorrectly.
The left right corner is point 0,0 indexed by 0.

(0,0)
   \
    0 0 0 0 x x
    0 0 0 0 x x
    0 0 0 0 x x
    0 0 0 0 x x
    x x x x x x
    x x

`1` means that a field is occupied, `0` otherwise. The mask's bits as marked as `x`.

As it says here:
https://rules.dized.com/shobu/rule/gameplay/playing-the-game
> "Player's cannot move their own stones off the board."
which simplifies the moves searching.
*/

const MASK                  = 0b00000000001111001111001111001111; // The board mask as described above.
const INITIAL_BOARD_BLACK   = 0b00000000001111000000000000000000; // The initial state of white stones.
const INITIAL_BOARD_WHITE   = 0b00000000000000000000000000001111; // The initial state of white stones.

const BLACK = 0;
const WHITE = 1;
const DARK = 0;
const LIGHT = 1;

const OPPONENTS = [WHITE, BLACK]; // White for Black and Black for White.
const OPPOSITE_COLORS = [LIGHT, DARK]; // Light for Dark and Dark for Light.

// The shifts in 8 directions.
const SHIFTS = [1,5,6,7]; // Actually, I use only 4 as they can be used in mirror, see below functions.
const SHIFT_FUNCTIONS = [
    (stones, shift) => stones << shift,
    (stones, shift) => stones >>> shift
];
// The forward and back functions for passive moves generation.
const PASSIVE_MOVE_FUNCTIONS = [
    [SHIFT_FUNCTIONS[0], SHIFT_FUNCTIONS[1]],
    [SHIFT_FUNCTIONS[1], SHIFT_FUNCTIONS[0]],
];

// The bits positions that represent a game board.
const GAME_BOARD = [
    0, 1, 2, 3,     // From 0x0 to 3x0,
    6, 7, 8, 9,     // from 0x1 to 3x1,
    12, 13, 14, 15, // from 0x2 to 3x2,
    18, 19, 20, 21  // from 0x3 to 3x3.
].map(position => [position, 2**position]);

// Helper.
Array.prototype.equals = function (array) {
    if (! array) return false;
    if (this.length != array.length) return false;
    for (let i = 0, l=this.length; i < l; i++) {
        if (this[i] != array[i]) return false;       
    }
    return true;
}

function createInitialState()
{
    return [
        /* black's homeBoards */ [/* dark */[INITIAL_BOARD_BLACK, INITIAL_BOARD_WHITE], /* light */[INITIAL_BOARD_BLACK, INITIAL_BOARD_WHITE]],
        /* white's homeBoards */ [/* dark */[INITIAL_BOARD_BLACK, INITIAL_BOARD_WHITE], /* light */[INITIAL_BOARD_BLACK, INITIAL_BOARD_WHITE]]
    ];
}

/**
 * Get all valid moves for a player.
 * A move structure is as follow:
 * |-------------------------Passive move-----------------------------|--------------------Aggressive move---------------------|
 * [player, boardColor, direction, steps, passiveMoveStartingPosition1, oppositeColorBoardOwner, aggressiveMoveStartingPosition]
 * That can be translated into:
 * The PLAYER makes a passive move on his BOARD_COLOR board in the DIRECTION STEPS times from the PASSIVE_MOVE_STARTING_POSITION
 * an the aggressive on the OPPOSITE_COLOR_BOARD_OWNER's board from the AGGRESSIVE_MOVE_STARTING_POSITION_.
 * @param {array} state 
 * @param {number} player 
 */
function getMoves(state, player)
{
    // Finding all valid passive moves.
    let passives = [];
    let movements = [];
    let moves = [];
    state[player].forEach((homeBoard, boardColor) =>
        PASSIVE_MOVE_FUNCTIONS.forEach(([forwardFn, backFn], functionIndex) =>
            SHIFTS.forEach(shift => {
                // Get stones of the current player.
                let stones = homeBoard[player];
                // Up to two not blocked and non-jump moves (later as t).
                for (let steps = 1; steps <= 2; ++steps) {
                    // Move stone in the direction (shift + forwardFn)
                    // and check if the move collides with other stones or it's outside of the board(!).
                    stones = forwardFn(stones, shift) & ~homeBoard[0] & ~homeBoard[1] & MASK;
                    // If any stones survives then a move is possible.
                    if (stones != 0) {
                        let moveableStones = stones;
                        // The positions need to be restored to find out which stones can be moved. 
                        for (let u = steps; u > 0; --u) {
                            moveableStones = backFn(moveableStones, shift);
                        }
                        // Checking possible stones positions to find passive moves.
                        GAME_BOARD.forEach(([passiveMovePosition, powerOfPosition]) => {
                            if ((moveableStones & powerOfPosition) === powerOfPosition) {
                                let direction = (functionIndex === 0 ? 1 : -1) * shift;
                                // Add the move to all passive moves...
                                passives.push([boardColor, direction, steps, passiveMovePosition]);
                                // ... and (if needed) add it to moves in order to speed up finding aggressive moves.
                                if (movements.some(move => move.equals([boardColor, direction, steps])) === false) {
                                    movements.push([boardColor, direction, steps]);
                                }
                            }
                        })
                        continue;
                    }
                    break;
                }
            })
        )
    )
    // Finding aggressive moves as it's sure that at least one passive move is fitted.
    movements.forEach(([boardColor, direction, steps]) => {
        state.forEach((boards, ownerOfOppositeColor) => {
            // Get the board with the opposite color from any player (an owner of the board).
            let board = boards[OPPOSITE_COLORS[boardColor]];
            // Get stones of the current player.
            let playerStones = board[player];
            let opponentStones = board[OPPONENTS[player]];
            GAME_BOARD.forEach(([aggressiveMovePosition, number]) => {
                if ((playerStones & number) !== number) return;
                // All positions on the way.
                let positions = [];
                for (let u = 1; u <= steps; ++u) {
                    positions.push([aggressiveMovePosition + direction * u, 2**(aggressiveMovePosition + direction * u)])
                }
                // Checking if any position (after move) is outside of a board.
                // @see https://rules.dized.com/shobu/rule/gameplay/playing-the-game
                if (positions.some(([, powerOfPosition]) => (MASK & powerOfPosition) !== powerOfPosition)) return;
                let nofOpponentsStones = 0;
                for (let [, powerOfPosition] of positions) {
                    // If on any position on the way, there is a player stone then the move is invalid.
                    if ((playerStones & powerOfPosition) === powerOfPosition) return;
                    // If on any position on the way, there is an opponent stone then count it.
                    if ((opponentStones & powerOfPosition) === powerOfPosition) {
                        nofOpponentsStones++;
                    };
                }
                // If there're more than one opponent stones then the move is invalid.
                if (nofOpponentsStones > 1) return;
                // If there's only one opponent stone then check if is it possible to move it (even outside of a board).
                if (nofOpponentsStones === 1) {
                    let opponentStonePosition = aggressiveMovePosition + direction * (steps + 1); // One step further.
                    let powerOfOpponentStonePosition = 2**opponentStonePosition;
                    if (
                        opponentStonePosition >= 0 // The position of the opponent stone must be on a board.
                        && opponentStonePosition <= 31 // The position of the opponent stone must be on a board.
                        // And, it must be not-occupied.
                        && ((playerStones | opponentStones) & powerOfOpponentStonePosition) === powerOfOpponentStonePosition
                    ) {
                        return;
                    }
                }
                // Finally, it's been proved that the move is valid.
                passives.filter(move => move.slice(0, 3).equals([boardColor, direction, steps])).forEach(passiveMove => {
                    moves.push([player, ...passiveMove, ownerOfOppositeColor, aggressiveMovePosition]);
                })
            });
        });
    });
    return moves;
}

function applyMove(state, move)
{
    let [player, boardColor, direction, steps, passiveMovePosition, ownerOfOppositeColor, aggressiveMovePosition] = move;
    let oppositeColor = OPPOSITE_COLORS[boardColor];
    let opponent = OPPONENTS[player];
    // Making the passive move.
    state[player][boardColor][player] &= ~(1 << passiveMovePosition); // Clear the old position.
    let passiveMoveFinalPosition = passiveMovePosition + direction * steps;
    state[player][boardColor][player] |= 1 << passiveMoveFinalPosition; // Set the new one.
    // Making the aggressive move.
    state[ownerOfOppositeColor][oppositeColor][player] &= ~(1 << aggressiveMovePosition); // Clear the old position.
    let aggressiveMoveFinalPosition = aggressiveMovePosition + direction * steps;
    state[ownerOfOppositeColor][oppositeColor][player] |= 1 << aggressiveMoveFinalPosition; // Set the new one.
    // Pushing opponents stones.
    let opponentStones = state[ownerOfOppositeColor][OPPOSITE_COLORS[boardColor]][opponent];
    for (let u = 1; u <= steps; ++u) {
        let position = aggressiveMovePosition + direction * u;
        if ((opponentStones & 2**position) === 2**position) {
            state[ownerOfOppositeColor][oppositeColor][opponent] &= ~(1 << position); // Clear the old position.
            let finalPosition = aggressiveMovePosition + direction * (steps + 1); // One step further.
            state[ownerOfOppositeColor][oppositeColor][opponent] |= 1 << finalPosition; // Set the new one.
            state[ownerOfOppositeColor][oppositeColor][opponent] &= MASK; // Clear pushed off stones.
            break; // Only one stone can be pushed.
        }
    }
    return state;
}

function isPositionValid(position)
{
    if (Number.isInteger(position) === false) return false;
    return GAME_BOARD.some(([validPosition]) => validPosition === position);
}

function decodePosition(position)
{
    if (Number.isInteger(position) === false) return null;
    if (isPositionValid(position) === false) return null;
    let y = Math.floor(position / 6);
    let x = position % 6;
    return [x, y];
}

function encodePosition(x, y)
{
    if (Number.isInteger(x) === false) return null;
    if (Number.isInteger(y) === false) return null;
    const position = y * 6 + x;
    if (isPositionValid(position) === false) return null;
    return position;
}

function isBlackWinner(state)
{
    return state.some(homeBoards => homeBoards.some(board => board[WHITE] === 0))
}

function isWhiteWinner(state)
{
    return state.some(homeBoards => homeBoards.some(board => board[BLACK] === 0))
}

function isGameOver(state)
{
    return isBlackWinner(state) || isWhiteWinner(state);
}

const debug = {
    stones(stones, playerCharacter = 'B')
    {
        console.log('  | 0 | 1 | 2 | 3 |');
        console.log('--+---+---+---+---+--');
        for (let y = 0; y < 4; ++y) {
            let row = y + ' |';
            for (let x = 0; x < 4; ++x) {
                let index = y * 6 + x;
                row += ((stones & 2**index) === 2**index) ? ' ' + playerCharacter + ' |' : ' _ |';
            }
            console.log(row + ' ' + y);
        }
        console.log('--+---+---+---+---+--');
        console.log('  | 0 | 1 | 2 | 3 |');
    },
    state(state)
    {
        console.log('              WHITE\'s HomeBoards');
        [1, 0].forEach(player => {
            let playerCharacter = player === BLACK ? 'B' : 'W';
            if (player === 0) {
                console.log('X-------DARK---------ROPE--------LIGHT-------X');
            }
            console.log('  | 0 | 1 | 2 | 3 |        | 0 | 1 | 2 | 3 |');
            console.log('--+---+---+---+---+--    --+---+---+---+---+--');
            for (let y = 0; y < 4; ++y) {
                let row = y + ' |';
                [0, 1].forEach(boardColor => {
                    if (boardColor === LIGHT) {
                        row += ' ' + y + '    ' + y + ' |';
                    }
                    for (let x = 0; x < 4; ++x) {
                        let index = y * 6 + x;
                        if ((state[player][boardColor][BLACK] & 2**index) === 2**index) row = row + ' B |' // Black's stones
                        else if ((state[player][boardColor][WHITE] & 2**index) === 2**index) row = row + ' W |' // White's stones
                        else row = row + ' _ |';
                    }
                });
                console.log(row + ' ' + y);
            }
            console.log('--+---+---+---+---+--    --+---+---+---+---+--');
            console.log('  | 0 | 1 | 2 | 3 |        | 0 | 1 | 2 | 3 |');
        })
        console.log('              BLACKS\'s HomeBoards');
    },
    move(move, stdOut = true) {
        let [player, boardColor, direction, steps, passiveMovePosition, ownerOfOppositeColor, aggressiveMovePosition] = move;
        let oppositeColor = OPPOSITE_COLORS[boardColor];
        let moveDescription = `The passive move on the ${player === BLACK ? 'BLACK' : 'WHITE'}'s `;
        moveDescription += `${boardColor === DARK ? 'DARK' : 'LIGHT'} board `;
        moveDescription += `from ${decodePosition(passiveMovePosition).join('x')} to `;
        moveDescription += `${decodePosition(passiveMovePosition + direction * steps).join('x')} (${steps} steps) `;
        moveDescription += `with the accompanying aggressive move on the ${ownerOfOppositeColor === BLACK ? 'BLACK' : 'WHITE'}'s `;
        moveDescription += `${oppositeColor === DARK ? 'DARK' : 'LIGHT'} board from ${decodePosition(aggressiveMovePosition).join('x')}.`;
        if (stdOut) {
            console.log(moveDescription);
            return;
        }
        return moveDescription;
    },
    moves(moves) {
        moves.forEach(move => {
            debug.move(move);
        });
    }
};

/*
const state = [[[8, 4], [0, 0]], [[0, 0], [0, 1]]];
debug.state(state);
const moves = getMoves(state, 1);
debug.moves(moves);
applyMove(state, [1,1,1,1,0,0,2]);
debug.state(state);
*/


module.exports = {
    BLACK,
    WHITE,
    DARK,
    LIGHT,
    createInitialState,
    getMoves,
    applyMove,
    isPositionValid,
    decodePosition,
    encodePosition,
    isBlackWinner,
    isWhiteWinner,
    isGameOver,
    debug
};
