//Ryan Ransom
//07/26/2025
//Exercise 4


let gameState = {
    winner: false,
    board: ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    currentPlayer: 0,
    buttonState: 'flip',
    startingPlayer: null,
    lastWinner: null
}

let myPlayerNumber = null; // 0 = O player, 1 = X player
let coinFlipped = false; // Track if coin flip has been done

/**
 * Checks if there's a winning combination on the board
 * @function checkWin
 * @param {Array<string>} board - The current game board (16-element array)
 * @returns {Object} - Object containing win status and winning positions
 * @returns {boolean} returns.win - True if there's a winner
 * @returns {string} returns.winner - 'O' or 'X' if there's a winner, null otherwise
 * @returns {Array<number>} returns.positions - Array of winning position indices
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

// Join the game and get assigned a player number
async function joinGame() {
    const response = await fetch('/api/join', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    myPlayerNumber = data.playerNumber;
}

// Handle the three-state game button
async function handleGameButton() {
    const button = document.getElementById("gameButton");
    const buttonState = gameState.buttonState;
    
    switch (buttonState) {
        case 'flip':
            await flipCoin();
            break;
        case 'clear':
            await clearGame();
            break;
        case 'start':
            await startNewGame();
            break;
    }
}

// Coin flip to decide who goes first
async function flipCoin() {
    if (coinFlipped) {
        alert("Coin flip already done!");
        return;
    }
    
    const response = await fetch('/api/coinflip', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    const data = await response.json();
    if (data.success) {
        coinFlipped = true;
        const firstPlayer = data.firstPlayer === 0 ? 'O' : 'X';
        alert(`Coin flip result: ${firstPlayer} goes first!`);
        
        loadGameState();
    } else {
        alert(data.message);
    }
}

// Clear the game board
async function clearGame() {
    const response = await fetch('/api/clear', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    const data = await response.json();
    if (data.success) {
        loadGameState();
    } else {
        alert('Failed to clear game: ' + data.message);
    }
}

// Start a new game
async function startNewGame() {
    const response = await fetch('/api/reset', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    const data = await response.json();
    if (data.success) {
        loadGameState();
    } else {
        alert('Failed to start new game: ' + data.message);
    }
}

// Load game state from server
async function loadGameState() {
    const response = await fetch('/api/load');
    const serverState = await response.json();
    
    gameState.winner = serverState.winner;
    gameState.board = serverState.board;
    gameState.currentPlayer = serverState.currentPlayer;
    gameState.buttonState = serverState.buttonState;
    gameState.startingPlayer = serverState.startingPlayer;
    gameState.lastWinner = serverState.lastWinner;
    
    if (gameState.startingPlayer && !coinFlipped) {
        coinFlipped = true;
    }
    
    updateBoardDisplay();
}

// Update the board display based on current game state
function updateBoardDisplay() {
    const btns = document.getElementsByClassName('tableButton');
    for (let i = 0; i < 16; i++) {
        btns[i].value = gameState.board[i];
        btns[i].style.color = ''; // Reset colors
        btns[i].disabled = gameState.winner; // Disable buttons if game is over
    }
    
    // Update the three-state button
    const gameButton = document.getElementById("gameButton");
    switch (gameState.buttonState) {
        case 'flip':
            gameButton.value = 'Flip';
            gameButton.disabled = false;
            break;
        case 'clear':
            gameButton.value = 'Clear';
            gameButton.disabled = false;
            break;
        case 'start':
            gameButton.value = 'Start';
            gameButton.disabled = false;
            break;
    }
    
    // Check for wins and highlight winning positions
    const winResult = checkWin(gameState.board);
    if (winResult.win) {
        for (let pos of winResult.positions) {
            btns[pos].style.color = 'red';
        }
    }
    
    // Disable all buttons when game is over
    if (gameState.winner) {
        for(let i = 0; i < 16; i++) {
            btns[i].disabled = true;
        }
    } else {
        // Enable buttons if game is not over
        for(let i = 0; i < 16; i++) {
            btns[i].disabled = false;
        }
    }
}

// Initialize the game when page loads
window.onload = async function() {
    await joinGame(); // Join the game first
    loadGameState(); // Load any existing game state
    
    // Auto-refresh every 1 second to get updates from other players
    setInterval(loadGameState, 1000);
};

/**
 * Sets the value of a button based on the current turn and updates game state
 * @function setButton
 * @param {string} buttonId - The ID of the button to set
 */
async function setButton(buttonId) {
    // Check if game is over
    if (gameState.winner) {
        alert("Game is over! Use the button to start a new game.");
        return;
    }
    
    // Check if it's my turn
    if (myPlayerNumber !== gameState.currentPlayer) {
        alert("Not your turn! Wait for the other player.");
        return;
    }
    
    var button = document.getElementById(buttonId);
    if(button.value == "") {
        const buttonIndex = parseInt(buttonId.replace('button', '')) - 1;
        
        // Make move through server
        const response = await fetch('/api/move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                position: buttonIndex,
                player: myPlayerNumber
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // Update local game state
            gameState = data.gameState;
            
            // Highlight winning positions if there's a win
            if (data.winResult && data.winResult.win) {
                const btns = document.getElementsByClassName('tableButton');
                for (let pos of data.winResult.winningPositions) {
                    btns[pos].style.color = 'red';
                }
            }
            
            updateBoardDisplay();
        } else {
            alert(data.message);
        }
    }
}

