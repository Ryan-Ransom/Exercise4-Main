//Ryan Ransom
//07/26/2025
//Exercise 4

const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

/**
 * Checks if there's a winning combination on the board
 * @function checkWin
 * @param {Array<string>} board - The current game board (16-element array)
 * @returns {Object} - Object containing win status and winning positions
 */
function checkWin(board) {
    // All possible winning combinations
    const winCombinations = [
        [0, 1, 2, 3], [4, 5, 6, 7], [8, 9, 10, 11], [12, 13, 14, 15],
        [0, 4, 8, 12], [1, 5, 9, 13], [2, 6, 10, 14], [3, 7, 11, 15],
        [0, 5, 10, 15], [3, 6, 9, 12]
    ];

    for (let combo of winCombinations) {
        const [a, b, c, d] = combo;
        if (board[a] && board[a] === board[b] && board[b] === board[c] && board[c] === board[d]) {
            return {
                win: true,
                winner: board[a],
                positions: combo
            };
        }
    }

    return {
        win: false,
        winner: null,
        positions: []
    };
}

/**
 * Checks if the game is a draw
 * @function checkDraw
 * @param {Array<string>} board - The current game board (16-element array)
 * @returns {boolean} - True if the board is full, false otherwise
 */
function checkDraw(board) {
    for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
            return false;
        }
    }
    return true;
}

/**
 * Verifies a move is legal
 * @function isValidMove
 * @param {Array<string>} board - The current game board (16-element array)
 * @param {number} position - The position to check (0-15)
 * @returns {boolean} - True if the move is valid else false
 */
function isValidMove(board, position) {
    return board[position] === '';
}

/**
 * Makes a move on the board
 * @function makeMove
 * @param {Array<string>} board - The current game board (16-element array)
 * @param {number} position - The position to place the move (0-15)
 * @param {string} player - The player making the move ('O' or 'X')
 * @returns {Object} - Object containing the updated board and game status
 */
function makeMove(board, position, player) {
    if (!isValidMove(board, position)) {
        throw new Error('Invalid move');
    }

    board[position] = player;
    
    const winResult = checkWin(board);
    const draw = checkDraw(board);
    
    return {
        board: board,
        win: winResult.win,
        winner: winResult.winner,
        winningPositions: winResult.positions,
        draw: draw
    };
}

// ============================================================================
// SERVER STATE AND ROUTES
// ============================================================================

// Store single game state in memory
let gameState = {
    winner: false,
    board: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    currentPlayer: 0,  
    buttonState: 'flip', 
    startingPlayer: null, 
    lastWinner: null 
};

let playerCount = 0; // Track how many players have joined
let coinFlipped = false; // Track if coin flip has been done

// Join the game
app.post('/api/join', (req, res) => {
    if (playerCount >= 2) {
        return res.status(400).json({ 
            success: false, 
            message: 'Game is full' 
        });
    }
    const playerNumber = playerCount;
    playerCount++;
    res.json({ 
        success: true, 
        playerNumber: playerNumber,
        message: `Joined as player ${playerNumber === 0 ? 'O' : 'X'}`
    });
});

// Coin flip to decide who goes first
app.post('/api/coinflip', (req, res) => {
    if (coinFlipped) {
        return res.status(400).json({ 
            success: false, 
            message: 'Coin flip already done' 
        });
    }
    const firstPlayer = Math.floor(Math.random() * 2);
    gameState.currentPlayer = firstPlayer;
    gameState.startingPlayer = firstPlayer === 0 ? 'O' : 'X';
    gameState.buttonState = 'start';
    coinFlipped = true;
    res.json({ 
        success: true, 
        firstPlayer: firstPlayer,
        message: `Coin flip result: ${firstPlayer === 0 ? 'O' : 'X'} goes first!`
    });
});

// Load game state
app.get('/api/load', (req, res) => {
    res.json(gameState);
});

// Make a move
app.post('/api/move', (req, res) => {
    const { position, player } = req.body;
    
    // Check if it's the player's turn
    if (player !== gameState.currentPlayer) {
        return res.status(400).json({ 
            success: false, 
            message: 'Not your turn' 
        });
    }
    
    // Check if position is valid and empty
    if (!isValidMove(gameState.board, position)) {
        return res.status(400).json({ 
            success: false, 
            message: 'Invalid move' 
        });
    }
    
    // Make the move using game logic
    const symbol = player === 0 ? 'O' : 'X';
    const moveResult = makeMove(gameState.board, position, symbol);
    
    // Update game state
    gameState.board = moveResult.board;
    gameState.currentPlayer = (gameState.currentPlayer + 1) % 2; // Switch turns
    
    // Check for win or draw
    if (moveResult.win) {
        gameState.winner = true;
        gameState.lastWinner = moveResult.winner;
        gameState.buttonState = 'start';
        gameState.startingPlayer = moveResult.winner;
    } else if (moveResult.draw) {
        gameState.winner = true;
        gameState.buttonState = 'clear';
    }
    
    res.json({ 
        success: true, 
        gameState,
        winResult: moveResult
    });
});

// Reset the game
app.post('/api/reset', (req, res) => {
    gameState = {
        winner: false,
        board: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        currentPlayer: gameState.startingPlayer === 'O' ? 0 : 1,
        buttonState: 'start',
        startingPlayer: gameState.startingPlayer,
        lastWinner: gameState.lastWinner
    };
    coinFlipped = true;
    res.json({ success: true, message: 'Game reset successfully' });
});

// Clear the game
app.post('/api/clear', (req, res) => {
    gameState = {
        winner: false,
        board: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        currentPlayer: gameState.startingPlayer === 'O' ? 0 : 1,
        buttonState: 'start',
        startingPlayer: gameState.startingPlayer,
        lastWinner: gameState.lastWinner
    };
    coinFlipped = true;
    res.json({ success: true, message: 'Game cleared successfully' });
});

const PORT = 3000;
app.listen(PORT, () => {
}); 