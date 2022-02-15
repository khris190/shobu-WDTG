const shobu = require('./shobu.js');

describe('shobu.isPositionValid function', () => {
    it.each([0, 1, 2, 3, 6, 7, 8, 9, 12, 13, 14, 15, 18, 19, 20, 21])(`should return true for a valid position: %i.`, (position) => {
        expect(shobu.isPositionValid(position)).toBeTruthy();
    });
    it.each([-1, 4, 5, 10, 11, 16, 17, 22])(`should return false for an invalid position: %i.`, (position) => {
        expect(shobu.isPositionValid(position)).toBeFalsy();
    });
});

const validPositionsAndCoordinates = [
    [0, 0, 0], [1, 1, 0], [2, 2, 0], [3, 3, 0],
    [6, 0, 1], [7, 1, 1], [8, 2, 1], [9, 3, 1],
    [12, 0, 2], [13, 1, 2], [14, 2, 2], [15, 3, 2],
    [18, 0, 3], [19, 1, 3], [20, 2, 3], [21, 3, 3],
];

describe('shobu.decodePosition function', () => {
    it.each(validPositionsAndCoordinates)(`should decode the position: %i into the coordinates: %i, %i.`, (position, x, y) => {
        expect(shobu.decodePosition(position)).toEqual([x, y]);
    });
    it.each([-1, 4, 5, 10, 11, 16, 17, 22, 0.1, 'a', null, undefined, [], {}])(`should decode the invalid position: %s into null.`, (position) => {
        expect(shobu.decodePosition(position)).toBeNull();
    });
});

describe('shobu.encodePosition function', () => {
    it.each(validPositionsAndCoordinates)(`should encode the position: %i from the coordinates: %i, %i.`, (position, x, y) => {
        expect(shobu.encodePosition(x, y)).toBe(position);
    });
    it.each([[-1, -1], [0.1, 0], [[], []], ['', ''], [undefined, 0]])(`should encode the invalid coordinates: %s, %s into null.`, (x, y) => {
        expect(shobu.encodePosition(x, y)).toBeNull();
    });
});

test('shobu.createInitialState should give the correct initial position.', () => {
    expect(shobu.createInitialState()).toEqual([
        [[3932160, 15], [3932160, 15]],
        [[3932160, 15], [3932160, 15]]
    ]);
});

test('shobu.isBlackWinner function should recognize the black winning correctly.', () => {
    expect(shobu.isBlackWinner([[[3932160, 0], [3932160, 15]], [[3932160, 15], [3932160, 15]]])).toBeTruthy();
    expect(shobu.isBlackWinner([[[0, 15], [3932160, 15]], [[3932160, 15], [3932160, 15]]])).toBeFalsy();
    expect(shobu.isBlackWinner([[[3932160, 15], [3932160, 15]], [[3932160, 15], [3932160, 15]]])).toBeFalsy();
});

test('shobu.isWhiteWinner function should recognize the black winning correctly.', () => {
    expect(shobu.isWhiteWinner([[[3932160, 0], [3932160, 15]], [[3932160, 15], [3932160, 15]]])).toBeFalsy();
    expect(shobu.isWhiteWinner([[[0, 15], [3932160, 15]], [[3932160, 15], [3932160, 15]]])).toBeTruthy();
    expect(shobu.isWhiteWinner([[[3932160, 15], [3932160, 15]], [[3932160, 15], [3932160, 15]]])).toBeFalsy();
});

test('shobu.isGameOver function should recognize the game over condition correctly.', () => {
    expect(shobu.isGameOver([[[3932160, 0], [3932160, 15]], [[3932160, 15], [3932160, 15]]])).toBeTruthy();
    expect(shobu.isGameOver([[[0, 15], [3932160, 15]], [[3932160, 15], [3932160, 15]]])).toBeTruthy();
    expect(shobu.isGameOver([[[3932160, 15], [3932160, 15]], [[3932160, 15], [3932160, 15]]])).toBeFalsy();
});

describe('shobu.getMoves function', () => {
    it.each([
        [[[[0, 1], [0, 0]], [[0, 0], [0, 1]]], [[1,1,1,1,0,0,0], [1,1,1,2,0,0,0], [1,1,6,1,0,0,0], [1,1,6,2,0,0,0], [1,1,7,1,0,0,0], [1,1,7,2,0,0,0]]],
        [[[[0, 1], [0, 0]], [[0, 0], [0, 0]]], []],
        [[[[2, 1], [0, 0]], [[0, 0], [0, 1]]], [[1,1,1,1,0,0,0], [1,1,1,2,0,0,0], [1,1,6,1,0,0,0], [1,1,6,2,0,0,0], [1,1,7,1,0,0,0], [1,1,7,2,0,0,0]]],
    ])(`should return valid moves for a certain board state.`, (state, moves) => {
        expect(shobu.getMoves(state, 1)).toEqual(moves);
    });
});

describe('shobu.applyMove function', () => {
    it.each([
        [[[[0, 1], [0, 0]], [[0, 0], [0, 1]]], [1,1,1,1,0,0,0], [[[0, 2], [0, 0]], [[0, 0], [0, 2]]]],
        [[[[2, 1], [0, 0]], [[0, 0], [0, 1]]], [1,1,1,1,0,0,0], [[[4, 2], [0, 0]], [[0, 0], [0, 2]]]],
        [[[[8, 4], [0, 0]], [[0, 0], [0, 1]]], [1,1,1,1,0,0,2], [[[0, 8], [0, 0]], [[0, 0], [0, 2]]]],
    ])(`should return a valid state after applying the move.`, (originState, move, testState) => {
        expect(shobu.applyMove(originState, move)).toEqual(testState);
    });
});
